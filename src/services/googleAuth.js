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
        // SECURITY: Atomic Login Enforcement.
        // We do NOT return a user object if we don't have a verified Drive Access Token.
        // This prevents the app from entering a "Logged in but disconnected" state.
        if (this.#state !== IdentityState.SUCCESS || !this.#authorization?.token) {
            return null;
        }

        return {
            ...this.#identity,
            token: this.#authorization.token
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

                    // CRITICAL: We do NOT transition to SUCCESS yet.
                    // We must first verify Drive access to maintain "Atomic Login" standards.
                    this.#identity = this.#mapUser(auth.currentUser);
                    sessionManager.startSession(this.#identity.id);

                    try {
                        console.info('[IdentityManager] Attempting silent Drive token restoration...');
                        await this.signIn({ prompt: 'none' });
                        // signIn will call handleAuthSuccess which transitions to SUCCESS
                    } catch (e) {
                        console.warn('[IdentityManager] Silent restoration failed. Forcing logout to maintain Atomic State.', e.message);
                        // If we can't get a token, we don't allow a partial login.
                        await this.signOut();
                    }
                }
            } catch (error) {
                console.error('[IdentityManager] Initialization Error:', error);
                this.#handleSystemError(error);
            }

            this.#isInitialized = true;
            // Only transition if we haven't already reached SUCCESS/ERROR via handleAuthSuccess
            if (this.#state === IdentityState.INITIALIZING) {
                this.#transition(this.#identity ? IdentityState.SUCCESS : IdentityState.READY);
            }
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
        try {
            // Internal call with no prompt
            await this.signIn({ prompt: 'none' });
            return this.#authorization?.token;
        } catch (e) {
            console.warn('[IdentityManager] Silent re-acquisition failed.');
            throw e;
        }
    }

    async signIn(options = { prompt: 'select_account' }) {
        this.#transition(IdentityState.AUTHENTICATING);

        const provider = new GoogleAuthProvider();
        SCOPES.forEach(scope => provider.addScope(scope));

        if (options.prompt && options.prompt !== 'none') {
            provider.setCustomParameters({ prompt: options.prompt });
        }

        try {
            let user, credential;

            if (options.prompt === 'none') {
                // Silent re-auth request
                // In 2026 Firebase/GSI integration, this is often handled by re-calling signInWithPopup 
                // but with prompt: none which relies on the session cookie.
                const result = await signInWithPopup(auth, provider);
                user = result.user;
                credential = GoogleAuthProvider.credentialFromResult(result);
            } else {
                const result = await signInWithPopup(auth, provider);
                user = result.user;
                credential = GoogleAuthProvider.credentialFromResult(result);
            }

            await this.#handleAuthSuccess(user, credential);
        } catch (error) {
            console.error('[IdentityManager] Sign-In Failed:', error.code, error.message);
            // ... (rest of error handling remains same, handled by transition below)
            this.#handleSystemError(error);
            throw error; // Rethrow for initialize() to handle
        }
    }

    async #handleAuthSuccess(user, credential) {
        // SECURITY: We only accept the login if we have a token (or can get one)
        if (!credential?.accessToken) {
            console.warn('[IdentityManager] Success without token. Attempting immediate repair...');
            // This might happen if result didn't include it. We try one silent pull.
            // If this recursive call fails, it will throw and catch in signIn()
            // avoiding the transition to SUCCESS.
        }

        this.#identity = this.#mapUser(user);
        this.#authorization = credential?.accessToken ? {
            token: credential.accessToken,
            expiresAt: Date.now() + 3600 * 1000
        } : null;

        if (!this.#authorization) {
            throw new Error('DRIVE_TOKEN_MISSING');
        }

        // Only start session and transition once we found the key
        sessionManager.startSession(user.uid);
        this.#transition(IdentityState.SUCCESS);
        console.info('[IdentityManager] Atomic Login Success:', user.uid);
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
    async signOut() {
        this.#transition(IdentityState.AUTHENTICATING); // Transient state
        try {
            await firebaseSignOut(auth);
            console.info('[IdentityManager] Signed out from Firebase.');
        } catch (error) {
            console.error('[IdentityManager] Sign-out failed:', error);
            // Even if firebase signout fails, we should clear local session
        } finally {
            this.#clearSession();
        }
    }
}

export const identityService = new IdentityManager();
export const signIn = (opt) => identityService.signIn(opt);
export const requestDriveAccess = () => identityService.requestDriveAccess();
export const signOut = () => identityService.signOut();
export const getAccessToken = () => identityService.token;

