/**
 * User Profile Service
 * Manages user data including Coin Balance and Daily Login tracking.
 * Stored securely via Google Apps Script Proxy.
 */

import { APPS_SCRIPT_URL, APPS_SCRIPT_KEY } from '../constants/config';

// Default Profile State
const DEFAULT_PROFILE = {
    coins: 0,
    displayName: null,
    lastLoginDate: null,
    referralCode: null,
    referredBy: null,
    totalReviews: 0,
    unlimitedCoinsExpiry: null
};

/**
 * Standardized Fetch Wrapper for Apps Script Logic
 * Uses POST to strictly avoid token logging in server query parameters.
 */
const proxyFetch = async (action, payload) => {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow', // Important for Apps Script redirects
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                ...payload,
                action: action,
                key: APPS_SCRIPT_KEY
            })
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch or Initialize User Profile via Proxy
 */
export const getUserProfile = async (token) => {
    try {
        console.log("getUserProfile: Fetching profile securely via POST");
        const data = await proxyFetch('getUserProfile', { token });

        // Merge with default to ensure consistency
        return { ...DEFAULT_PROFILE, ...data };

    } catch (error) {
        console.error("Profile Fetch Error:", error.message);
        // On auth failure, rethrow so UI can handle (e.g., logout)
        if (error.message.includes('Invalid') || error.message.includes('Token')) {
            throw error;
        }
        return DEFAULT_PROFILE;
    }
};

/**
 * Save User Profile via Proxy
 */
export const saveUserProfile = async (token, profile) => {
    try {
        const dataStr = JSON.stringify(profile);
        console.log("saveUserProfile: Saving profile securely");

        const result = await proxyFetch('saveUserProfile', {
            token,
            data: dataStr
        });

        return { ...profile, ...result.profile };

    } catch (e) {
        console.error("Profile Save Error:", e);
        // Optimistic update: Return the profile we tried to save, or the original if critical failure
        return profile;
    }
};

/**
 * Check Daily Login Reward via Proxy (Server Side Logic)
 */
export const checkDailyLogin = async (token, profile) => {
    try {
        console.log("checkDailyLogin: Attempting claim");

        const result = await proxyFetch('claimDailyBonus', { token });

        if (result.awarded) {
            return {
                awarded: true,
                coinsAdded: result.coinsAdded,
                newProfile: { ...profile, ...result.newProfile }
            };
        } else {
            return { awarded: false, newProfile: profile };
        }

    } catch (e) {
        console.error("Daily Bonus Check Failed:", e.message || e);
        return { awarded: false, newProfile: profile };
    }
};
