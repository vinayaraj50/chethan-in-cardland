/**
 * Public Google Drive API Service
 * Handles fetching files from a public folder using the Google API Client Library (gapi).
 * We use gapi instead of raw fetch to avoid CORS issues with 'alt=media' downloads.
 */

import { APPS_SCRIPT_URL as CONFIG_SCRIPT_URL } from '../constants/config';

export const APPS_SCRIPT_URL = CONFIG_SCRIPT_URL;

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

export const getPublicFileContent = async (apiKey, fileId, token = null, skipLocal = false) => {
    // 1. Try Google Apps Script Proxy first (Primary & Latest Version)
    // This ensures that any edits made by the admin on Drive are reflected immediately.
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?id=${fileId}&t=${Date.now()}`);

        if (response.ok) {
            const data = await response.json();
            if (data && !data.error) {
                // console.log("Success: Fetched latest content from Drive");
                return data;
            }
        }
    } catch (e) {
        // Silently proceed to fallback
    }

    // 2. Fallback to Local/GitHub Pages (Bundled content)
    // We try the local folder if Drive fetch failed or was skipped.
    const localUrl = `./stacks/${fileId}.json`;

    if (!skipLocal) {
        try {
            const response = await fetch(localUrl);
            const contentType = response.headers.get("content-type");

            if (response.ok && contentType && contentType.includes("application/json")) {
                // console.log("Found local backup stack file!");
                return await response.json();
            }
        } catch (e) {
            // Ignore local fetch errors
        }
    }

    return null;
};

export const getPublicIndex = async (apiKey, folderId) => {
    // Try to fetch the index file
    // We first need to find the file ID of 'public_index.json'
    try {
        await initGapiClient(apiKey);
        const response = await window.gapi.client.drive.files.list({
            q: `'${folderId}' in parents and name = 'public_index.json' and trashed = false`,
            fields: 'files(id, name)',
        });

        const files = response.result.files;
        if (files && files.length > 0) {
            // Found the index file, now fetch its content with cache busting
            const indexId = files[0].id;
            const url = `${APPS_SCRIPT_URL}?id=${indexId}&t=${Date.now()}`;
            const fetchResponse = await fetch(url);
            if (fetchResponse.ok) {
                return await fetchResponse.json();
            }
            return null;
        }
        return null;
    } catch (error) {
        console.error('Error fetching public index:', error);
        return null;
    }
};
