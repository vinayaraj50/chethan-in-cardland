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
        if (response.status === 403) {
            const errorBody = await response.json().catch(() => ({}));
            const reason = errorBody.error?.errors?.[0]?.reason || 'unknown';
            const message = errorBody.error?.message || 'No detailed message';

            console.error(`[Audit] 403 Forbidden detected.`, {
                url,
                reason,
                message,
                tokenPrefix: options.headers?.Authorization?.substring(0, 17) + '...',
                fullError: errorBody
            });

            if (reason === 'accessNotConfigured') {
                console.error('[Audit] ROOT CAUSE: Google Drive API is likely DISABLED in the Google Cloud Console for this project.');
            } else if (reason === 'insufficientPermissions') {
                console.error('[Audit] ROOT CAUSE: OAuth token is missing required scopes (drive.file or drive).');
                // Deep Audit: Check active scopes via tokeninfo
                try {
                    const cleanToken = options.headers?.Authorization?.replace('Bearer ', '');
                    if (cleanToken) {
                        const infoResp = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${cleanToken}`);
                        const info = await infoResp.json();
                        console.info('[Audit] Token Scope Info:', {
                            scopes: info.scope,
                            expires_in: info.expires_in,
                            email: info.email
                        });
                    }
                } catch (e) {
                    console.warn('[Audit] Could not verify token scopes:', e);
                }
            }

            throw new Error(`REAUTH_NEEDED: ${reason}: ${message}`);
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
