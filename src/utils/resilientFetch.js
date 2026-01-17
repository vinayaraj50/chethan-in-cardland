import { identityService } from '../services/googleAuth';

/**
 * @fileoverview Resilient Network Layer.
 * Implements Exponential Backoff and Auto-Refreshing Identity.
 */

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

/**
 * Comprehensive wrapper for Google API calls.
 * Automatically handles 401 Unauthorized by attempting a silent token refresh.
 */
export const resilientFetch = async (url, options = {}, retryCount = 0) => {
    try {
        const response = await fetch(url, options);

        // 1. Success Path
        if (response.ok) return response;

        // 2. Token Expired (401)
        if (response.status === 401 && retryCount < 1) {
            console.info('[Network] Token invalid. Attempting silent refresh...');
            try {
                // Attempt to acquire a new token silently
                const newToken = await identityService.acquireToken({ prompt: 'none', elevated: options._isElevated });

                // Retry with new token
                const newOptions = {
                    ...options,
                    headers: {
                        ...options.headers,
                        Authorization: `Bearer ${newToken}`
                    }
                };
                return await resilientFetch(url, newOptions, retryCount + 1);
            } catch (err) {
                console.error('[Network] Refresh failed.', err);
                // GSI requires interaction. The user must manually sign in again.
                // We throw a specific error that the IdentityManager (or UI) might eventually catch.
                throw new Error('REAUTH_NEEDED');
            }
        }

        // 3. Permission/Scope Error (403)
        // If the token is valid but lacks scope (or App Verification failed), we MUST re-auth.
        if (response.status === 403) {
            console.warn('[Network] 403 Forbidden. Token scopes might be missing or app unverified.');
            throw new Error('REAUTH_NEEDED');
        }

        // 3. Transient Errors (Network, 5xx, 429)
        const isTransient = response.status >= 500 || response.status === 429;
        if (isTransient && retryCount < MAX_RETRIES) {
            const delay = BASE_DELAY * Math.pow(2, retryCount);
            console.warn(`[Network] Transient error ${response.status}. Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            return await resilientFetch(url, options, retryCount + 1);
        }

        return response;
    } catch (err) {
        // 4. Network/Connection errors
        if (retryCount < MAX_RETRIES) {
            const delay = BASE_DELAY * Math.pow(2, retryCount);
            await new Promise(r => setTimeout(r, delay));
            return await resilientFetch(url, options, retryCount + 1);
        }
        throw err;
    }
};
