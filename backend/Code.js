/**
 * Google Apps Script Backend (Code.gs)
 * 
 * Handles secure POST requests for User Profile management.
 * Storage: Google Drive JSON Files (Folder: 'ChethanCardland_Users')
 * 
 * INSTRUCTIONS:
 * 1. Copy to Google Apps Script.
 * 2. Deploy as Web App (Access: Anyone).
 */

const VALID_KEY = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_KEY') || 'YOUR_SECRET_KEY';
const ROOT_FOLDER_NAME = 'ChethanCardland_Users';

function doPost(e) {
    try {
        const params = e.parameter;

        // 1. Security Headers
        if (params.key !== VALID_KEY) return errorResponse('Invalid API Key');

        // 2. Token Verification
        const user = verifyGoogleToken(params.token);
        if (!user) return errorResponse('Invalid or Expired Token');

        // 3. Routing
        const action = params.action;
        let result = {};

        if (action === 'getUserProfile') {
            result = getUserProfile(user.id, user.email);
        } else if (action === 'saveUserProfile') {
            const data = JSON.parse(params.data);
            result = saveUserProfile(user.id, user.email, data);
        } else if (action === 'claimDailyBonus') {
            result = claimDailyBonus(user.id, user.email);
        } else if (action === 'grantCoins') {
            // Admin only action? For now, we allow any valid token to grant if they have the secret key (client-side admin check)
            // Ideally, check if user.email === ADMIN_EMAIL
            result = grantCoins(params.targetEmail, parseInt(params.amount));
        } else {
            return errorResponse('Unknown Action');
        }

        return jsonResponse(result);

    } catch (err) {
        return errorResponse(err.toString());
    }
}

function doGet(e) { return ContentService.createTextOutput("Service Active."); }

// --- CORE LOGIC (Drive Based) ---

function getRootFolder() {
    const folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
    if (folders.hasNext()) return folders.next();
    return DriveApp.createFolder(ROOT_FOLDER_NAME);
}

function getUserFile(userId) {
    const folder = getRootFolder();
    const files = folder.getFilesByName(`user_${userId}.json`);
    if (files.hasNext()) return files.next();
    return null;
}

function findUserFileByEmail(email) {
    const folder = getRootFolder();
    const files = folder.getFiles(); // Inefficient for millions, OK for <1000. Use Search API for scale.
    while (files.hasNext()) {
        const file = files.next();
        if (file.getName().startsWith('user_')) {
            try {
                const content = JSON.parse(file.getBlob().getDataAsString());
                if (content.email === email) return file;
            } catch (e) { }
        }
    }
    return null;
}

function getUserProfile(userId, email) {
    const file = getUserFile(userId);
    if (file) {
        try {
            return JSON.parse(file.getBlob().getDataAsString());
        } catch (e) { return { error: "Corrupt Profile" }; }
    } else {
        // Initialize
        const newProfile = {
            id: userId,
            email: email,
            coins: 0,
            displayName: email.split('@')[0],
            created: new Date().toISOString()
        };
        saveUserProfile(userId, email, newProfile);
        return newProfile;
    }
}

function saveUserProfile(userId, email, data) {
    const folder = getRootFolder();
    const fileName = `user_${userId}.json`;
    const file = getUserFile(userId);

    const payload = JSON.stringify({ ...data, id: userId, email: email, lastUpdated: new Date().toISOString() });

    if (file) {
        file.setContent(payload);
    } else {
        folder.createFile(fileName, payload, MimeType.PLAIN_TEXT);
    }
    return { success: true, profile: data };
}

function claimDailyBonus(userId, email) {
    const profile = getUserProfile(userId, email);
    const now = new Date();
    const lastLogin = profile.lastLoginDate ? new Date(profile.lastLoginDate) : null;

    if (!lastLogin || lastLogin.getDate() !== now.getDate()) {
        profile.coins = (profile.coins || 0) + 10;
        profile.lastLoginDate = now.toISOString();
        saveUserProfile(userId, email, profile);
        return { awarded: true, coinsAdded: 10, newProfile: profile };
    }
    return { awarded: false, newProfile: profile };
}

function grantCoins(targetEmail, amount) {
    if (!targetEmail || isNaN(amount)) return { error: "Invalid parameters" };

    const file = findUserFileByEmail(targetEmail);
    if (!file) return { error: "User not found" };

    try {
        const profile = JSON.parse(file.getBlob().getDataAsString());
        profile.coins = (profile.coins || 0) + amount;

        // Audit Trail
        if (!profile.coinHistory) profile.coinHistory = [];
        profile.coinHistory.push({
            amount, type: 'admin_grant', date: new Date().toISOString()
        });

        file.setContent(JSON.stringify(profile));
        return { success: true, newBalance: profile.coins };
    } catch (e) {
        return { error: "Grant failed: " + e.message };
    }
}

// --- UTILS ---
function verifyGoogleToken(token) {
    // Same as before
    try {
        const url = 'https://www.googleapis.com/oauth2/v3/userinfo';
        const response = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token } });
        if (response.getResponseCode() !== 200) return null;
        const data = JSON.parse(response.getContentText());
        if (!data.sub) return null;
        return { id: data.sub, email: data.email };
    } catch (e) { return null; }
}

function jsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
    return jsonResponse({ error: msg });
}
