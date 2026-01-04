/**
 * User Profile Service
 * Manages user data including Coin Balance and Daily Login tracking.
 * Stored in 'user_profile.json' in Google Drive.
 */

import { saveFile, getFileContent } from './googleDrive';

const PROFILE_FILE_NAME = 'user_profile.json';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

const getHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
});

// Default Profile State
const DEFAULT_PROFILE = {
    coins: 0,
    lastLoginDate: null,
    referralCode: null, // Generated on first save
    referredBy: null,
    referredBy: null,
    totalReviews: 0,
    unlimitedCoinsExpiry: null // Timestamp for unlimited plan expiry
};

/**
 * Fetch or Initialize User Profile
 */
export const getUserProfile = async (token) => {
    try {
        // Search for existing profile
        const query = `name = '${PROFILE_FILE_NAME}' and trashed = false`;
        const url = `${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=files(id, modifiedTime)&spaces=drive`;

        const response = await fetch(url, { headers: getHeaders(token) });
        if (response.status === 401) throw new Error('REAUTH_NEEDED');

        const data = await response.json();
        const file = data.files?.[0];

        if (file) {
            // Found existing profile, load it
            try {
                const content = await getFileContent(token, file.id);
                // Merge with default to ensure new fields exist
                return { ...DEFAULT_PROFILE, ...content, driveFileId: file.id };
            } catch (e) {
                console.error("Error reading profile:", e);
                return { ...DEFAULT_PROFILE, driveFileId: file.id };
            }
        } else {
            // Create new profile
            const newProfile = {
                ...DEFAULT_PROFILE,
                lastLoginDate: new Date().toISOString(),
                referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
            };
            const savedInfo = await saveFile(token, PROFILE_FILE_NAME, newProfile);
            return { ...newProfile, driveFileId: savedInfo.id };
        }
    } catch (error) {
        console.error("Profile Fetch Error:", error);
        if (error.message === 'REAUTH_NEEDED') throw error;
        return DEFAULT_PROFILE; // Fallback to local default (no persistence)
    }
};

/**
 * Save User Profile
 */
export const saveUserProfile = async (token, profile) => {
    if (!profile.driveFileId) {
        // Should have been created during fetch, but handle safety case
        const savedInfo = await saveFile(token, PROFILE_FILE_NAME, profile);
        return { ...profile, driveFileId: savedInfo.id };
    }

    // Save content (exclude transient local fields if any)
    const { driveFileId, ...content } = profile;
    await saveFile(token, PROFILE_FILE_NAME, content, driveFileId);
    return profile;
};

/**
 * Check Daily Login Reward
 * Returns { awarded: boolean, coinsAdded: number, newProfile: object }
 */
export const checkDailyLogin = async (token, profile) => {
    const today = new Date().toLocaleDateString();

    if (profile.lastLoginDate === today) {
        return { awarded: false, newProfile: profile };
    }

    const newProfile = {
        ...profile,
        coins: (profile.coins || 0) + 5,
        lastLoginDate: today
    };

    await saveUserProfile(token, newProfile);
    return { awarded: true, coinsAdded: 5, newProfile };
};
