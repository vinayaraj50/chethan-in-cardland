/**
 * Google Drive API Service
 * Handles file storage and collaboration.
 */

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';

// Persistent cache for lesson contents to avoid redundant fetches
import { sessionManager } from './sessionManager';

const CACHE_KEY = 'lesson_content_cache';

const getCache = () => {
    try {
        const raw = sessionManager.userStore.get(CACHE_KEY, {});
        return new Map(Object.entries(raw));
    } catch (e) {
        // If no session or error, return empty map
        return new Map();
    }
};

const saveCache = (map) => {
    try {
        if (map.size > 50) {
            const keys = Array.from(map.keys());
            const keysToRemove = keys.slice(0, map.size - 50);
            keysToRemove.forEach(k => map.delete(k));
        }
        const obj = Object.fromEntries(map);
        sessionManager.userStore.set(CACHE_KEY, obj);
    } catch (e) {
        // Quota exceeded handled by StorageStore or silent fail
        console.warn('Failed to save cache:', e);
    }
};

/**
 * Clear cache for a specific file ID
 */
export const clearLessonCache = (fileId) => {
    if (fileId) {
        const cache = getCache();
        cache.delete(fileId);
        saveCache(cache);
    }
};

// Backward compatibility alias
export const clearStackCache = clearLessonCache;

const getHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
});

import { resilientFetch } from '../utils/resilientFetch';

/**
 * List all lesson/stack metadata without fetching full content.
 */
export const listLessonMetadata = async (token) => {
    // 2026 Optimization: Fetch both Contents AND detached Progress files in one batch call
    const query = "mimeType = 'application/json' and (name contains 'cic_lesson_' or name contains 'cic_progress_' or name contains 'flashcard_stack_') and trashed = false";
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

// Backward compatibility alias
export const listStackMetadata = listLessonMetadata;

/**
 * Check if a lesson is in the local cache and valid.
 */
export const getCachedLesson = (fileId, modifiedTime) => {
    const cache = getCache();
    const cached = cache.get(fileId);
    if (cached && cached.modifiedTime === modifiedTime) {
        return {
            ...cached.content,
            driveFileId: fileId,
            _isCached: true
        };
    }
    return null;
};

// Backward compatibility alias
export const getCachedStack = getCachedLesson;

/**
 * Fetch full content for a single lesson and update cache.
 */
export const fetchLessonContent = async (token, file) => {
    try {
        const cached = getCachedLesson(file.id, file.modifiedTime);
        if (cached) return {
            ...cached,
            ownedByMe: file.ownedByMe,
            ownerName: file.owners?.[0]?.displayName,
            sharingUser: file.sharingUser,
            isAccepted: file.ownedByMe || file.starred
        };

        const content = await getFileContent(token, file.id);

        // Update cache
        const cache = getCache();
        cache.set(file.id, {
            content,
            modifiedTime: file.modifiedTime
        });
        saveCache(cache);

        if (typeof content === 'string') {
            // It's an encrypted blob. Do NOT spread it.
            // Return a wrapper object that StorageOrchestrator recognizes.
            return {
                encryptedContent: content,
                driveFileId: file.id,
                ownedByMe: file.ownedByMe,
                ownerName: file.owners?.[0]?.displayName,
                sharingUser: file.sharingUser,
                isAccepted: file.ownedByMe || file.starred,
                modifiedTime: file.modifiedTime
            };
        }

        // It's a JSON object (legacy or unencrypted). Safe to spread.
        return {
            ...content,
            driveFileId: file.id,
            ownedByMe: file.ownedByMe,
            ownerName: file.owners?.[0]?.displayName,
            sharingUser: file.sharingUser,
            isAccepted: file.ownedByMe || file.starred
        };
    } catch (error) {
        console.error(`[Drive] Fetch failed for ${file.id}`, error);
        return {
            ...mapDriveFileToLesson(file),
            error: true,
            errorMessage: error.message
        };
    }
};

// Backward compatibility alias
export const fetchStackContent = fetchLessonContent;

/**
 * Get content of a specific file.
 */
export const getFileContent = async (token, fileId) => {
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
        return text;
    }
};

