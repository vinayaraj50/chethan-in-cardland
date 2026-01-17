import { storage } from '../utils/storage';
import * as drive from './googleDrive';
import { identityService } from './googleAuth';
import { deriveUserKey, encryptLesson, decryptLesson } from '../utils/lessonCrypto';

/**
 * @fileoverview StorageOrchestrator - Strategic Storage Layer.
 * ARCHITECTURE:
 * 1. Unified Interface: View layer remains agnostic of the storage target.
 * 2. Strategy Switching: Seamlessly pivots between Drive and LocalStorage (Recruiter Fallback).
 * 3. Cache-First: Always returns local cache immediately for instant UI, syncs in background.
 */

class StorageOrchestrator {
    #hasDrive = false;
    #token = null;

    setDriveAccess(available, token = null) {
        this.#hasDrive = available;
        this.#token = token;
        console.info(`[Storage] Strategy initialized: ${available ? 'Google Drive' : 'Local Persistence (Recruiter Mode)'}`);
    }

    /**
     * Resilient fetch of flashcard metadata.
     * Strategy: 
     * - If Drive exists: Fetch metadata from Drive, merge with local cache.
     * - If Drive blocked: Return local storage directly.
     */
    async listStacks() {
        const localStacks = storage.get('stacks', []);

        if (!this.#hasDrive || !this.#token) {
            return localStacks;
        }

        try {
            const driveFiles = await drive.listStackMetadata(this.#token);
            const driveMetadata = driveFiles.map(file => {
                const props = file.appProperties || {};
                return {
                    id: props.id || file.id,
                    driveFileId: file.id,
                    title: props.title || file.name.replace('flashcard_stack_', '').replace('.json', ''),
                    cardsCount: parseInt(props.cardsCount) || 0,
                    lastMarks: props.lastMarks ? parseInt(props.lastMarks) : undefined,
                    nextReview: props.nextReview || undefined,
                    label: props.label || 'No label',
                    modifiedTime: file.modifiedTime,
                    ownedByMe: file.ownedByMe,
                };
            });

            // Merge Strategy:
            // 1. Stacks from Drive are Source of Truth (Cloud Sync)
            // 2. Local stacks that are NOT yet on Drive are kept
            // 3. If a stack exists in both, Drive version wins (to ensure cross-device consistency)
            const merged = [...driveMetadata];
            localStacks.forEach(s => {
                if (!merged.find(m => m.id === s.id)) {
                    merged.push(s);
                } else if (!s.driveFileId) {
                    // This local stack should have been synced but isn't marked.
                    // We'll let the next save cycle fix it.
                }
            });

            // Persist the merged list back to local for instant next-load
            storage.set('stacks', merged);

            return merged;
        } catch (err) {
            console.error('[Storage] Drive fetch failed. Falling back to local.', err);
            return localStacks;
        }
    }

    async getStackContent(stack) {
        if (this.#hasDrive && this.#token && stack.driveFileId) {
            let content = await drive.fetchStackContent(this.#token, { id: stack.driveFileId, modifiedTime: stack.modifiedTime });

            // Decryption logic for App-Bound security
            const uid = identityService.uid;
            if (uid && typeof content === 'string' && content.length > 20) { // Basic heuristic for encrypted blob
                try {
                    const key = await deriveUserKey(uid);
                    content = await decryptLesson(content, key);
                } catch (e) {
                    console.warn('[Storage] Decryption skipped or failed for stack:', stack.id, e);
                    // If it's old unencrypted data, drive.fetchStackContent might have already parsed it as JSON
                }
            }
            return content;
        }

        // Fallback to local full storage
        const allLocal = storage.get('stacks_full', {});
        return allLocal[stack.id] || stack;
    }

    async saveStack(stack, folderId = null) {
        if (this.#hasDrive && this.#token) {
            try {
                let dataToSave = stack;

                // Encryption logic for App-Bound security
                const uid = identityService.uid;
                if (uid) {
                    try {
                        const key = await deriveUserKey(uid);
                        dataToSave = await encryptLesson(stack, key);
                    } catch (e) {
                        console.error('[Storage] Encryption failed for save:', e);
                    }
                }

                const result = await drive.saveStack(this.#token, dataToSave, stack.driveFileId, folderId);
                stack.driveFileId = result.id;
            } catch (err) {
                console.warn('[Storage] Drive save interrupted.', err);
            }
        }

        // Always persist a full local copy
        const allLocal = storage.get('stacks_full', {});
        allLocal[stack.id] = stack;
        storage.set('stacks_full', allLocal);

        // Update the metadata list
        const metadata = storage.get('stacks', []);
        const metaIdx = metadata.findIndex(m => m.id === stack.id);
        const metaItem = { ...stack, cards: undefined }; // Strip cards for metadata list
        if (metaIdx >= 0) metadata[metaIdx] = metaItem;
        else metadata.push(metaItem);
        storage.set('stacks', metadata);

        return stack;
    }

    async deleteStack(stack) {
        if (this.#hasDrive && this.#token && stack.driveFileId) {
            await drive.deleteStack(this.#token, stack.driveFileId).catch(() => { });
        }

        const metadata = storage.get('stacks', []);
        storage.set('stacks', metadata.filter(m => m.id !== stack.id));

        const allLocal = storage.get('stacks_full', {});
        delete allLocal[stack.id];
        storage.set('stacks_full', allLocal);
    }
}

export const storageService = new StorageOrchestrator();
