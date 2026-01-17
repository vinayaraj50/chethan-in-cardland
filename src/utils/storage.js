/**
 * @fileoverview Enterprise-grade Prefix-based Storage Manager.
 * Prevents origin-level data collisions and provides type-safety.
 */

export class StorageStore {
    #prefix;
    #store;

    constructor(prefix = 'cic_', store = window.localStorage) {
        this.#prefix = prefix;
        this.#store = store;
    }

    /**
     * Namespaced key retrieval.
     */
    get(key, defaultValue = null) {
        try {
            const val = this.#store.getItem(this.#prefix + key);
            if (val === null) return defaultValue;
            return JSON.parse(val);
        } catch (e) {
            console.error(`[StorageStore] Read error for "${key}":`, e);
            return defaultValue;
        }
    }

    /**
     * Namespaced key persistence.
     */
    set(key, value) {
        try {
            this.#store.setItem(this.#prefix + key, JSON.stringify(value));
        } catch (e) {
            console.error(`[StorageStore] Write error for "${key}":`, e);
        }
    }

    /**
     * Safe removal of a specific namespaced key.
     */
    remove(key) {
        this.#store.removeItem(this.#prefix + key);
    }

    /**
     * Purges ONLY keys belonging to this application's namespace.
     * Crucial for portfolio hosting on shared domains (e.g., github.io).
     */
    purge() {
        const keysToRemove = [];
        for (let i = 0; i < this.#store.length; i++) {
            const key = this.#store.key(i);
            if (key?.startsWith(this.#prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => this.#store.removeItem(k));
    }

    /**
     * Diagnostic: Lists all keys in current namespace.
     */
    keys() {
        const found = [];
        for (let i = 0; i < this.#store.length; i++) {
            const key = this.#store.key(i);
            if (key?.startsWith(this.#prefix)) {
                found.push(key.replace(this.#prefix, ''));
            }
        }
        return found;
    }
}

// Global Singleton for the application
export const storage = new StorageStore('cic_v1_');
export default storage;
