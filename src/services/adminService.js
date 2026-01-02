/**
 * Admin Service
 * Handles user activity tracking and admin-specific operations.
 */

import { saveFile, getFileContent } from './googleDrive';
import { APPS_SCRIPT_URL } from './publicDrive';

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
        if (userEmail === 'chethanincardland@gmail.com') {
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
