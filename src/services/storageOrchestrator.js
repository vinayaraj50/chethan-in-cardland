import { sessionManager } from './sessionManager';
import * as drive from './googleDrive';
import { identityService } from './googleAuth';
import { deriveUserKey, encryptLesson, decryptLesson } from '../utils/lessonCrypto';

/**
 * @fileoverview StorageOrchestrator - Strategic Storage Layer.
 * ARCHITECTURE:
 * 1. Unified Interface: View layer remains agnostic of the storage target.
 * 2. Strategy Switching: Seamlessly pivots between Drive and LocalStorage (Recruiter Fallback).
 * 3. Cache-First: Always returns local cache immediately for instant UI, syncs in background.
 * 4. Zero-Trust: Local storage is strictly session-scoped via SessionManager.
 */

// Helper to access session-scoped storage safely
const getStore = () => {
    try {
        return sessionManager.userStore;
    } catch (e) {
        // If no session (e.g. pre-auth), return a dummy read-only/no-op store
        // This enforces "No data visible without verification"
        return {
            get: (key, defaultValue) => defaultValue,
            set: () => { },
            remove: () => { }
        };
    }
};

class StorageOrchestrator {
    #hasDrive = false;
    #token = null;

    setDriveAccess(available, token = null) {
        this.#hasDrive = available;
        this.#token = token;
        console.info(`[Storage] Strategy initialized: ${available ? 'Google Drive' : 'Local Persistence (Recruiter Mode)'}`);
    }

