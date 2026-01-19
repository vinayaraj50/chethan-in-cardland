/**
 * Subscription Service
 * Handles checking for subscription grants in the public drive.
 */

import { APPS_SCRIPT_URL } from '../constants/config';

/**
 * Check if a grant file exists for the user in the public folder.
 * File naming convention: grant_{email}.json
 */
export const checkSubscriptionGrant = async (email, publicFolderId) => {
    if (!email || !publicFolderId) return null;

    try {
        // We use the Apps Script proxy to search, as it's the efficient way to look up by name in public folder
        // Reuse the listing action or add a specific one?
        // listUsers action in adminService uses ?action=listUsers... 
        // We can use the simple public listing from publicDrive if we had a way to filter deeper.

        // Let's try to fetch the specific file by name pattern if we can, or list and filter.
        // For efficiency, let's assume we list 'grant_' files.

        // Actually, the simplest check is to iterate the list like Admin does, but filtered for this user.
        // But that's slow if there are many.
        // Let's rely on the 'listPublicLessons' equivalent but for grants.

        // BETTER APPROACH: Use the Apps Script to find the file by name explicitly if possible.
        // But our current script is generic. 

        // Fallback: Use standard GAPI listing if initialized, or fetch match.

        // Let's try fetching via the "search" query params if the public API allows.
        const API_KEY = import.meta.env.VITE_PUBLIC_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
        const query = `'${publicFolderId}' in parents and name = 'grant_${email}.json' and trashed = false`;
        const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, createdTime)&key=${API_KEY}`;

        const response = await fetch(listUrl);
        if (!response.ok) return null;

        const data = await response.json();
        if (data.files && data.files.length > 0) {
            // Found a grant file!
            const file = data.files[0];

            // Now get its content
            const contentUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
            const contentRes = await fetch(contentUrl);
            if (contentRes.ok) {
                return await contentRes.json();
            }
        }

        return null;

    } catch (error) {
        console.warn('Error checking subscription:', error);
        return null;
    }
};
