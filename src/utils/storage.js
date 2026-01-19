/**
 * @fileoverview Enterprise-grade Prefix-based Storage Manager.
 * Prevents origin-level data collisions and provides type-safety.
 */

export class StorageStore {
    #prefix;
    #store;

    constructor(prefix = 'cic_', store = null) {
        this.#prefix = prefix;
        this.#store = store;
    }

    /**
     * Internal accessor for the underlying storage mechanism.
     * Defaults to window.localStorage if no explicit store was provided.
     */
    get #underlying() {
        return this.#store || (typeof window !== 'undefined' ? window.localStorage : null);
    }

    /**
     * Namespaced key retrieval.
     */
    get(key, defaultValue = null) {
        try {
            const val = this.#underlying?.getItem(this.#prefix + key);
            if (val === null || val === undefined) return defaultValue;
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
            // We stringify first to catch circularity here
            const serialized = JSON.stringify(value, (k, v) => {
                if (k.startsWith('_') || k.startsWith('$')) return undefined;
                if (typeof v === 'function' || v instanceof Element) return undefined;
                return v;
            });
            this.#underlying?.setItem(this.#prefix + key, serialized);
        } catch (e) {
            console.error(`[StorageStore] Write error for "${key}":`, e);
            // If it still fails, we try a more aggressive fallback (manual scrub)
            try {
                const scrubbed = JSON.parse(JSON.stringify(value, getCircularReplacer()));
                this.#underlying?.setItem(this.#prefix + key, JSON.stringify(scrubbed));
            } catch (inner) {
                console.error(`[StorageStore] Total failure for "${key}"`);
            }
        }
    }

    /**
     * Safe removal of a specific namespaced key.
     */
    remove(key) {
        this.#underlying?.removeItem(this.#prefix + key);
    }

    /**
     * Purges ONLY keys belonging to this application's namespace.
     * Crucial for portfolio hosting on shared domains (e.g., github.io).
     */
    purge() {
        const store = this.#underlying;
        if (!store) return;
        const keysToRemove = [];
        for (let i = 0; i < store.length; i++) {
            const key = store.key(i);
            if (key?.startsWith(this.#prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => store.removeItem(k));
    }

    /**
     * Diagnostic: Lists all keys in current namespace.
     */
    keys() {
        const store = this.#underlying;
        if (!store) return [];
        const found = [];
        for (let i = 0; i < store.length; i++) {
            const key = store.key(i);
            if (key?.startsWith(this.#prefix)) {
                found.push(key.replace(this.#prefix, ''));
            }
        }
        return found;
    }
}

/**
 * Robust circular reference replacer for JSON.stringify
 */
function getCircularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) return;
            seen.add(value);
        }
        return value;
    };
}

// Global Singleton for the application
export const storage = new StorageStore('cic_v1_');
export default storage;
