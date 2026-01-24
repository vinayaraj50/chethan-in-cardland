/**
 * @fileoverview StorageOrchestrator - Strategic Storage Layer.
 * ARCHITECTURE (2026 STANDARD):
 * 1. Split-State Persistence: Separates Immutable Content from Mutable Progress.
 *    - Content: `cic_lesson_[UID]_[LessonID].json` (Cached, rarely changes)
 *    - Progress: `cic_progress_[UID]_[LessonID].json` (Frequent updates)
 * 2. Composite Identity: All keys/filenames MUST be `[UID]_[LessonID]` to prevent cross-account bleed.
 * 3. Runtime Overlay: Merges Content + Progress in-memory for the UI.
 * 4. Strict Validation: Rejects "Shell" lessons (empty questions) at the gate.
 */

import * as drive from './googleDrive';
import { sessionManager } from './sessionManager';
import { identityService } from './googleAuth';
import { deriveUserKey, encryptLesson, decryptLesson } from '../utils/lessonCrypto';

// --- Validation Schemas (Zod-lite) ---

const sanitize = (str) => String(str || '').replace(/[^a-zA-Z0-9-_]/g, '');

const getCompositeKey = (uid, lessonId) => {
    if (!uid || !lessonId) throw new Error('Storage Error: Missing Identity Binding (UID or LessonID)');
    return `${sanitize(uid)}_${sanitize(lessonId)}`;
};

const validateLessonContent = (lesson) => {
    if (!lesson) return false;
    // Shell Check: Must have questions or cards with length > 0
    const qCount = lesson.questions?.length || 0;
    const cCount = lesson.cards?.length || 0;
    return qCount > 0 || cCount > 0;
};

// --- Queue System ---

class SyncQueue {
    #queue = new Map(); // compositeKey -> timeoutId
    #orchestrator;
    #debounceMs = 3000;

    constructor(orchestrator) {
        this.#orchestrator = orchestrator;
    }

