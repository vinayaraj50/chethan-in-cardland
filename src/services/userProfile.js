/**
 * User Profile Service
 * Manages user data including Coin Balance and Daily Login tracking.
 * Stored securely via Google Apps Script Proxy (Centralized Admin Storage).
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
 * Fetch or Initialize User Profile via Proxy
 */
export const getUserProfile = async (token) => {
    try {
        console.log("getUserProfile: Fetching profile with token verification");
        const url = `${APPS_SCRIPT_URL}?action=getUserProfile&token=${encodeURIComponent(token)}&key=${APPS_SCRIPT_KEY}&t=${Date.now()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        // Merge with default to ensure consistency
        return { ...DEFAULT_PROFILE, ...data };

    } catch (error) {
        console.error("Profile Fetch Error:", error);
        return DEFAULT_PROFILE;
    }
};

/**
 * Save User Profile via Proxy
 */
export const saveUserProfile = async (token, profile) => {
    try {
        const dataStr = JSON.stringify(profile);
        console.log("saveUserProfile: Saving profile with token verification");

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: new URLSearchParams({
                action: 'saveUserProfile',
                data: dataStr,
                token: token,
                key: APPS_SCRIPT_KEY
            })
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        return { ...profile, ...result.profile };

    } catch (e) {
        console.error("Profile Save Error:", e);
        return profile;
    }
};

/**
 * Check Daily Login Reward via Proxy (Server Side Logic)
 */
export const checkDailyLogin = async (token, profile) => {
    try {
        console.log("checkDailyLogin: Attempting claim with token verification");
        const url = `${APPS_SCRIPT_URL}?action=claimDailyBonus&token=${encodeURIComponent(token)}&key=${APPS_SCRIPT_KEY}&t=${Date.now()}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.error) throw new Error(result.error);

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
