/**
 * @fileoverview SessionManager - 2026 Zero-Trust Session Isolation
 * 
 * Enforces strict data separation per user.
 * - Manages session-scoped storage.
 * - Enforces "Cold-Start Purge" (Clears user data on boot).
 * - Prevents cross-user data bleed.
 */

import { StorageStore } from '../utils/storage';

export class SessionManager {
    static #instance;
    #currentSession = null;
    #globalStore;

    constructor() {
        if (SessionManager.#instance) return SessionManager.#instance;
        // Global store for non-sensitive device prefs (theme, sounds)
        // Prefix changed to 'cic_global_' to avoid collision with legacy 'cic_v1_'
        this.#globalStore = new StorageStore('cic_global_');

        // Bind methods
        this.startSession = this.startSession.bind(this);
        this.endSession = this.endSession.bind(this);

        SessionManager.#instance = this;
    }

    /**
     * Initializes a secure session for a verified user.
     * @param {string} uid - Verified User ID
     */
    startSession(uid) {
        if (!uid) throw new Error("Security Violation: Attempted to start session without UID");

        // 1. If switching users directly without logout, ensure cleanup of previous
        if (this.#currentSession && this.#currentSession.uid !== uid) {
            console.warn('[SessionManager] Hot-swapping sessions. Purging previous.');
            this.endSession();
        }

        // 2. SMART PURGE: Identify and remove ANY other user data on this device
        // This ensures the current user's data remains intact across refreshes,
        // but stale data from previous users is nuked upon identity verification.
        this.#purgeOtherUsers(uid);

        const prefix = `cic_user_${uid}_`;
        this.#currentSession = {
            uid,
            // Create a storage isolation zone for this user
            store: new StorageStore(prefix)
        };

        console.info(`[SessionManager] Secure session initialized for ${uid}`);
    }

    /**
     * Terminates the current session and purges sensitive ephemeral state.
     */
    endSession() {
        if (!this.#currentSession) return;

        const uid = this.#currentSession.uid;
        console.info(`[SessionManager] Ending session for ${uid}`);

        // We set current session to null, but we don't necessarily wipe the disk 
        // to allow for offline/rehydration. The 'Smart Purge' on next boot handles security.
        this.#currentSession = null;
    }

    /**
     * Accessor for the current user's isolated storage.
     * Throws if no active session.
     */
    get userStore() {
        if (!this.#currentSession) {
            throw new Error("Security Violation: Attempted to access user storage without active session");
        }
        return this.#currentSession.store;
    }

    /**
     * Accessor for device-global preferences (Theme, Sounds).
     */
    get globalStore() {
        return this.#globalStore;
    }

    /**
     * SECURITY: Smart Purge
     * Removes all user-scoped data EXCEPT for the specified UID.
     */
    #purgeOtherUsers(currentUid) {
        const store = window.localStorage;
        const keysToRemove = [];
        const currentPrefix = `cic_user_${currentUid}_`;

        for (let i = 0; i < store.length; i++) {
            const key = store.key(i);
            if (!key) continue;

            // Delete ANY user data that doesn't belong to the current authenticated user
            if (key.startsWith('cic_user_') && !key.startsWith(currentPrefix)) {
                keysToRemove.push(key);
            }

            // Also purge legacy keys regardless
            if (key.startsWith('cic_lesson_') || key.startsWith('cic_v1_lessons')) {
                keysToRemove.push(key);
            }
        }

        if (keysToRemove.length > 0) {
            console.info(`[SessionManager] Cleaning up ${keysToRemove.length} stale/legacy session keys.`);
            keysToRemove.forEach(k => store.removeItem(k));
        }
    }

    /**
     * Full Manual Purge (Dangerous)
     * Only call for total data reset or logout-all scenarios.
     */
    static purgeAllUserSessions() {
        console.info('[SessionManager] Executing FULL Manual Purge...');
        const store = window.localStorage;
        const keysToRemove = [];

        for (let i = 0; i < store.length; i++) {
            const key = store.key(i);
            if (key && (key.startsWith('cic_user_') || key.startsWith('cic_lesson_') || key.startsWith('cic_v1_lessons'))) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(k => store.removeItem(k));
        console.info(`[SessionManager] Purged ${keysToRemove.length} sensitive keys.`);
    }
}

export const sessionManager = new SessionManager();
