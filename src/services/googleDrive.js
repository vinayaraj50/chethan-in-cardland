/**
 * Google Drive API Service
 * Handles file storage and collaboration.
 */

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';

// In-memory cache for file contents to avoid redundant fetches
const fileContentCache = new Map();

const getHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
});

/**
 * List all flashcard stacks (JSON files) that the user has access to.
 */
export const listStacks = async (token) => {
    const query = "mimeType = 'application/json' and name contains 'flashcard_stack_' and trashed = false";
    const fields = 'files(id, name, owners, permissions, ownedByMe, sharingUser, starred, createdTime, modifiedTime)';
    const url = `${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=${fields}&supportsAllDrives=true&includeItemsFromAllDrives=true&spaces=drive`;

    const response = await fetch(url, {
        headers: getHeaders(token),
    });

    if (response.status === 401) {
        throw new Error('REAUTH_NEEDED');
    }

    const data = await response.json();

    if (!data.files) return [];

    const stacks = await Promise.all(
        data.files.map(async (file) => {
            try {
                // Check cache first
                const cacheKey = file.id;
                const cached = fileContentCache.get(cacheKey);

                // If cached and modified time matches, return cached content
                if (cached && cached.modifiedTime === file.modifiedTime) {
                    return {
                        ...cached.content,
                        driveFileId: file.id,
                        ownedByMe: file.ownedByMe,
                        ownerName: file.owners?.[0]?.displayName,
                        sharingUser: file.sharingUser,
                        isAccepted: file.ownedByMe || file.starred
                    };
                }

                const content = await getFileContent(token, file.id);

                // Update cache
                fileContentCache.set(cacheKey, {
                    content,
                    modifiedTime: file.modifiedTime
                });

                return {
                    ...content,
                    driveFileId: file.id,
                    ownedByMe: file.ownedByMe,
                    ownerName: file.owners?.[0]?.displayName,
                    sharingUser: file.sharingUser,
                    isAccepted: file.ownedByMe || file.starred
                };
            } catch (error) {
                // SECURITY FIX (VULN-006): Don't log error details
                return {
                    id: file.id,
                    title: file.name.replace('flashcard_stack_', '').replace('.json', '') || 'Shared Stack',
                    driveFileId: file.id,
                    ownedByMe: file.ownedByMe,
                    ownerName: file.owners?.[0]?.displayName,
                    sharingUser: file.sharingUser,
                    isAccepted: file.ownedByMe || file.starred,
                    cards: [],
                    error: true
                };
            }
        })
    );
    return stacks.filter(stack => stack !== null);
};







/**
 * Get content of a specific file.
 */
export const getFileContent = async (token, fileId) => {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
        headers: getHeaders(token),
    });

    if (response.status === 401) {
        throw new Error('REAUTH_NEEDED');
    }

    return await response.json();
};

/**
 * Generic function to Save a File to Google Drive.
 */
export const saveFile = async (token, name, content, fileId = null, mimeType = 'application/json') => {
    const metadata = {
        name: name,
        mimeType: mimeType,
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
        (typeof content === 'string' ? content : JSON.stringify(content)) +
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

        if (response.status === 401) {
            throw new Error('REAUTH_NEEDED');
        }

        if (!response.ok) {
            const errorData = await response.json();
            // SECURITY FIX (VULN-006): Don't log API error responses
            throw new Error(errorData.error?.message || 'Failed to save to Google Drive');
        }

        const result = await response.json();

        // Update cache with the new content
        fileContentCache.set(result.id, {
            content: content,
            modifiedTime: result.modifiedTime || new Date().toISOString()
        });

        return result;
    } catch (error) {
        // SECURITY FIX (VULN-006): Don't log error details
        throw error;
    }
};

/**
 * Create or Update a Flashcard Stack.
 */
export const saveStack = async (token, stack, fileId = null) => {
    return saveFile(token, `flashcard_stack_${stack.id}.json`, stack, fileId);
};

/**
 * Save Global Ad Config (Admin only)
 */
export const saveGlobalAdConfig = async (token, config, fileId = null) => {
    const result = await saveFile(token, 'app_global_ad_config.json', config, fileId);

    // After saving, ensure it's shared with "anyone" as a reader
    try {
        await fetch(`${DRIVE_API_URL}/${result.id}/permissions`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify({
                role: 'reader',
                type: 'anyone',
            }),
        });
    } catch (e) {
        console.warn('Failed to set global permissions:', e);
    }

    return result;
};

/**
 * Search for the global ad config file.
 */
export const findGlobalAdConfig = async (token) => {
    const query = "name = 'app_global_ad_config.json' and trashed = false";
    const url = `${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=files(id, name, modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const response = await fetch(url, {
        headers: getHeaders(token),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.files?.[0] || null;
};

/**
 * Share a file with another user (used for feedback).
 */
export const shareStack = async (token, fileId, email, role = 'reader', message = '') => {
    const body = {
        role,
        type: 'user',
        emailAddress: email,
    };

    if (message) {
        body.emailMessage = message;
    }

    const response = await fetch(`${DRIVE_API_URL}/${fileId}/permissions?sendNotificationEmail=true`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json();
        // SECURITY FIX (VULN-006): Don't log API error responses
        throw new Error(errorData.error?.message || 'Failed to share file');
    }

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
