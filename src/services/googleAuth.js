import { auth } from './firebase';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { sessionManager } from './sessionManager';

/**
 * @fileoverview IdentityManager - 2026 Enterprise OAuth 2.0 Identity Subsystem.
 * 
 * DESIGN PRINCIPLES:
 * 1. Firebase SDK Authentication: Official, secure, and production-ready.
 * 2. SignInWithPopup: Recommended for web apps (avoids COOP/COEP issues).
 * 3. Drive Access: Scoped specifically for 'drive.file'.
 * 4. Reactive State: Observer pattern for UI updates.
 * 5. Session Isolation: Controlled by SessionManager.
 */

// ... (existing code for IdentityState and SCOPES) ...

// Methods removed - they belong inside the class below
export const IdentityState = {
    IDLE: 'IDLE',
    INITIALIZING: 'INITIALIZING',
    READY: 'READY',
    AUTHENTICATING: 'AUTHENTICATING',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR'
};

const SCOPES = [
    'https://www.googleapis.com/auth/drive.file'
];

class IdentityManager {
    static #instance = null;

    #state = IdentityState.IDLE;
    #lastError = null;
    #observers = new Set();
    #identity = null;
    #authorization = null;
    #initPromise = null;
    #isInitialized = false;

    constructor() {
        if (IdentityManager.#instance) {
            return IdentityManager.#instance;
        }
        IdentityManager.#instance = this;
    }

    subscribe(callback) {
        this.#observers.add(callback);
        callback(this.getSnapshot());
        return () => this.#observers.delete(callback);
    }

    getSnapshot() {
        return {
            user: this.user,
            status: this.#state,
            error: this.#lastError,
            token: this.#authorization?.token,
            hasDrive: this.hasDriveAccess
        };
    }

