/**
 * Public Google Drive API Service
 * Handles fetching files from a public folder using an API Key.
 */

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

export const listPublicStacks = async (apiKey, folderId) => {
    // Query for JSON files in the specific folder that are not trashed
    const query = `'${folderId}' in parents and mimeType = 'application/json' and trashed = false`;
    const fields = 'files(id, name, createdTime, modifiedTime)';
    const url = `${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to list public stacks');
    }

    const data = await response.json();
    return data.files || [];
};

export const getPublicFileContent = async (apiKey, fileId) => {
    const url = `${DRIVE_API_URL}/${fileId}?alt=media&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch public file content');
    }

    return await response.json();
};