/**
 * Creates a normalized Lesson object from Drive file data.
 */
export const mapDriveFileToLesson = (file) => {
    const props = file.appProperties || {};
    return {
        id: props.id || file.id,
        driveFileId: file.id,
        title: props.title || file.name.replace('cic_lesson_', '').replace('flashcard_stack_', '').replace('.json', '') || 'Error Loading Lesson',
        label: props.label || 'Unknown',
        questions: [],
        questionCount: parseInt(props.questionCount || props.cardsCount) || 0,
        modifiedTime: file.modifiedTime,
        ownedByMe: file.ownedByMe,
        source: 'drive'
    };
};

/**
 * Create or Update a Lesson.
 * @param {string} token - OAuth token
 * @param {object} lesson - Lesson object for metadata extraction
 * @param {string|null} fileId - Optional Drive file ID for updates
 * @param {string|null} folderId - Optional folder ID
 * @param {string|object|null} content - Optional content to save (e.g., encrypted blob). If null, saves lesson as content.
 */
export const saveLesson = async (token, lesson, fileId = null, folderId = null, content = null) => {
    // 2026 Strategy: Metadata Shadowing
    // These properties are stored in the Drive File metadata (appProperties)
    // allowing listLessonMetadata() to show progress without downloading/decrypting full JSON.
    const metadata = {
        id: lesson.id,
        title: lesson.title,
        label: lesson.label || '',
        questionCount: String(lesson.questionCount !== undefined ? lesson.questionCount : (lesson.questions?.length || lesson.cards?.length || 0)),
        lastMarks: lesson.lastMarks !== undefined ? String(lesson.lastMarks) : '',
        nextReview: lesson.nextReview || '',
        reviewStage: lesson.reviewStage !== undefined ? String(lesson.reviewStage) : '-1'
    };

    const fileName = `cic_lesson_${lesson.id}.json`;
    // If content is provided (e.g., encrypted blob), use it. Otherwise, use the lesson object itself.
    const contentToSave = content !== null ? content : lesson;
    return saveFile(token, fileName, contentToSave, fileId, 'application/json', folderId, metadata);
};

// Backward compatibility alias
export const saveStack = saveLesson;

/**
 * Delete a Lesson.
 */
export const deleteLesson = async (token, fileId) => {
    const response = await resilientFetch(`${DRIVE_API_URL}/${fileId}`, {
        method: 'DELETE',
        headers: getHeaders(token),
        _isElevated: true
    });

    if (!response.ok && response.status !== 404) {
        throw new Error(`Drive Delete Failed: ${response.status}`);
    }

    if (fileId) {
        const cache = getCache();
        cache.delete(fileId);
        saveCache(cache);
    }

    return true;
};

// Backward compatibility alias
export const deleteStack = deleteLesson;

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


        const cache = getCache();
        cache.set(result.id, {
            content: content,
            modifiedTime: result.modifiedTime || new Date().toISOString()
        });
        saveCache(cache);

        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Share a file with another user.
 */
export const shareLesson = async (token, fileId, email, role = 'reader', message = '') => {
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

// Backward compatibility alias
export const shareStack = shareLesson;

/**
 * Delete all data (Dangerous!)
 */
export const deleteAllData = async (token) => {
    const files = await listLessonMetadata(token);
    await Promise.all(
        files.map((file) => deleteLesson(token, file.id))
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
    let query = `name = '${fileName}' and trashed = false`;
    if (folderId) {
        query += ` and '${folderId}' in parents`;
    }
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
 * Make a file specifically public to anyone with the link.
 */
export const makeFilePublic = async (token, fileId) => {
    return shareLesson(token, fileId, null, 'reader');
};