    get state() { return this.#state; }
    get error() { return this.#lastError; }
    get user() {
        if (!this.#identity && !auth.currentUser) return null;
        const baseUser = this.#identity || this.#mapUser(auth.currentUser);
        return {
            ...baseUser,
            token: this.#authorization?.token
        };
    }
    get token() { return this.#authorization?.token; }
    get uid() { return auth.currentUser?.uid || this.#identity?.id; }
    get hasDriveAccess() { return !!this.#authorization?.token; }

    async initialize() {
        if (this.#initPromise) return this.#initPromise;

        this.#initPromise = (async () => {
            this.#transition(IdentityState.INITIALIZING);

            try {
                // 1. Check for Redirect Result (Mobile/Fallback flow)
                const result = await getRedirectResult(auth);
                if (result) {
                    const credential = GoogleAuthProvider.credentialFromResult(result);
                    await this.#handleAuthSuccess(result.user, credential);
                } else if (auth.currentUser) {
                    // 2. Restore from Firebase persistence
                    console.info('[IdentityManager] User restored from Firebase persistence.');
                    this.#identity = this.#mapUser(auth.currentUser);

                    // SECURITY: Initialize Session immediately on restore
                    sessionManager.startSession(this.#identity.id);

                    // 2026 Strategy: Silently attempt to re-acquire Drive token
                    // Since tokens are short-lived and NOT persisted by Firebase Auth,
                    // we must try to get a fresh one if possible.
                    // This is critical for 'My Lessons' persistence on refresh.
                    try {
                        console.info('[IdentityManager] Attempting silent Drive token restoration...');
                        // Note: Silent re-auth with 'none' might fail in some environments
                        // but we try it to keep user experience seamless.
                        // We use the last used scope.
                        await this.signIn({ prompt: 'none' });
                    } catch (e) {
                        console.warn('[IdentityManager] Silent Drive token restoration skipped/failed:', e.message);
                        // We don't fail initialization just because token restoration failed;
                        // user is still logged in, but Drive won't work until they click 'Sign In' or 'Buy'.
                    }
                }
            } catch (error) {
                console.error('[IdentityManager] Initialization Error:', error);
                this.#handleSystemError(error);
            }

            this.#isInitialized = true;
            this.#transition(this.#identity ? IdentityState.SUCCESS : IdentityState.READY);
        })();
        return this.#initPromise;
    }

    /**
     * Ensures a valid Drive token is available.
     * Attempts silent re-acquisition if missing.
     */
    async ensureDriveAccess() {
        if (this.#authorization?.token) {
            // Check expiry with 5-min buffer
            if (this.#authorization.expiresAt > Date.now() + 300000) {
                return this.#authorization.token;
            }
        }

        console.info('[IdentityManager] Drive token missing/stale. Re-acquiring...');
        // prompt: 'none' for silent attempt
        try {
            await this.signIn({ prompt: 'none' });
            return this.#authorization?.token;
        } catch (e) {
            console.warn('[IdentityManager] Silent re-acquisition failed. User action required.');
            throw e; // Let caller decide (usually trigger reauth UI)
        }
    }

    async signIn(options = { prompt: 'select_account' }) {
        this.#transition(IdentityState.AUTHENTICATING);

        const provider = new GoogleAuthProvider();
        SCOPES.forEach(scope => provider.addScope(scope));

        // Force account selection/consent if requested
        if (options.prompt) {
            provider.setCustomParameters({ prompt: options.prompt });
        }

        try {
            // Try popup first (desktop-friendly, better UX in 2026)
            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            await this.#handleAuthSuccess(result.user, credential);
        } catch (error) {
            console.error('[IdentityManager] Sign-In Failed:', error.code, error.message);

            // Handle specific error cases with user-friendly messages
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    // User closed the popup - not an error, just cancelled
                    this.#transition(this.#identity ? IdentityState.SUCCESS : IdentityState.READY);
                    return; // Silent return, no error

                case 'auth/popup-blocked':
                    this.#lastError = 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';
                    break;

                case 'auth/cancelled-popup-request':
                    // Another popup is already open
                    this.#transition(IdentityState.READY);
                    return;

                case 'auth/network-request-failed':
                    this.#lastError = 'Network error. Please check your internet connection.';
                    break;

                default:
                    this.#lastError = `Authentication failed: ${error.message}`;
            }

            this.#transition(IdentityState.ERROR, this.#lastError);
        }
    }

    async requestDriveAccess() {
        return this.signIn({ prompt: 'consent' });
    }

    async signOut() {
        try {
            await firebaseSignOut(auth);
            this.#clearSession();
        } catch (e) {
            console.error('[IdentityManager] SignOut Error:', e);
            this.#handleSystemError(e);
        }
    }

    async #handleAuthSuccess(user, credential) {
        this.#identity = this.#mapUser(user);

        // SECURITY: Start isolated session
        sessionManager.startSession(user.uid);

        // IMPORTANT: We must capture the Access Token from the Credential immediately.
        // Firebase Auth persists the ID Token (auth), but NOT the Google Access Token (Drive).
        // This token is needed for the cloud-storage integration to write to Drive.
        if (credential?.accessToken) {
            this.#authorization = {
                token: credential.accessToken,
                // OAuth access tokens typically expire in 1 hour
                expiresAt: Date.now() + 3600 * 1000
            };
        } else {
            console.warn('[IdentityManager] No Access Token returned. Drive access may fail.');
        }

        this.#transition(IdentityState.SUCCESS);
        console.info('[IdentityManager] Enterprise Login Success:', user.uid);
    }

    #mapUser(user) {
        if (!user) return null;
        return {
            id: user.uid,
            name: user.displayName,
            email: user.email,
            picture: user.photoURL,
            uid: user.uid // Ensure compatibility with views expecting 'uid'
        };
    }

    #handleSystemError(error) {
        this.#lastError = `Authentication Error: ${error.message || String(error)}`;
        this.#transition(IdentityState.ERROR, this.#lastError);
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
        // SECURITY: Delegate cleanup to SessionManager
        sessionManager.endSession();
        this.#transition(IdentityState.IDLE);
    }
}

export const identityService = new IdentityManager();
export const signIn = (opt) => identityService.signIn(opt);
export const requestDriveAccess = () => identityService.requestDriveAccess();
export const signOut = () => identityService.signOut();
export const getAccessToken = () => identityService.token;

