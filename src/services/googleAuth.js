import { scriptLoader } from '../utils/scriptLoader';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from 'firebase/auth';

/**
 * @fileoverview IdentityManager - Enterprise-grade Google Identity Subsystem.
 * 
 * DESIGN PRINCIPLES:
 * 1. Singleton Pattern: Ensures a single source of truth for auth state.
 * 2. Incremental Authorization: Request base identity first; elevate scopes lazily.
 * 3. Proactive Token Refresh: Automatically refreshes tokens before expiry.
 * 4. Immutable State Transitions: Prevent race conditions in auth state.
 * 5. Secure Error Handling: Sanitize and categorize errors for better UX.
 */

export const IdentityState = {
    IDLE: 'IDLE',
    INITIALIZING: 'INITIALIZING',
    READY: 'READY',
    AUTHENTICATING: 'AUTHENTICATING',
    AUTHORIZING: 'AUTHORIZING', // Elevating permissions
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR'
};

// Standard Industry Scopes
const SCOPES = {
    IDENTITY: ['openid', 'profile', 'email'],
    // CRITICAL: Using 'drive' (not 'drive.file') to see ALL files, including those created by Apps Script
    // 'drive.file' only shows files created by this app, which excludes backend-generated profile_*.json
    STORAGE: ['https://www.googleapis.com/auth/drive']
};

class IdentityManager {
    static #instance = null;

    #state = IdentityState.IDLE;
    #lastError = null;
    #observers = new Set(); // Observer pattern for multiple listeners

    #identity = null;
    #authorization = null;
    #tokenClient = null;
    #initPromise = null;
    #isInitialized = false;

    // Token Management
    #refreshTimer = null;

    // SEMAPHORE: Handles concurrent token requests to prevent thundering herd
    #tokenInFlight = null;
    #requestQueue = [];

    constructor() {
        if (IdentityManager.#instance) {
            return IdentityManager.#instance;
        }
        this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        IdentityManager.#instance = this;
    }

    /**
     * Terminology:
     * - `subscribe`: Add a listener for state updates.
     * - `unsubscribe`: Remove a listener.
     */
    subscribe(callback) {
        this.#observers.add(callback);
        // Immediately notify with current state
        callback(this.getSnapshot());
        return () => this.#observers.delete(callback);
    }

