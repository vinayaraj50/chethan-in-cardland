/**
 * Admin Service
 * Handles user activity tracking and admin-specific operations.
 */

import { saveFile, getFileContent, listFilesInFolder } from './googleDrive';
import { APPS_SCRIPT_URL } from './publicDrive';
import { ADMIN_EMAIL } from '../constants/config';

const ADMIN_USERS_FILE = 'admin_users.json';


/**
 * Get all user tracking files from the public folder and aggregate them
 */
export const getUsersData = async (token, publicFolderId) => {
    try {
        if (!publicFolderId) {
            console.warn('No public folder ID provided for user tracking');
            return { data: { users: {} } };
        }

        // List files in the public folder. 
        // We try the script first as it's most reliable for listing
        const scriptUrl = `${APPS_SCRIPT_URL}?action=listUsers&folderId=${publicFolderId}`;
        try {
            const response = await fetch(scriptUrl);
            if (response.ok) {
                const data = await response.json();
                if (data && data.users) return { data };
            }
        } catch (e) {
            console.warn('Script list failed, falling back to public API');
        }

        // Fallback: List files via public API key
        const query = `'${publicFolderId}' in parents and name contains 'user_track_' and trashed = false`;
        const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)&key=${import.meta.env.VITE_PUBLIC_API_KEY}`;

        const response = await fetch(listUrl);
        if (!response.ok) {
            throw new Error(`Failed to list user files: ${response.status}`);
        }

        const data = await response.json();
        return await fetchFilesContent(data.files, token);

    } catch (error) {
        console.warn('Error fetching users data:', error);
        return { data: { users: {} } };
    }
};

/**
 * Helper to fetch content for discovered files
 */
const fetchFilesContent = async (files, token) => {
    if (!files || files.length === 0) {
        return { data: { users: {} } };
    }

    const users = {};
    const filesToFetch = files.slice(0, 100); // Increased limit as we scale

    await Promise.all(filesToFetch.map(async (file) => {
        try {
            // Try fetching via Apps Script (fastest/bypass CORS)
            const scriptUrl = `${APPS_SCRIPT_URL}?action=getFile&id=${file.id}`;
            let contentRes = await fetch(scriptUrl);

            // Fallback: Public API
            if (!contentRes.ok) {
                const publicUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${import.meta.env.VITE_PUBLIC_API_KEY}`;
                contentRes = await fetch(publicUrl);
            }

            if (contentRes.ok) {
                const userData = await contentRes.json();
                if (userData && userData.email) {
                    users[userData.email] = userData;
                }
            }
        } catch (e) {
            // Silently skip failed files
        }
    }));

    return { data: { users } };
};

/**
 * Check in a user (record their login activity)
 * Uses the Apps Script Proxy to handle writes with Admin permissions
 */
export const checkInUser = async (token, userEmail, publicFolderId) => {
    if (!publicFolderId || !userEmail) return;

    try {
        // 1. Try Apps Script Proxy (Preferred - Handles Permissions)
        await checkInViaProxy(userEmail, publicFolderId);
    } catch (proxyError) {
        // 2. Fallback: Direct Write (Only for Admin)
        // This is a client-side check, but server-side permissions (Google Drive) 
        // will ultimately enforce who can write to these files.
        if (userEmail === ADMIN_EMAIL) {
            await checkInDirectly(token, userEmail, publicFolderId);
        } else {
            console.warn('User tracking unavailable for this user.');
        }
    }
};

const checkInViaProxy = async (email, folderId) => {
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify({
        action: 'checkIn',
        email,
        folderId,
        timestamp
    });

    const url = `${APPS_SCRIPT_URL}?payload=${encodeURIComponent(payload)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Proxy check-in failed: ${response.status}`);
    }

    return await response.json();
};

const checkInDirectly = async (token, email, folderId) => {
    try {
        const fileName = `user_track_${email}.json`;
        const now = new Date().toISOString();
        const userData = {
            email,
            firstSeen: now,
            lastSeen: now,
            totalLogins: 1,
            loginHistory: [now]
        };
        await saveFile(token, fileName, userData, null, 'application/json', folderId);
    } catch (e) {
        console.warn('Direct admin check-in failed');
    }
};