    /**
     * Resilient fetch of lesson metadata.
     * Strategy: 
     * - If Drive exists: Fetch metadata from Drive, merge with local cache.
     * - If Drive blocked: Return local storage directly.
     */
    async listLessons() {
        const store = getStore();
        const localLessons = store.get('lessons', []);

        if (!this.#hasDrive || !this.#token) {
            return localLessons;
        }

        try {
            const driveFiles = await drive.listLessonMetadata(this.#token);
            const driveMetadata = driveFiles.map(file => {
                const props = file.appProperties || {};
                return {
                    id: props.id || file.id,
                    driveFileId: file.id,
                    title: props.title || file.name.replace('cic_lesson_', '').replace('.json', ''),
                    questionCount: parseInt(props.questionCount || props.cardsCount) || 0,
                    lastMarks: props.lastMarks ? parseInt(props.lastMarks) : undefined,
                    nextReview: props.nextReview || undefined,
                    label: props.label || 'No label',
                    modifiedTime: file.modifiedTime,
                    ownedByMe: file.ownedByMe,
                };
            });

            // Merge Strategy:
            // 1. Lessons from Drive are Source of Truth (Cloud Sync)
            // 2. Local lessons that are NOT yet on Drive are kept
            // 3. If a lesson exists in both, Drive version wins (to ensure cross-device consistency)
            const merged = [...driveMetadata];
            localLessons.forEach(s => {
                if (!merged.find(m => m.id === s.id)) {
                    merged.push(s);
                } else if (!s.driveFileId) {
                    // This local lesson should have been synced but isn't marked.
                    // We'll let the next save cycle fix it.
                }
            });

            // Persist the merged list back to local for instant next-load
            store.set('lessons', merged);

            return merged;
        } catch (err) {
            console.error('[Storage] Drive fetch failed. Falling back to local.', err);
            return localLessons;
        }
    }

    async getLessonContent(lesson) {
        let content = null;
        const store = getStore();

        // Strategy: Try Drive First (if active)
        if (this.#hasDrive && this.#token && lesson.driveFileId) {
            try {
                content = await drive.fetchLessonContent(this.#token, { id: lesson.driveFileId, modifiedTime: lesson.modifiedTime });

                // Decryption logic for App-Bound security
                const uid = identityService.uid;

                if (content && content.encryptedContent && uid) {
                    const key = await deriveUserKey(uid);
                    const decrypted = await decryptLesson(content.encryptedContent, key);
                    content = { ...content, ...decrypted, encryptedContent: undefined };
                }
            } catch (err) {
                console.warn('[Storage] Drive content fetch failed, hitting local cache:', lesson.id);
            }
        }

        // Strategy 2: Fallback to local full storage (lessons_full)
        // We do this if Drive failed OR if Drive returned a stub/error object
        const isStub = (c) => !c || (!c.questions && !c.cards) || c.error;

        if (isStub(content)) {
            const allLocal = store.get('lessons_full', {});
            const localContent = allLocal[lesson.id];
            if (!isStub(localContent)) {
                console.info('[Storage] Rehydrated from local cache:', lesson.id);
                content = localContent;
            }
        }

        // Final Safeguard: If still a stub, return the lesson metadata itself
        // (Better than null, but should ideally be caught by UI)
        return content || lesson;
    }

    async saveLesson(lesson, folderId = null) {
        const isStub = (l) => !l || (!l.questions && !l.cards);

        // Phase 1: Local Cache (Instant UI)
        const store = getStore();
        const allLocal = store.get('lessons_full', {});

        let lessonToPersist = { ...lesson };

        // DATA INTEGRITY GUARD: If incoming lesson is a stub, merge with existing full content
        if (isStub(lessonToPersist)) {
            const existingFull = allLocal[lesson.id];
            if (!isStub(existingFull)) {
                console.info('[Storage] Merging metadata update with existing full content:', lesson.id);
                lessonToPersist = { ...existingFull, ...lessonToPersist };
            }
        }

        // SURGICAL PURIFICATION: Ensure this specfic lesson is clean before saving to map
        // This prevents one bad lesson from crashing the entire 'lessons_full' collection
        try {
            const clean = JSON.parse(JSON.stringify(lessonToPersist, (k, v) => {
                if (typeof v === 'function' || v instanceof Element) return undefined;
                return v;
            }));
            allLocal[lesson.id] = clean;
            lessonToPersist = clean;
        } catch (e) {
            console.warn('[Storage] Lesson purification failed, saving as-is (risk of circular error)', e);
            allLocal[lesson.id] = lessonToPersist;
        }

        store.set('lessons_full', allLocal);

        // Update the metadata list for instant list rendering
        const metadata = store.get('lessons', []);
        const metaIdx = metadata.findIndex(m => m.id === lesson.id);
        const metaItem = {
            ...lessonToPersist,
            questions: undefined,
            cards: undefined,
            questionCount: lessonToPersist.questionCount !== undefined ? lessonToPersist.questionCount : (lessonToPersist.questions?.length || lessonToPersist.cards?.length || 0)
        };
        if (metaIdx >= 0) metadata[metaIdx] = metaItem;
        else metadata.push(metaItem);
        store.set('lessons', metadata);

        // Phase 2: Remote Sync (Persistence)
        if (this.#hasDrive) {
            // 2026 Strategy: Robust token recovery
            if (!this.#token) {
                try {
                    const newToken = await identityService.ensureDriveAccess();
                    if (newToken) this.#token = newToken;
                } catch (e) {
                    console.warn('[Storage] Silent token recovery failed:', e.message);
                }
            }

            if (!this.#token) {
                throw new Error('REAUTH_NEEDED');
            }

            try {
                let dataToSave = lessonToPersist;
                const uid = identityService.uid;
                if (uid) {
                    const key = await deriveUserKey(uid);
                    dataToSave = await encryptLesson(lessonToPersist, key);
                }

                const result = await drive.saveLesson(this.#token, dataToSave, lessonToPersist.driveFileId, folderId);

                // Update local lesson with the new Drive ID for future syncs
                lessonToPersist.driveFileId = result.id;
                metaItem.driveFileId = result.id;

                // Final sync with store (to persist driveFileId)
                allLocal[lesson.id] = lessonToPersist;
                store.set('lessons_full', allLocal);
                store.set('lessons', metadata);
            } catch (err) {
                console.warn('[Storage] Drive sync delayed.', err);
                const msg = err.message || String(err);
                if (msg.includes('REAUTH_NEEDED') || msg.includes('403')) throw err;
            }
        }

        return lessonToPersist;
    }

    async deleteLesson(lesson) {
        if (this.#hasDrive && this.#token && lesson.driveFileId) {
            await drive.deleteLesson(this.#token, lesson.driveFileId).catch(() => { });
        }

        const store = getStore();
        const metadata = store.get('lessons', []);
        store.set('lessons', metadata.filter(m => m.id !== lesson.id));

        const allLocal = store.get('lessons_full', {});
        delete allLocal[lesson.id];
        store.set('lessons_full', allLocal);
    }
}

export const storageService = new StorageOrchestrator();