    enqueue(compositeKey, dataPayload) {
        if (this.#queue.has(compositeKey)) clearTimeout(this.#queue.get(compositeKey));

        const timeoutId = setTimeout(async () => {
            this.#queue.delete(compositeKey);
            try {
                await this.#orchestrator.executeDriveSync(compositeKey, dataPayload);
            } catch (err) {
                console.warn(`[SyncQueue] Failed for ${compositeKey}:`, err.message);
            }
        }, this.#debounceMs);

        this.#queue.set(compositeKey, timeoutId);
    }

    async flush() {
        const pending = Array.from(this.#queue.keys());
        // In a real app, we might Promise.all the pending syncs.
        // For now, we clear to prevent execution after unload.
        this.#queue.forEach(timer => clearTimeout(timer));
        this.#queue.clear();
    }
}

// --- Storage Helper ---
export const getStore = () => {
    try { return sessionManager.userStore; }
    catch (e) { return { get: (k, d) => d, set: () => { }, remove: () => { } }; }
};

class StorageOrchestrator {
    #hasDrive = false;
    #token = null;
    #syncQueue;
    #progressTable = new Map(); // lessonId -> { fileId, modifiedTime }
    #isHydrating = false;

    constructor() {
        this.#syncQueue = new SyncQueue(this);
    }

    getStore() {
        return getStore();
    }

    setDriveAccess(available, token = null) {
        this.#hasDrive = available;
        this.#token = token;
        console.info(`[Storage] Mode: ${available ? 'Cloud (Drive)' : 'Local (Offline/Recruiter)'}`);
    }

    get #uid() {
        return identityService.uid;
    }

    /**
     * Lists lessons. Note: Metadata is still typically "one file" representation in Drive
     * or a summary list. We filter local cache by UID.
     */
    async listLessons(options = {}) {
        const { includeDeleted = false } = options;
        const store = getStore();
        const uid = this.#uid;
        if (!uid) return [];

        // 2026 Migration: Check for legacy insecure key ('lessons') and migrate to secure key (`meta_${uid}`)
        // This restores progress for users upgrading from v1.0
        let allMeta = store.get(`meta_${uid}`, []);
        if (allMeta.length === 0) {
            const legacy = store.get('lessons', []);
            if (legacy.length > 0) {
                console.info('[Storage] Migrating legacy data to secure key...');
                allMeta = legacy;
                store.set(`meta_${uid}`, allMeta);
                // We keep 'lessons' for now as a backup or clear it? 
                // Better to clear to enforce migration, but safe to keep for a bit.
                // store.remove('lessons'); 
            }
        }

        // Return local immediately
        if (!this.#hasDrive || !this.#token) {
            return includeDeleted ? allMeta : allMeta.filter(l => !l._isDeleted);
        }

        try {
            // Drive Fetch (Metadata Only)
            const driveFiles = await drive.listLessonMetadata(this.#token);
            // In 2026 strict mode, we'd filter Drive files by `cic_lesson_${uid}_` prefix
            // but for backward compatibility/shared lessons, we might need broader logic.
            // For now, assuming Personal Drive Folder isolation.

            const remoteMap = new Map();
            const progressMap = new Map();
            this.#isHydrating = true;

            driveFiles.forEach(f => {
                const props = f.appProperties || {};
                const name = f.name;

                // A. Handle Content Files
                if (name.startsWith('cic_lesson_') || name.startsWith('flashcard_stack_')) {
                    const lessonId = props.id || name.replace('cic_lesson_', '').replace('flashcard_stack_', '').replace('.json', '');
                    remoteMap.set(lessonId, {
                        id: lessonId,
                        driveFileId: f.id,
                        title: props.title || name,
                        modifiedTime: f.modifiedTime,
                        lastMarks: props.lastMarks,
                        questionCount: props.questionCount
                    });
                }
                // B. Handle Detached Progress Files (Discovery Optimization)
                else if (name.startsWith('cic_progress_')) {
                    // Name Format: cic_progress_[UID]_[LessonID].json
                    const parts = name.replace('cic_progress_', '').replace('.json', '').split('_');
                    if (parts.length >= 2 && parts[0] === uid) {
                        const lessonId = parts.slice(1).join('_');
                        progressMap.set(lessonId, { fileId: f.id, modifiedTime: f.modifiedTime });
                        console.info(`[Storage] Discovered cloud progress for ${lessonId}`);
                    }
                }
            });

            // Store progress table for O(1) lookup during getLessonContent
            this.#progressTable = progressMap;

            // Merge Logic
            const merged = [];
            const localMap = new Map(allMeta.map(l => [l.id, l]));

            // 1. Process Remote
            remoteMap.forEach((remote, id) => {
                const local = localMap.get(id);
                if (local) {
                    // Conflict: Prefer Local if explicitly newer or dirty
                    // Otherwise, Remote is truth for existence.
                    // If local is deleted, respect that.
                    if (local._isDeleted) merged.push(local);
                    else merged.push({ ...remote, ...local, driveFileId: remote.driveFileId });

                    localMap.delete(id);
                } else {
                    merged.push(remote);
                }
            });

            // 2. Add remaining local (Drafts/Offline created)
            localMap.forEach(l => merged.push(l));

            // Persist merged metadata
            store.set(`meta_${uid}`, merged);

            return includeDeleted ? merged : merged.filter(l => !l._isDeleted);

        } catch (err) {
            console.warn('[Storage] List failed, using local.', err);
            return includeDeleted ? allMeta : allMeta.filter(l => !l._isDeleted);
        }
    }

    /**
     * CORE: Runtime Overlay (Hydration)
     * Reads Content + Progress and merges them.
     */
    async getLessonContent(lesson) {
        const uid = this.#uid;
        if (!uid) return lesson; // Validation Guard

        const compositeKey = getCompositeKey(uid, lesson.id);
        const store = getStore();

        // 1. Load Local Cache
        let content = store.get(`content_${compositeKey}`, null);
        let progress = store.get(`progress_${compositeKey}`, {}); // Default empty progress

        // 2. Drive Fetch (If enabled and potentially stale)
        // Strategy: We fetch specific progress file separately? 
        // For simplicity/speed in V1 Refactor: 
        // We will assume the "Content File" in Drive might still contain embedded progress from legacy saves,
        // BUT we will prioritize the "Progress File" if it exists (Phase 2).
        // CURRENT: We fetch the single Drive file (Content) which historically had both.
        // NEW: We prepare to split.

        // 2. Drive Fetch (If enabled)
        if (this.#hasDrive && this.#token) {
            // A. Content Fetch (as before, but effectively split in purpose)
            if (!content || (lesson.modifiedTime && (!content.updatedAt || new Date(lesson.modifiedTime) > new Date(content.updatedAt)))) {
                try {
                    const remoteData = await drive.fetchLessonContent(this.#token, { id: lesson.driveFileId, modifiedTime: lesson.modifiedTime });
                    if (remoteData.encryptedContent) {
                        const key = await deriveUserKey(uid);
                        const decrypted = await decryptLesson(remoteData.encryptedContent, key);
                        Object.assign(remoteData, decrypted);
                        delete remoteData.encryptedContent;
                    }
                    if (validateLessonContent(remoteData)) {
                        content = { ...remoteData, updatedAt: new Date().toISOString() };
                        store.set(`content_${compositeKey}`, content);

                        // Legacy: deeply embedded progress in content file (migration support)
                        const legacyProgress = this.#extractProgress(remoteData);
                        progress = this.#mergeProgress(progress, legacyProgress);
                    }
                } catch (e) {
                    console.warn('[Storage] Content fetch failed', e);
                }
            }

            // B. Progress Fetch (Optimized: Uses Pre-Mapped Table)
            try {
                const progressEntry = this.#progressTable.get(lesson.id);
                if (progressEntry) {
                    console.info(`[Storage] Hydrating progress for ${lesson.id} from cloud truth...`);
                    let remoteProgressRaw = await drive.getFileContent(this.#token, progressEntry.fileId);

                    if (remoteProgressRaw.iv && remoteProgressRaw.data) {
                        const key = await deriveUserKey(uid);
                        remoteProgressRaw = await decryptLesson(remoteProgressRaw, key);
                    }

                    progress = this.#mergeProgress(progress, remoteProgressRaw);
                    store.set(`progress_${compositeKey}`, progress);
                }
            } catch (e) {
                console.warn('[Storage] Remote progress sync failed', e);
            }
        }

        // Hydration Complete for this item
        this.#isHydrating = false;

        if (!content) return lesson; // Return stub if nothing found

        // 3. MERGE: Apply Progress (Overlay) to Content
        // Map questions/cards and inject ratings
        const mergedQuestions = (content.questions || []).map(q => {
            const qId = q.id || q.question?.text;
            const savedRating = progress.ratings?.[qId];
            if (savedRating !== undefined) {
                return { ...q, lastRating: savedRating };
            }
            return q;
        });

        // 4. Return Hydrated Object (UI expects this)
        return {
            ...content,
            questions: mergedQuestions,
            // Merge top-level stats (CRITICAL for Resume button)
            lastReviewed: progress.lastReviewed || content.lastReviewed,
            reviewStage: progress.reviewStage ?? content.reviewStage,
            lastMarks: progress.lastMarks ?? content.lastMarks,
            lastSessionIndex: progress.lastSessionIndex ?? content.lastSessionIndex,
            // Keep ShowNotes preference in progress
            showSectionNotes: progress.showSectionNotes ?? content.showSectionNotes
        };
    }

    /**
     * saveLesson
     * Splits data into Content/Progress and enqueues sync.
     */
    async saveLesson(lesson, folderId = null) {
        const uid = this.#uid;
        if (!uid) throw new Error('Cannot save without User ID');

        // 1. Validate Input (Reject empty shells)
        // If it's a "virtual" shell (just metadata), allow it for metadata-only updates,
        // BUT if it claims to have questions and has 0, reject.
        // Actually, for a SAVE operation, we expect full data.
        if (lesson.questions && lesson.questions.length === 0) {
            console.error('[Storage] BLOCKED SAVE: Attempted to save empty question array.');
            return lesson; // No-op, don't corrupt DB
        }

        const compositeKey = getCompositeKey(uid, lesson.id);
        const store = getStore();

        // 2. Extract & Split
        const progressData = this.#extractProgress(lesson);
        const contentData = this.#extractContent(lesson);

        // 3. Local Write (Authoritative)
        // Update Progress
        const currentProgress = store.get(`progress_${compositeKey}`, {});
        const newProgress = { ...currentProgress, ...progressData, updatedAt: new Date().toISOString() };
        store.set(`progress_${compositeKey}`, newProgress);

        // Update Content (Only if real content passed, not just metadata update)
        if (validateLessonContent(contentData)) {
            store.set(`content_${compositeKey}`, { ...contentData, updatedAt: new Date().toISOString() });
        }

        // Update Metadata List
        const allMeta = store.get(`meta_${uid}`, []);
        const metaIdx = allMeta.findIndex(m => m.id === lesson.id);
        const metaItem = {
            id: lesson.id,
            title: lesson.title,
            questionCount: contentData.questions?.length || 0,
            lastMarks: newProgress.lastMarks,
            nextReview: newProgress.nextReview
        };

        if (metaIdx >= 0) allMeta[metaIdx] = { ...allMeta[metaIdx], ...metaItem };
        else allMeta.push(metaItem);
        store.set(`meta_${uid}`, allMeta);

        // 4. Drive Sync Enqueue
        if (this.#hasDrive && !this.#isHydrating) {
            // We pass the SPLIT data to the queue
            this.#syncQueue.enqueue(compositeKey, {
                lessonId: lesson.id,
                content: contentData,
                progress: newProgress,
                folderId,
                driveFileId: lesson.driveFileId
            });
        } else if (this.#isHydrating) {
            console.warn(`[Storage] Write Blocked: Initial hydration in progress for ${lesson.id}`);
        }

        return lesson;
    }

    /**
     * Internal Executor for SyncQueue
     */
    async executeDriveSync(compositeKey, payload) {
        const { lessonId, content, progress, folderId, driveFileId } = payload;
        const uid = this.#uid;

        if (!this.#token || !this.#hasDrive) return;

        try {
            const progressFileName = `cic_progress_${uid}_${lessonId}.json`;
            const key = await deriveUserKey(uid);

            // 1. CLOUD-TRUTH CHECK: Fetch existing progress before writing
            const existingProgressId = await drive.findFileByName(this.#token, progressFileName, folderId || 'root');
            if (existingProgressId) {
                const remoteRaw = await drive.getFileContent(this.#token, existingProgressId);
                let remoteProgress = remoteRaw;
                if (remoteRaw.iv && remoteRaw.data) {
                    remoteProgress = await decryptLesson(remoteRaw, key);
                }

                // MERGE: Ensure we aren't overwriting newer or deeper progress
                const merged = this.#mergeProgress(progress, remoteProgress);

                // If remote was actually better/different, update local cache and abort THIS push
                // to prevent oscillation. The next loop will be consistent.
                if (JSON.stringify(merged.ratings) !== JSON.stringify(progress.ratings)) {
                    console.info(`[Storage] Cloud-Truth Conflict Detected for ${lessonId}. Syncing back to local.`);
                    const store = getStore();
                    store.set(`progress_${compositeKey}`, merged);
                    return; // Exit: Let the local state refresh from cloud truth
                }
            }

            // 2. Safe Save: Only if we are consistent with cloud
            const encryptedProgress = await encryptLesson(progress, key);
            await drive.saveFile(this.#token, progressFileName, encryptedProgress, existingProgressId, 'application/json', folderId);

            // B. Content Sync (Low-Freq)
            if (validateLessonContent(content)) {
                const contentFileName = `cic_lesson_${uid}_${lessonId}.json`;
                const encryptedContent = await encryptLesson(content, key);
                await drive.saveFile(this.#token, contentFileName, encryptedContent, driveFileId, 'application/json', folderId, {
                    id: lessonId,
                    title: content.title,
                    questionCount: String(content.questions.length),
                    lastMarks: String(progress.lastMarks || ''),
                    nextReview: progress.nextReview || ''
                });
            }

        } catch (err) {
            console.error('[Storage] Sync Exec Failed:', err);
        }
    }

    // --- Helpers to Split/Merge ---

    #extractProgress(lesson) {
        // Extracts mutable user state
        const ratings = {};
        (lesson.questions || []).forEach(q => {
            const qId = q.id || q.question?.text;
            if (q.lastRating !== undefined) ratings[qId] = q.lastRating;
        });

        return {
            ratings,
            lastReviewed: lesson.lastReviewed,
            reviewStage: lesson.reviewStage,
            lastMarks: lesson.lastMarks,
            lastSessionIndex: lesson.lastSessionIndex,
            showSectionNotes: lesson.showSectionNotes,
            nextReview: lesson.nextReview
        };
    }

    #extractContent(lesson) {
        // Extracts immutable content
        // sanitize to remove user-specific fields from the content object
        const cleanQuestions = (lesson.questions || []).map(q => {
            // eslint-disable-next-line no-unused-vars
            const { lastRating, ...rest } = q;
            return rest;
        });

        return {
            id: lesson.id,
            title: lesson.title,
            questions: cleanQuestions,
            cards: lesson.cards, // Legacy support
            description: lesson.description,
            // ... other static props
        };
    }

    /**
     * Helper: Merges two progress objects, preferring "better" data.
     */
    #mergeProgress(local, remote) {
        if (!remote) return local;

        // Smart Merge: Furthest Progress Wins
        const curIndex = local.lastSessionIndex || 0;
        const remIndex = remote.lastSessionIndex || 0;
        const maxIndex = Math.max(curIndex, remIndex);

        // Merge ratings: Remote is considered "server truth" if available, 
        // but we keep local if remote doesn't have it. 
        // Real sync might need timestamps per rating, but this is safe for V1.
        const mergedRatings = { ...local.ratings, ...remote.ratings };

        return {
            ...local,
            ...remote, // remote properties generally overwrite local defaults
            lastSessionIndex: maxIndex,
            ratings: mergedRatings,
            updatedAt: new Date().toISOString()
        };
    }

    async shutdown() {
        await this.#syncQueue.flush();
    }
}

export const storageService = new StorageOrchestrator();
