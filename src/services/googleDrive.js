/**
 * Google Drive API Service
 * Handles file storage and collaboration.
 */

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';

// Persistent cache for stack contents to avoid redundant fetches
const CACHE_KEY = 'cic_stack_content_cache';

const getPersistentCache = () => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return new Map();
        const data = JSON.parse(cached);
        return new Map(Object.entries(data));
    } catch (e) {
        console.warn('Failed to load persistent cache:', e);
        return new Map();
    }
};

const savePersistentCache = (cacheMap) => {
    try {
        // Simple size management: if map has more than 50 items, remove oldest (lowest ID)
        if (cacheMap.size > 50) {
            const keys = Array.from(cacheMap.keys());
            // Sort by creation time if we had it, but for now just take the first few
            const keysToRemove = keys.slice(0, cacheMap.size - 50);
            keysToRemove.forEach(k => cacheMap.delete(k));
        }

        const data = Object.fromEntries(cacheMap);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded, clearing cache...');
            localStorage.removeItem(CACHE_KEY);
        }
    }
};

let fileContentCache = getPersistentCache();

/**
 * Clear cache for a specific file ID
 * Used after editing to ensure fresh data is loaded
 */
export const clearStackCache = (fileId) => {
    if (fileId) {
        fileContentCache.delete(fileId);
        savePersistentCache(fileContentCache);
    }
};

const getHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
});

import { resilientFetch } from '../utils/resilientFetch';

/**
 * List all flashcard stacks metadata (ID, Name, ModifiedTime) without fetching full content.
 * This is much faster and allows for progressive loading.
 */
export const listStackMetadata = async (token) => {
    const query = "mimeType = 'application/json' and name contains 'flashcard_stack_' and trashed = false";
    const fields = 'files(id, name, owners, permissions, ownedByMe, sharingUser, starred, createdTime, modifiedTime, appProperties)';
    const url = `${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=${fields}&supportsAllDrives=true&includeItemsFromAllDrives=true&spaces=drive&t=${Date.now()}`;

    const response = await resilientFetch(url, {
        headers: getHeaders(token),
        _isElevated: true
    });

    if (response.status === 401) {
        throw new Error('REAUTH_NEEDED');
    }

    const data = await response.json();
    return data.files || [];
};

/**
 * Check if a stack is in the local cache and valid.
 */
export const getCachedStack = (fileId, modifiedTime) => {
    const cached = fileContentCache.get(fileId);
    if (cached && cached.modifiedTime === modifiedTime) {
        return {
            ...cached.content,
            driveFileId: fileId,
            // Additional metadata that might be lost in simple content cache
            _isCached: true
        };
    }
    return null;
};

/**
 * Fetch full content for a single stack and update cache.
 */
export const fetchStackContent = async (token, file) => {
    try {
        // Check cache one more time in case of race conditions
        const cached = getCachedStack(file.id, file.modifiedTime);
        if (cached) return {
            ...cached,
            ownedByMe: file.ownedByMe,
            ownerName: file.owners?.[0]?.displayName,
            sharingUser: file.sharingUser,
            isAccepted: file.ownedByMe || file.starred
        };

        const content = await getFileContent(token, file.id);

        // Update cache
        fileContentCache.set(file.id, {
            content,
            modifiedTime: file.modifiedTime
        });
        savePersistentCache(fileContentCache);

        return {
            ...content,
            driveFileId: file.id,
            ownedByMe: file.ownedByMe,
            ownerName: file.owners?.[0]?.displayName,
            sharingUser: file.sharingUser,
            isAccepted: file.ownedByMe || file.starred
        };
    } catch (error) {
        console.error(`Failed to fetch stack ${file.id}`, error);
        return {
            id: file.id,
            title: file.name.replace('flashcard_stack_', '').replace('.json', '') || 'Error Loading Stack',
            driveFileId: file.id,
            ownedByMe: file.ownedByMe,
            ownerName: file.owners?.[0]?.displayName,
            sharingUser: file.sharingUser,
            isAccepted: file.ownedByMe || file.starred,
            cards: [],
            error: true
        };
    }
};

/**
 * DEPRECATED: Use listStackMetadata + fetchStackContent instead.
 * Kept for backward compatibility if needed, but App.jsx uses it so we will likely remove usage there.
 */
export const listStacks = async (token) => {
    const files = await listStackMetadata(token);
    return Promise.all(files.map(file => fetchStackContent(token, file)));
};

/**
 * List all files in a specific folder (for Admin Indexing)
 */
export const listFilesInFolder = async (token, folderId) => {
    // Modified query to include the 'trashed = false' check and filter by JSON mimeType
    const query = `'${folderId}' in parents and mimeType = 'application/json' and trashed = false`;
    const fields = 'files(id, name, createdTime, modifiedTime)';
    const url = `${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=${fields}&supportsAllDrives=true&includeItemsFromAllDrives=true&spaces=drive&t=${Date.now()}`;

    const response = await resilientFetch(url, {
        headers: getHeaders(token),
        _isElevated: true
    });

    if (response.status === 401) {
        throw new Error('REAUTH_NEEDED');
    }

    const data = await response.json();
    return data.files || [];
};