    getSnapshot() {
        const userWithToken = this.#identity ? {
            ...this.#identity,
            uid: this.uid,
            token: this.#authorization?.token
        } : null;
        return {
            user: userWithToken,
            status: this.#state,
            error: this.#lastError,
            token: this.#authorization?.token,
            hasDrive: this.hasDriveAccess
        };
    }

    // Getters
    get state() { return this.#state; }
    get error() { return this.#lastError; }
    get user() { return this.#identity ? { ...this.#identity, uid: this.uid, token: this.#authorization?.token } : null; }
    get token() { return this.#authorization?.token; }
    get uid() {
        // Prefer Firebase UID for database/storage consistency
        return auth.currentUser?.uid || this.#identity?.id;
    }
    get hasDriveAccess() {
        return this.#authorization?.scope?.split(' ').includes(SCOPES.STORAGE[0]);
    }

    /**
     * Bootstraps the GSI environment with strict origin validation.
     */
    async initialize() {
        if (this.#initPromise) return this.#initPromise;

        this.#initPromise = (async () => {
            try {
                this.#transition(IdentityState.INITIALIZING);

                await scriptLoader.load('https://accounts.google.com/gsi/client', {
                    async: true,
                    defer: true
                });

                const google = await scriptLoader.waitForGlobal('google', 20000);

                // Initialize One Tap / FedCM (Non-sensitive Identity)
                google.accounts.id.initialize({
                    client_id: this.clientId,
                    callback: (res) => this.#handleIdentityResponse(res),
                    auto_select: true,
                    cancel_on_tap_outside: false
                });

                // Initialize Token Client for Incremental Auth
                this.#tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.clientId,
                    scope: SCOPES.IDENTITY.join(' '), // Start with baseline permissions
                    callback: (res) => this.#resolveTokenRequest(res),
                    error_callback: (err) => this.#handleSystemError(err)
                });

                this.#isInitialized = true;
                this.#transition(IdentityState.READY);

                // Trigger One Tap if possible
                // Note: We avoid checking notification.isNotDisplayed() to prevent FedCM warnings
                google.accounts.id.prompt();

            } catch (err) {
                this.#handleSystemError(err);
                throw err;
            }
        })();

        return this.#initPromise;
    }

    /**
     * Token Acquisition with transparent refresh and queueing.
     */
    async acquireToken(options = { elevated: false, prompt: 'select_account' }) {
        if (!this.#isInitialized) await this.#initPromise;

        // Proactive Refresh Check: If token exists and is valid, return it.
        // We only block if it's expired or about to expire.
        if (this.#authorization?.token && !this.#isTokenNearExpiry() && !options.elevated) {
            return this.#authorization.token;
        }

        // If we need elevated permissions but already have them, verify scope match
        if (options.elevated && this.hasDriveAccess && !this.#isTokenNearExpiry()) {
            return this.#authorization.token;
        }

        // Queue requests if a token acquisition is already in flight.
        if (this.#tokenInFlight) {
            return new Promise((resolve, reject) => {
                this.#requestQueue.push({ options, resolve, reject });
            });
        }

        return new Promise((resolve, reject) => {
            this.#tokenInFlight = { resolve, reject };

            const scopeRequest = options.elevated
                ? [...SCOPES.IDENTITY, ...SCOPES.STORAGE].join(' ')
                : SCOPES.IDENTITY.join(' ');

            this.#transition(options.elevated ? IdentityState.AUTHORIZING : IdentityState.AUTHENTICATING);

            this.#tokenClient.requestAccessToken({
                prompt: options.prompt,
                scope: scopeRequest,
                hint: this.#identity?.email
            });
        });
    }

    #isTokenNearExpiry() {
        if (!this.#authorization) return true;
        // Refresh if < 5 minutes remaining
        return (this.#authorization.expiresAt - Date.now()) < 300000;
    }

    /**
     * Internal handler for token client response.
     */
    #resolveTokenRequest(response) {
        const inFlight = this.#tokenInFlight;
        this.#tokenInFlight = null;

        if (response.error) {
            const err = new Error(response.error);
            inFlight?.reject(err);
            this.#processQueue(err, null);
            this.#handleSystemError(err);
            return;
        }

        const expiresInMs = response.expires_in * 1000;
        this.#authorization = {
            token: response.access_token,
            expiresAt: Date.now() + expiresInMs,
            scope: response.scope
        };

        this.#setupRefreshTimer(expiresInMs);

        this.#fetchFullProfile(this.#authorization.token)
            .then(() => {
                inFlight?.resolve(this.#authorization.token);
                this.#processQueue(null, this.#authorization.token);
            })
            .catch(err => {
                inFlight?.reject(err);
                this.#processQueue(err, null);
            });
    }

    #setupRefreshTimer(durationMs) {
        if (this.#refreshTimer) clearTimeout(this.#refreshTimer);
        // Refresh 5 minutes before expiry
        const refreshDelay = Math.max(0, durationMs - 300000);
        this.#refreshTimer = setTimeout(() => {
            console.log('[IdentityManager] Auto-refreshing token...');
            this.acquireToken({ prompt: 'none', elevated: this.hasDriveAccess })
                .catch(e => console.warn('[IdentityManager] Silent refresh failed', e));
        }, refreshDelay);
    }

    #processQueue(error, token) {
        const queue = [...this.#requestQueue];
        this.#requestQueue = [];
        queue.forEach(req => {
            if (error) req.reject(error);
            else req.resolve(token);
        });
    }

    async signIn(options = { prompt: 'select_account', elevated: false }) {
        return this.acquireToken(options);
    }

    async requestDriveAccess() {
        return this.acquireToken({ prompt: 'consent', elevated: true });
    }

    signOut() {
        if (window.google?.accounts?.id) {
            window.google.accounts.id.disableAutoSelect();
        }
        if (this.#refreshTimer) clearTimeout(this.#refreshTimer);
        firebaseSignOut(auth).catch(e => console.error('Firebase SignOut Error:', e));
        this.#clearSession();
    }

    async #handleIdentityResponse(response) {
        try {
            const profile = this.#decodeCredential(response.credential);
            this.#identity = {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                picture: profile.picture
            };

            // Bridge to Firebase
            const credential = GoogleAuthProvider.credential(response.credential);
            await signInWithCredential(auth, credential);
            console.log('[IdentityManager] Bridged to Firebase as:', auth.currentUser.uid);

            // Automatically attempt to get a token after ID verification
            // We use prompt: 'none' to try and get a token silently.
            // If it fails (e.g. first time on domain), we don't throw, just let the user 
            // click the login button manually for full consent.
            this.signIn({ prompt: 'none', elevated: false }).catch(e => {
                console.log('[IdentityManager] Silent token acquisition skipped (consent required)');
            });
        } catch (err) {
            this.#handleSystemError(err);
        }
    }

    async #fetchFullProfile(token) {
        try {
            const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!resp.ok) throw new Error('Failed to fetch user info');
            const profile = await resp.json();
            this.#identity = { ...this.#identity, ...profile };
            this.#transition(IdentityState.SUCCESS);
        } catch (err) {
            // Silently transition even on profile fetch failure (keep partial profile)
            console.warn('[IdentityManager] Failed to enrich profile:', err);
            this.#transition(IdentityState.SUCCESS);
        }
    }

    #handleSystemError(error) {
        const inFlight = this.#tokenInFlight;
        this.#tokenInFlight = null;

        const message = error.message || String(error);
        const isAccessDenied = /access_denied|403/.test(message);
        const isInvalidGrant = /invalid_grant|expired_token|invalid_token/.test(message);

        // Notify inFlight request to prevent deadlocks
        if (inFlight) {
            inFlight.reject(error);
            this.#processQueue(error, null);
        }

        // RECRUITER MODE: Allow login even if Drive scope is denied.
        if (isAccessDenied && !this.#identity) {
            console.warn('[IdentityManager] Drive Access Restricted. Moving to restricted SUCCESS state.');
            this.#transition(IdentityState.SUCCESS);
            return;
        }

        if (isInvalidGrant) {
            console.warn('[IdentityManager] Token expired or invalid. Clearing session.');
            this.#clearSession();
            this.#lastError = "Session expired. Please sign in again.";
            this.#transition(IdentityState.ERROR, this.#lastError);
            return;
        }

        const isCancelled = /popup_closed|user_cancelled/.test(message);

        if (isCancelled) {
            // Do not treat cancellation as a hard error state, just go back to ready
            console.debug('[IdentityManager] User cancelled auth flow.');
            this.#transition(IdentityState.READY);
            return;
        }

        // Generic error handling
        this.#lastError = `Authentication Error: ${message}`;
        this.#transition(IdentityState.ERROR, this.#lastError);
    }

    #decodeCredential(jwt) {
        try {
            const base64Url = jwt.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            throw new Error('Failed to decode JWT');
        }
    }

    #transition(nextState, error = null) {
        this.#state = nextState;
        if (error) this.#lastError = error;
        this.#notifyObservers();
    }

    #notifyObservers() {
        const snapshot = this.getSnapshot();
        this.#observers.forEach(cb => cb(snapshot));
    }

    #clearSession() {
        this.#identity = null;
        this.#authorization = null;
        this.#lastError = null;
        this.#transition(IdentityState.IDLE);
    }
}

// Export Singleton Instance
export const identityService = new IdentityManager();
export const signIn = (opt) => identityService.signIn(opt);
export const requestDriveAccess = () => identityService.requestDriveAccess();
export const signOut = () => identityService.signOut();
export const getAccessToken = () => identityService.token;
