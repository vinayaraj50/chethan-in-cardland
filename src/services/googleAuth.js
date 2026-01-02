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
    if (!window.google) return;

    // Initialize token client
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

export const signIn = (prompt = 'consent') => {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt });
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