/**
 * Get content of a specific file.
 */
export const getFileContent = async (token, fileId) => {
    // Append timestamp to prevent caching
    const url = `${DRIVE_API_URL}/${fileId}?alt=media&t=${Date.now()}`;
    const response = await resilientFetch(url, {
        headers: getHeaders(token),
        _isElevated: true
    });

    if (response.status === 401) {
        throw new Error('REAUTH_NEEDED');
    }

    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        // Return raw text if not valid JSON (likely encrypted content)
        return text;
    }
};

/**
 * Generic function to Save a File to Google Drive.
 */
export const saveFile = async (token, name, content, fileId = null, mimeType = 'application/json', folderId = null, appProperties = null) => {
    const metadata = {
        name: name,
        mimeType: mimeType,
    };

    if (appProperties) {
        metadata.appProperties = appProperties;
    }

    if (folderId && !fileId) {
        metadata.parents = [folderId];
    }

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
        const response = await resilientFetch(url, {
            method,
            headers: {
                ...getHeaders(token),
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
            _isElevated: true
        });

        if (response.status === 401) {
            throw new Error('REAUTH_NEEDED');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to save to Google Drive');
        }

        const result = await response.json();

        // Update cache with the new content
        fileContentCache.set(result.id, {
            content: content,
            modifiedTime: result.modifiedTime || new Date().toISOString()
        });
        savePersistentCache(fileContentCache);

        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Create or Update a Flashcard Stack.
 */
export const saveStack = async (token, stack, fileId = null, folderId = null) => {
    // Extract metadata for appProperties (must be strings, max 100 properties, 124 bytes per prop)
    const metadata = {
        title: stack.title || '',
        cardsCount: String(stack.cardsCount !== undefined ? stack.cardsCount : (stack.cards?.length || 0)),
        lastMarks: String(stack.lastMarks !== undefined ? stack.lastMarks : ''),
        nextReview: stack.nextReview || '',
        label: stack.label || 'No label'
    };

    return saveFile(token, `flashcard_stack_${stack.id}.json`, stack, fileId, 'application/json', folderId, metadata);
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

    const response = await resilientFetch(`${DRIVE_API_URL}/${fileId}/permissions?sendNotificationEmail=true`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(body),
        _isElevated: true
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to share file');
    }

    return await response.json();
};


/**
 * Make a file public (Anyone with the link can view).
 */
export const makeFilePublic = async (token, fileId) => {
    const body = {
        role: 'reader',
        type: 'anyone',
    };

    const response = await resilientFetch(`${DRIVE_API_URL}/${fileId}/permissions`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(body),
        _isElevated: true
    });

    if (!response.ok) {
        throw new Error('Failed to make file public');
    }

    return await response.json();
};


/**
 * Delete a specific stack.
 */
export const deleteStack = async (token, fileId) => {
    const response = await resilientFetch(`${DRIVE_API_URL}/${fileId}`, {
        method: 'DELETE',
        headers: getHeaders(token),
        _isElevated: true
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
    const response = await resilientFetch(`${DRIVE_API_URL}?q=${encodeURIComponent(query)}`, {
        headers: getHeaders(token),
        _isElevated: true
    });
    if (response.status === 401) throw new Error('REAUTH_NEEDED');

    const data = await response.json();

    await Promise.all(
        data.files.map((file) =>
            resilientFetch(`${DRIVE_API_URL}/${file.id}`, {
                method: 'DELETE',
                headers: getHeaders(token),
                _isElevated: true
            })
        )
    );
};
/**
 * Get storage quota information.
 */
export const getStorageQuota = async (token) => {
    const url = 'https://www.googleapis.com/drive/v3/about?fields=storageQuota';
    const response = await resilientFetch(url, {
        headers: getHeaders(token),
        _isElevated: true
    });

    if (response.status === 401) {
        throw new Error('REAUTH_NEEDED');
    }

    if (!response.ok) {
        throw new Error('Failed to fetch storage quota');
    }

    const data = await response.json();
    return data.storageQuota;
};

/**
 * Find a folder by name.
 * Useful for finding system folders like 'ChethanCardland_System'.
 */
export const findFolderByName = async (token, folderName) => {
    const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
    const url = `${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=files(id, name)&t=${Date.now()}`;

    const response = await resilientFetch(url, {
        headers: getHeaders(token),
        _isElevated: true
    });
    if (response.status === 401) throw new Error('REAUTH_NEEDED');
    if (!response.ok) return null;

    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
};

/**
 * Find a file by name within a specific folder.
 */
export const findFileByName = async (token, fileName, folderId) => {
    const query = `'${folderId}' in parents and name = '${fileName}' and trashed = false`;
    const url = `${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=files(id, name)&t=${Date.now()}`;

    const response = await resilientFetch(url, {
        headers: getHeaders(token),
        _isElevated: true
    });
    if (response.status === 401) throw new Error('REAUTH_NEEDED');
    if (!response.ok) return null;

    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
};
