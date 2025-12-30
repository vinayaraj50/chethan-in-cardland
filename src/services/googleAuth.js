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
                throw response;
            }
            // SECURITY FIX (VULN-001): Store token only in memory, not localStorage
            accessToken = response.access_token;
            tokenExpiresAt = Date.now() + (response.expires_in * 1000);

            // Check if drive.file scope was actually granted
            const hasDrivePermission = response.scope.includes('https://www.googleapis.com/auth/drive.file');

            fetchUserProfile(accessToken, (profile) => {
                onAuthUpdate({ ...profile, token: accessToken, hasDrivePermission });
            });
        },
    });

    // SECURITY FIX (VULN-001, VULN-002): Removed localStorage token/profile restoration
    // Users must re-authenticate on page refresh for maximum security
    // This prevents XSS attacks from stealing tokens
};

const fetchUserProfile = async (token, onAuthUpdate) => {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const profile = await response.json();
        // SECURITY FIX (VULN-002): Store profile in memory only, not localStorage
        userProfile = profile;
        onAuthUpdate({ ...profile, token });
    } catch (error) {
        // SECURITY FIX (VULN-006): Don't log error details to console
        // If token is invalid, clear it
        signOut(onAuthUpdate);
    }
};

export const isTokenExpired = () => {
    // SECURITY FIX (VULN-001): Use memory-based expiry
    if (!tokenExpiresAt) return true;
    // Buffer of 5 minutes before actual expiration
    return Date.now() > (tokenExpiresAt - 5 * 60 * 1000);
};

export const getAccessToken = () => {
    // SECURITY FIX (VULN-001): Return token from memory only
    if (isTokenExpired()) return null;
    return accessToken;
};

export const signIn = (prompt = 'consent') => {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt });
    }
};

export const signOut = (onAuthUpdate) => {
    // SECURITY FIX (VULN-001, VULN-002): No localStorage to clean up

    // SECURITY FIX (VULN-007): Add error handling for token revocation
    if (accessToken && window.google) {
        try {
            window.google.accounts.oauth2.revoke(accessToken, (response) => {
                // Token revoked successfully or revocation attempted
                accessToken = null;
                tokenExpiresAt = null;
                userProfile = null;
                onAuthUpdate(null);
            });
        } catch (error) {
            // Even if revocation fails, clear local state
            accessToken = null;
            tokenExpiresAt = null;
            userProfile = null;
            onAuthUpdate(null);
        }
    } else {
        accessToken = null;
        tokenExpiresAt = null;
        userProfile = null;
        onAuthUpdate(null);
    }
};
