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

    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
            if (response.error !== undefined) {
                throw response;
            }
            accessToken = response.access_token;
            // Fetch user profile info
            fetchUserProfile(accessToken, onAuthUpdate);
        },
    });
};

const fetchUserProfile = async (token, onAuthUpdate) => {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const profile = await response.json();
        onAuthUpdate({ ...profile, token });
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
};

export const signIn = () => {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
};

export const signOut = (onAuthUpdate) => {
    if (accessToken) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
            accessToken = null;
            onAuthUpdate(null);
        });
    } else {
        onAuthUpdate(null);
    }
};
