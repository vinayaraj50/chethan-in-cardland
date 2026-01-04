/**
 * User Profile Service
 * Manages user data including Coin Balance and Daily Login tracking.
 * Stored securely via Google Apps Script Proxy (Centralized Admin Storage).
 */

import { APPS_SCRIPT_URL } from '../constants/config';

// Default Profile State
const DEFAULT_PROFILE = {
    coins: 0,
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
    // We need the user's email. Token is used for auth elsewhere, 
    // but the proxy relies on email passed as a parameter for simplicity in this migration plan.
    // Ideally, we extract email from token or state, but let's assume the caller handles auth context.
    // Wait, the previous implementation didn't strictly need email for file search because it searched 'name = ...'.
    // Now we need email. 
    // We'll rely on the fact that `initGoogleAuth` in App.jsx sets `user` state which has email.
    // AND `getUserProfile` is called with just `token`. This is a problem.
    // We need to fetch the user's email using the token first if we don't have it.

    try {
        // Fetch user info from Google to get email
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const userInfo = await userInfoRes.json();
        const email = userInfo.email;

        if (!email) {
            console.error("getUserProfile: Failed to resolve email from Google");
            throw new Error("Failed to resolve email");
        }

        console.log("getUserProfile: Fetching profile for", email);
        const url = `${APPS_SCRIPT_URL}?action=getUserProfile&email=${encodeURIComponent(email)}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("getUserProfile: Response", data);

        if (data.error) throw new Error(data.error);

        // Merge with default to ensure consistency
        // Note: We attach the email to the profile object for reference
        return { ...DEFAULT_PROFILE, ...data, email };

    } catch (error) {
        console.error("Profile Fetch Error:", error);
        return DEFAULT_PROFILE;
    }
};

/**
 * Save User Profile via Proxy
 */
export const saveUserProfile = async (token, profile) => {
    // Similar to fetch, we need email. It should be in the profile now.
    if (!profile.email) {
        console.error("Cannot save profile: Email missing");
        return profile;
    }

    try {
        // We use GET for simplicity as per plan, stringifying data
        const dataStr = JSON.stringify(profile);
        const url = `${APPS_SCRIPT_URL}?action=saveUserProfile&email=${encodeURIComponent(profile.email)}&data=${encodeURIComponent(dataStr)}`;

        // Use POST if possible to avoid URL length limits, but script `doPost` calls `doGet` so it handles parameters same way.
        // Actually, for large data, we should use POST body.
        // Let's stick to the plan's simple GET/POST dual support.
        // If data is too long, this might fail, but for simple profile it's likely fine.
        // Better: Use POST with body.

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: new URLSearchParams({
                action: 'saveUserProfile',
                email: profile.email,
                data: dataStr
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
    if (!profile.email) {
        console.warn("checkDailyLogin: No email in profile, skipping.");
        return { awarded: false, newProfile: profile };
    }

    try {
        console.log("checkDailyLogin: Attempting claim for", profile.email);
        const url = `${APPS_SCRIPT_URL}?action=claimDailyBonus&email=${encodeURIComponent(profile.email)}`;
        const response = await fetch(url);
        const result = await response.json();
        console.log("checkDailyLogin: Result", result);

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
        console.error("Daily Bonus Check Failed:", e);
        return { awarded: false, newProfile: profile };
    }
};
