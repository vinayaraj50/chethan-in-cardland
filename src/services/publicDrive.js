/**
 * Public Google Drive API Service
 * Handles fetching files from a public folder using the Google API Client Library (gapi).
 * We use gapi instead of raw fetch to avoid CORS issues with 'alt=media' downloads.
 */

export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyx1eOsk18mZMgMpaLLKm_2N2R42k8v8e9bTvbJF9kpcfBcPhwf2-XYWzG-1BTKnpV50g/exec';

let gapiInitialized = false;
let gapiInitPromise = null;

const initGapiClient = (apiKey) => {
    if (gapiInitialized) return Promise.resolve();
    if (gapiInitPromise) return gapiInitPromise;

    gapiInitPromise = new Promise((resolve, reject) => {
        let attempts = 0;
        const checkGapi = () => {
            if (window.gapi) {
                window.gapi.load('client', async () => {
                    try {
                        await window.gapi.client.init({
                            apiKey: apiKey,
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                        });
                        gapiInitialized = true;
                        resolve();
                    } catch (error) {
                        console.error('Failed to initialize GAPI client:', error);
                        reject(error);
                    }
                });
            } else {
                attempts++;
                if (attempts > 20) { // 10 seconds
                    reject(new Error('Google API Script not loaded (timeout)'));
                } else {
                    setTimeout(checkGapi, 500);
                }
            }
        };
        checkGapi();
    });

    return gapiInitPromise;
};

export const listPublicStacks = async (apiKey, folderId) => {
    try {
        await initGapiClient(apiKey);

        // Temporarily remove user token to ensure we access as "Public"
        // Logged in users with 'drive.file' scope CANNOT access public files via API if the token is attached.
        const userToken = window.gapi.client.getToken();
        if (userToken) window.gapi.client.setToken(null);

        try {
            const response = await window.gapi.client.drive.files.list({
                q: `'${folderId}' in parents and mimeType = 'application/json' and trashed = false`,
                fields: 'files(id, name, createdTime, modifiedTime)',
            });
            return response.result.files || [];
        } finally {
            // Restore token if it existed
            if (userToken) window.gapi.client.setToken(userToken);
        }

    } catch (error) {
        console.error('Error listing public stacks:', error);
        return [];
    }
};

export const getPublicFileContent = async (apiKey, fileId) => {
    // 1. Local/GitHub Pages Fetch (Primary & Most Reliable)
    // We try to fetch the file from the local 'public/stacks' folder first.
    // This allows for instant loading of "bundled" stacks without hitting the server.
    const localUrl = `./stacks/${fileId}.json`;

    try {
        const response = await fetch(localUrl);
        const contentType = response.headers.get("content-type");

        if (response.ok && contentType && contentType.includes("application/json")) {
            // console.log("Found local stack file!");
            return await response.json();
        }
    } catch (e) {
        // Ignore local fetch errors, proceed to script
    }

    // 2. Google Apps Script Proxy (Scalable Solution)
    // Fetches directly from Drive using the owner's permission, bypassing CORS/Auth issues.
    // console.log(`Fetching ${fileId} via Apps Script Proxy...`);

    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?id=${fileId}`);

        if (!response.ok) {
            throw new Error(`Script returned ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            console.error('Apps Script returned API error:', data.error);
            return null;
        }

        return data;

    } catch (e) {
        console.error('Apps Script fetch failed:', e);
        return null;
    }
};
