/**
 * Admin Service
 * Handles user activity tracking and admin-specific operations.
 */

import { saveFile, getFileContent, listFilesInFolder } from './googleDrive';
import { APPS_SCRIPT_URL, PUBLIC_API_KEY, APPS_SCRIPT_KEY, ADMIN_EMAIL } from '../constants/config';

const ADMIN_USERS_FILE = 'admin_users.json';


/**
 * Get all user tracking files from the public folder and aggregate them
 */
export const getUsersData = async (token, publicFolderId, offset = 0, limit = 50, search = '') => {
    try {
        if (!publicFolderId) {
            console.warn('No public folder ID provided for user tracking');
            return { data: { users: {} } };
        }

        // List files in the public folder via Universal Proxy with Pagination and Search
        const scriptUrl = `${APPS_SCRIPT_URL}?action=list&folderId=${publicFolderId}&prefix=user_track_&offset=${offset}&limit=${limit}&search=${encodeURIComponent(search)}&token=${encodeURIComponent(token)}&key=${APPS_SCRIPT_KEY}&t=${Date.now()}`;
        try {
            const response = await fetch(scriptUrl);
            if (response.ok) {
                const result = await response.json();
                // Check for both { data: [...] } and { data: { files: [...] } }
                const filesList = Array.isArray(result.data) ? result.data : (result.data?.files || []);

                if (filesList && filesList.length > 0) {
                    const usersMap = filesList.reduce((acc, u) => {
                        // Extract email from property or filename
                        const email = u.email || (u.name ? u.name.replace('user_track_', '').replace('.json', '') : null);
                        if (email) {
                            acc[email] = {
                                email,
                                lastSeen: u.lastSeen || u.modifiedTime || new Date().toISOString(),
                                totalLogins: u.totalLogins || 1,
                                ...u
                            };
                        }
                        return acc;
                    }, {});
                    return { data: { users: usersMap }, hasMore: result.hasMore, nextOffset: result.nextOffset };
                }
            }
        } catch (e) {
            console.warn('Script list failed, falling back to public API', e);
        }

        // Fallback: List files via public API key
        const query = `'${publicFolderId}' in parents and name contains 'user_track_' and trashed = false`;
        const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, modifiedTime, createdTime)&key=${PUBLIC_API_KEY}`;

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
    if (!files || files.length === 0) return { data: { users: {} } };

    const users = {};
    const filesToFetch = files.slice(0, 50);

    await Promise.all(filesToFetch.map(async (file) => {
        try {
            // 1. Try Authenticated Download (Best for Admin)
            const userData = await getFileContent(token, file.id);
            const email = userData.email || file.name.replace('user_track_', '').replace('.json', '');
            if (email) {
                users[email] = { ...file, ...userData, email };
            }
        } catch (apiError) {
            // 2. Fallback to Proxy
            try {
                const scriptUrl = `${APPS_SCRIPT_URL}?action=read&id=${file.id}&token=${encodeURIComponent(token)}&key=${APPS_SCRIPT_KEY}`;
                const contentRes = await fetch(scriptUrl);
                if (contentRes.ok) {
                    const userData = await contentRes.json();
                    const email = userData.email || file.name.replace('user_track_', '').replace('.json', '');
                    if (email) users[email] = { ...file, ...userData, email };
                }
            } catch (e) { }
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
        await checkInViaProxy(userEmail, publicFolderId, token);
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

const checkInViaProxy = async (email, folderId, token) => {
    const url = `${APPS_SCRIPT_URL}?action=checkIn&email=${encodeURIComponent(email)}&folderId=${folderId}&token=${encodeURIComponent(token)}&key=${APPS_SCRIPT_KEY}&t=${Date.now()}`;
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
        id: user.id || user.fileId, // Ensure we have the file ID for updates
        firstSeen: new Date(user.firstSeen || user.createdTime || Date.now()),
        lastSeen: new Date(user.lastSeen || user.modifiedTime || Date.now()),
        totalLogins: user.totalLogins || 0,
        loginHistory: user.loginHistory || []
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
                // 1. Try Authenticated Fetch (Admin context)
                let content;
                try {
                    content = await getFileContent(token, file.id);
                } catch (apiError) {
                    // 2. Fallback to Proxy
                    const response = await fetch(`${APPS_SCRIPT_URL}?action=read&id=${file.id}&token=${encodeURIComponent(token)}&key=${APPS_SCRIPT_KEY}&t=${Date.now()}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data && !data.error) content = data;
                    }
                }

                if (content && !content.error && content.cards) {
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

/**
 * Save custom AI prompts to the public folder
 */
export const saveAdminPrompts = async (token, publicFolderId, prompts) => {
    try {
        const files = await listFilesInFolder(token, publicFolderId);
        const existingFile = files.find(f => f.name === 'admin_prompts.json' && !f.trashed);

        await saveFile(
            token,
            'admin_prompts.json',
            prompts,
            existingFile ? existingFile.id : null,
            'application/json',
            publicFolderId
        );
        return true;
    } catch (error) {
        console.error('Failed to save admin prompts:', error);
        return false;
    }
};

/**
 * Get custom AI prompts from the public folder
 */
export const getAdminPrompts = async (token, publicFolderId) => {
    // Remove try-catch to let UI handle network/auth errors specifically
    const files = await listFilesInFolder(token, publicFolderId);
    const promptFile = files.find(f => f.name === 'admin_prompts.json' && !f.trashed);

    if (promptFile) {
        return await getFileContent(token, promptFile.id);
    }
    return null;
};

/**
 * Save admin workflow settings to the cloud
 */
export const saveAdminSettings = async (token, publicFolderId, settings) => {
    try {
        const files = await listFilesInFolder(token, publicFolderId);
        const existingFile = files.find(f => f.name === 'admin_settings.json' && !f.trashed);

        await saveFile(
            token,
            'admin_settings.json',
            settings,
            existingFile ? existingFile.id : null,
            'application/json',
            publicFolderId
        );
        return true;
    } catch (error) {
        console.error('Failed to save admin settings:', error);
        return false;
    }
};

/**
 * Get admin workflow settings from the cloud
 */
export const getAdminSettings = async (token, publicFolderId) => {
    try {
        const files = await listFilesInFolder(token, publicFolderId);
        const settingsFile = files.find(f => f.name === 'admin_settings.json' && !f.trashed);

        if (settingsFile) {
            return await getFileContent(token, settingsFile.id);
        }
        return null;
    } catch (error) {
        console.error('Failed to get admin settings:', error);
    }
};

/**
 * Securely grant coins via Apps Script Proxy (Server-side)
 */
/**
 * Securely grant coins via Apps Script Proxy using the ADMIN-only 'write' action.
 * This reads the user's file, modifies the balance, and overwrites it via the Proxy.
 * Since the Proxy enforces isAdmin for 'write', this is secure.
 */
export const grantCoinsSecurely = async (targetEmail, amount, adminToken, targetFileId, currentData) => {
    // 1. Calculate new state
    const newBalance = (currentData.coins || 0) + parseInt(amount);
    const updatedData = {
        ...currentData,
        coins: newBalance,
        coinHistory: [
            ...(currentData.coinHistory || []),
            {
                date: new Date().toISOString(),
                amount: parseInt(amount),
                type: 'admin_grant',
                reason: 'Admin Grant',
                by: 'Admin'
            }
        ]
    };

    // 2. Overwrite via Proxy (Secure Write)
    // The proxy expects: action=write, id=FileId, data=JSONString, token=AdminToken
    const url = `${APPS_SCRIPT_URL}?action=write&id=${targetFileId}&token=${encodeURIComponent(adminToken)}&key=${APPS_SCRIPT_KEY}&t=${Date.now()}`;

    // We must use POST for data payload usually, but let's check how the proxy handles it.
    // Proxy: const data = p.data || (e.postData ? JSON.parse(e.postData.contents).data : null);
    // So we can send it in body.

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedData })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error);

    return { success: true, newBalance };
};

