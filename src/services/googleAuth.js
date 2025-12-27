/**
 * Google Identity Services handles the authentication.
 * We use the 'Implicit Grant' flow for simplicity in a client-side app.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

let tokenClient;
let accessToken = null;

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
            accessToken = response.access_token;
            const expiresAt = Date.now() + (response.expires_in * 1000);
            localStorage.setItem('google_access_token', accessToken);
            localStorage.setItem('google_token_expires_at', expiresAt);
            fetchUserProfile(accessToken, onAuthUpdate);
        },
    });

    // Check for existing token
    const storedToken = localStorage.getItem('google_access_token');
    const expiresAt = localStorage.getItem('google_token_expires_at');
    const storedProfile = localStorage.getItem('google_user_profile');

    if (storedToken && expiresAt && Date.now() < parseInt(expiresAt)) {
        accessToken = storedToken;
        if (storedProfile) {
            onAuthUpdate({ ...JSON.parse(storedProfile), token: accessToken });
        } else {
            fetchUserProfile(accessToken, onAuthUpdate);
        }
    }
};

const fetchUserProfile = async (token, onAuthUpdate) => {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const profile = await response.json();
        localStorage.setItem('google_user_profile', JSON.stringify(profile));
        onAuthUpdate({ ...profile, token });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        // If token is invalid, clear it
        signOut(onAuthUpdate);
    }
};

export const isTokenExpired = () => {
    const expiresAt = localStorage.getItem('google_token_expires_at');
    if (!expiresAt) return true;
    // Buffer of 5 minutes before actual expiration
    return Date.now() > (parseInt(expiresAt) - 5 * 60 * 1000);
};

export const getAccessToken = () => {
    if (isTokenExpired()) return null;
    return accessToken || localStorage.getItem('google_access_token');
};

export const signIn = (prompt = 'consent') => {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt });
    }
};

export const signOut = (onAuthUpdate) => {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expires_at');
    localStorage.removeItem('google_user_profile');

    if (accessToken && window.google) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
            accessToken = null;
            onAuthUpdate(null);
        });
    } else {
        accessToken = null;
        onAuthUpdate(null);
    }
};
