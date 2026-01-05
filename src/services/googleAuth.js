/**
 * Google Identity Services handles the authentication.
 * We use the 'Implicit Grant' flow for simplicity in a client-side app.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

let tokenClient;
let accessToken = null;
let tokenExpiresAt = null;
let userProfile = null;

export const initGoogleAuth = (onAuthUpdate) => {
    // Check if google object and expected oauth2 namespace are present
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        console.warn('Google Identity Services not fully loaded yet.');
        return;
    }

    // Initialize token client
    try {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                if (response.error !== undefined) {
                    console.error("Auth Error:", response);
                    return;
                }

                // Store token only in memory for security (prevents XSS persistence)
                accessToken = response.access_token;
                tokenExpiresAt = Date.now() + (response.expires_in * 1000);

                // Check if drive.file scope was actually granted
                const hasDrivePermission = response.scope.includes('https://www.googleapis.com/auth/drive.file');

                fetchUserProfile(accessToken, (profile) => {
                    onAuthUpdate({ ...profile, token: accessToken, hasDrivePermission });
                });
            },
        });
        console.log('Google Auth initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize token client:', error);
    }
};

const fetchUserProfile = async (token, onAuthUpdate) => {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch user profile');

        const profile = await response.json();
        userProfile = profile;
        onAuthUpdate({ ...profile, token });
    } catch (error) {
        // If token is invalid, clear it
        signOut(onAuthUpdate);
    }
};

export const isTokenExpired = () => {
    if (!tokenExpiresAt) return true;
    // Buffer of 5 minutes before actual expiration
    return Date.now() > (tokenExpiresAt - 5 * 60 * 1000);
};

export const getAccessToken = () => {
    if (isTokenExpired()) return null;
    return accessToken;
};

const loadGSIScript = () => {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

export const signIn = (prompt = 'consent', retryCount = 0, onAuthUpdate = null, onError = null) => {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt });
    } else {
        // If google is available but tokenClient is not, try one last time to init
        if (window.google?.accounts?.oauth2 && onAuthUpdate) {
            initGoogleAuth(onAuthUpdate);
            if (tokenClient) {
                tokenClient.requestAccessToken({ prompt });
                return;
            }
        }

        if (retryCount < 3) {
            if (!window.google) loadGSIScript().catch(() => { });
            setTimeout(() => signIn(prompt, retryCount + 1, onAuthUpdate, onError), 1000);
        } else if (retryCount < 6) {
            setTimeout(() => signIn(prompt, retryCount + 1, onAuthUpdate, onError), 1500);
        } else {
            const isEdge = /Edg/.test(navigator.userAgent);
            const message = isEdge
                ? "Connectivity Notice: Your browser's 'Strict' Tracking Prevention is preventing the secure sign-in service from loading. This is a privacy setting, not an ad-blocker issue. Please set it to 'Balanced' for this site or add an exception to continue."
                : "Connectivity Notice: We're unable to load the secure sign-in service. This usually happens when browser privacy settings or security extensions are too restrictive. Please check your settings and refresh the page.";

            console.error('Google Auth initialization failed:', message);
            if (onError) onError(message);
            else alert(message);
        }
    }
};

export const signOut = (onAuthUpdate) => {
    if (accessToken && window.google) {
        try {
            window.google.accounts.oauth2.revoke(accessToken, () => {
                clearSession(onAuthUpdate);
            });
        } catch (error) {
            clearSession(onAuthUpdate);
        }
    } else {
        clearSession(onAuthUpdate);
    }
};

const clearSession = (onAuthUpdate) => {
    accessToken = null;
    tokenExpiresAt = null;
    userProfile = null;
    if (onAuthUpdate) onAuthUpdate(null);
};
