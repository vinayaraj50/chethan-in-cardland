/**
 * Google Drive API Service
 * Handles file storage and collaboration.
 */

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';

const getHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
});

/**
 * List all flashcard stacks (JSON files) that the user has access to.
 */
export const listStacks = async (token) => {
    const query = "mimeType = 'application/json' and name contains 'flashcard_stack_' and trashed = false";
    const response = await fetch(`${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=files(id, name, owners, permissions)`, {
        headers: getHeaders(token),
    });
    const data = await response.json();

    const stacks = await Promise.all(
        data.files.map(async (file) => {
            const content = await getFileContent(token, file.id);
            return { ...content, driveFileId: file.id };
        })
    );
    return stacks;
};

/**
 * Get content of a specific file.
 */
export const getFileContent = async (token, fileId) => {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
        headers: getHeaders(token),
    });
    return await response.json();
};

/**
 * Create or Update a Flashcard Stack.
 */
export const saveStack = async (token, stack, fileId = null) => {
    const metadata = {
        name: `flashcard_stack_${stack.id}.json`,
        mimeType: 'application/json',
    };

    const url = fileId
        ? `${UPLOAD_API_URL}/${fileId}?uploadType=multipart`
        : `${UPLOAD_API_URL}?uploadType=multipart`;

    const method = fileId ? 'PATCH' : 'POST';

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const body = delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(stack) +
        close_delim;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                ...getHeaders(token),
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google Drive API Error:', errorData);
            throw new Error(errorData.error?.message || 'Failed to save to Google Drive');
        }

        return await response.json();
    } catch (error) {
        console.error('saveStack Error:', error);
        throw error;
    }
};

/**
 * Share stack with another user.
 */
export const shareStack = async (token, fileId, email, role = 'reader') => {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}/permissions`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({
            role,
            type: 'user',
            emailAddress: email,
        }),
    });
    return await response.json();
};

/**
 * Delete a specific stack.
 */
export const deleteStack = async (token, fileId) => {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}`, {
        method: 'DELETE',
        headers: getHeaders(token),
    });
    if (!response.ok) {
        throw new Error('Failed to delete stack');
    }
    return true;
};

/**
 * Delete all data (Dangerous!)
 */
export const deleteAllData = async (token) => {
    const query = "name contains 'flashcard_' and trashed = false";
    const response = await fetch(`${DRIVE_API_URL}?q=${encodeURIComponent(query)}`, {
        headers: getHeaders(token),
    });
    const data = await response.json();

    await Promise.all(
        data.files.map((file) =>
            fetch(`${DRIVE_API_URL}/${file.id}`, {
                method: 'DELETE',
                headers: getHeaders(token),
            })
        )
    );
};