/**
 * Get user statistics for display in admin panel
 */
export const getUserStats = (usersData) => {
    const users = Object.values(usersData.users || {});

    return users.map(user => ({
        email: user.email,
        firstSeen: new Date(user.firstSeen),
        lastSeen: new Date(user.lastSeen),
        totalLogins: user.totalLogins,
        loginHistory: user.loginHistory
    }));
};

/**
 * Sort users by different criteria
 */
export const sortUsers = (users, sortBy) => {
    const sorted = [...users];

    switch (sortBy) {
        case 'Last Active':
            return sorted.sort((a, b) => b.lastSeen - a.lastSeen);
        case 'Most Active':
            return sorted.sort((a, b) => b.totalLogins - a.totalLogins);
        case 'First Seen':
            return sorted.sort((a, b) => a.firstSeen - b.firstSeen);
        case 'Email':
            return sorted.sort((a, b) => a.email.localeCompare(b.email));
        default:
            return sorted;
    }
};
// ... existing code ...

/**
 * Update a single stack in the public index
 */
export const updatePublicStackIndex = async (token, publicFolderId, stack) => {
    try {
        // 1. Find index file
        const files = await listFilesInFolder(token, publicFolderId);
        const indexFile = files.find(f => f.name === 'public_index.json' && !f.trashed);

        let index = [];
        let fileId = null;

        if (indexFile) {
            fileId = indexFile.id;
            try {
                index = await getFileContent(token, fileId);
                if (!Array.isArray(index)) index = [];
            } catch (e) {
                console.warn('Failed to read index', e);
                index = [];
            }
        }

        // 2. Update entry
        const entry = {
            id: stack.id,
            title: stack.title,
            label: stack.label,
            standard: stack.standard,
            syllabus: stack.syllabus,
            subject: stack.subject,
            medium: stack.medium,
            cardsCount: stack.cards ? stack.cards.length : (stack.cardsCount || 0),
            driveFileId: stack.driveFileId,
            isPublic: true,
            cost: parseInt(stack.cost) || 0,
            importantNote: stack.importantNote || '',
            owner: stack.owner || 'System' // Preserve owner info
        };

        const existingIndex = index.findIndex(s => s.id === stack.id || (stack.driveFileId && s.driveFileId === stack.driveFileId));
        if (existingIndex >= 0) {
            index[existingIndex] = { ...index[existingIndex], ...entry };
        } else {
            index.push(entry);
        }

        // 3. Save
        await saveFile(token, 'public_index.json', index, fileId, 'application/json', publicFolderId);
        return true;
    } catch (error) {
        console.error('Failed to update public index:', error);
        return false;
    }
};

/**
 * Rebuild the entire public index by scanning all files
 */
export const rebuildPublicIndex = async (token, publicFolderId) => {
    try {
        // 1. List all public JSON files
        const files = await listFilesInFolder(token, publicFolderId);
        const stackFiles = files.filter(f => f.name.includes('flashcard_stack_') && f.name.endsWith('.json') && !f.trashed);

        // 2. Fetch content for each to get metadata
        const index = [];

        await Promise.all(stackFiles.map(async (file) => {
            try {
                const content = await getFileContent(token, file.id);
                // Only add if it's a valid stack
                if (content && content.cards) {
                    index.push({
                        id: content.id,
                        title: content.title,
                        label: content.label,
                        standard: content.standard,
                        syllabus: content.syllabus,
                        subject: content.subject,
                        medium: content.medium,
                        cardsCount: content.cards.length,
                        driveFileId: file.id,
                        isPublic: true,
                        cost: content.cost || 0,
                        importantNote: content.importantNote || '',
                        owner: content.owner || 'System'
                    });
                }
            } catch (e) {
                console.error('Failed to index file', file.name, e);
            }
        }));

        // 3. Save index.json
        const existingIndex = files.find(f => f.name === 'public_index.json');
        await saveFile(token, 'public_index.json', index, existingIndex ? existingIndex.id : null, 'application/json', publicFolderId);

        return index.length;
    } catch (e) {
        console.error(e);
        throw e;
    }
};
