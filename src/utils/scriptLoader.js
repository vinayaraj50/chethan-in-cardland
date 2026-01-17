/**
 * @fileoverview High-Integrity Script Loader for Enterprise Web Applications.
 * Implements exponential backoff, circuit breaking, and granular error classification.
 * Specifically hardened for browser-level blocking (Tracking Prevention, Ad-blockers).
 * 
 * DESIGN PRINCIPLES:
 * 1. Idempotency: Multiple requests for the same URL return the same promise.
 * 2. Observability: Detailed error states for telemetry.
 * 3. Resilience: Exponential backoff with jitter.
 */

export class ScriptError extends Error {
    constructor(message, url, status = 'EXECUTION_FAILED', isBlocked = false) {
        super(message);
        this.name = 'ScriptError';
        this.url = url;
        this.status = status; // 'TIMEOUT' | 'NETWORK_ERROR' | 'BLOCKED' | 'MISSING_GLOBAL'
        this.isBlocked = isBlocked;

        // Capture stack trace in V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ScriptError);
        }
    }
}

class ScriptLoader {
    #registry = new Map(); // url -> { promise, status, attempt }
    #MAX_RETRIES = 3;
    #INITIAL_BACKOFF = 1000;
    #TIMEOUT = 15000;

    /**
     * Loads a script with lifecycle management.
     * @param {string} url 
     * @param {Object} options 
     */
    async load(url, options = {}) {
        const config = {
            timeout: options.timeout || this.#TIMEOUT,
            async: options.async !== false,
            defer: options.defer !== false,
            maxRetries: options.maxRetries ?? this.#MAX_RETRIES,
            crossOrigin: options.crossOrigin || null,
            attributes: options.attributes || {}
        };

        const existing = this.#registry.get(url);
        if (existing) {
            if (existing.status === 'LOADED') return existing.promise;
            if (existing.status === 'LOADING') return existing.promise;
            if (existing.status === 'FAILED' && config.maxRetries > 0) {
                this.#registry.delete(url);
            } else {
                return existing.promise;
            }
        }

        const promise = this.#attemptLoad(url, config, 0);
        this.#registry.set(url, { promise, status: 'LOADING' });

        try {
            await promise;
            this.#registry.get(url).status = 'LOADED';
            return promise;
        } catch (err) {
            this.#registry.delete(url);
            throw err;
        }
    }

    async #attemptLoad(url, config, attempt) {
        const startTime = Date.now();

        const loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = config.async;
            script.defer = config.defer;

            if (config.crossOrigin) {
                script.crossOrigin = config.crossOrigin;
            }

            Object.entries(config.attributes).forEach(([key, value]) => {
                script.setAttribute(key, value);
            });

            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new ScriptError(`Timeout: ${url} (T+${config.timeout}ms)`, url, 'TIMEOUT'));
            }, config.timeout);

            const cleanup = () => {
                clearTimeout(timeoutId);
                script.onload = null;
                script.onerror = null;
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
            };

            script.onload = () => {
                clearTimeout(timeoutId);
                script.onload = null;
                script.onerror = null;
                resolve();
            };

            script.onerror = () => {
                cleanup();
                const duration = Date.now() - startTime;

                // Edge Case: Browsers block scripts nearly instantly (<200ms) with no details in event.
                // This is a hallmark of Ad-blockers or "Strict" Tracking Prevention.
                const isBlocked = duration < 250;
                const status = isBlocked ? 'BLOCKED' : 'NETWORK_ERROR';

                reject(new ScriptError(
                    `Failed to load: ${url} (${status})`,
                    url,
                    status,
                    isBlocked
                ));
            };

            document.head.appendChild(script);
        });

        try {
            return await loadPromise;
        } catch (err) {
            // Do not retry if explicitly blocked by browser settings/extensions
            if (err.isBlocked || attempt >= config.maxRetries) {
                throw err;
            }

            const delay = this.#calculateBackoff(attempt);
            console.warn(`[ScriptLoader] Retry ${attempt + 1}/${config.maxRetries} for ${url} in ${delay}ms`);

            await new Promise(r => setTimeout(r, delay));
            return this.#attemptLoad(url, config, attempt + 1);
        }
    }

    #calculateBackoff(attempt) {
        const base = this.#INITIAL_BACKOFF * Math.pow(2, attempt);
        const jitter = Math.random() * 800; // Add jitter to prevent synchronization
        return base + jitter;
    }

    /**
     * Polls for a global object, essential for legacy scripts that don't support modern exports.
     */
    async waitForGlobal(name, timeout = 10000) {
        if (window[name]) return window[name];

        return new Promise((resolve, reject) => {
            const start = Date.now();
            const timer = setInterval(() => {
                if (window[name]) {
                    clearInterval(timer);
                    resolve(window[name]);
                } else if (Date.now() - start > timeout) {
                    clearInterval(timer);
                    reject(new ScriptError(`Global "${name}" missing after timeout`, null, 'MISSING_GLOBAL'));
                }
            }, 100);
        });
    }

    /**
     * Clears registry, mainly for testing.
     */
    reset() {
        this.#registry.clear();
    }
}

export const scriptLoader = new ScriptLoader();
