import { userService } from './userService';
import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * AdminRepository - Refactored for Firebase Era (2026)
 * 
 * Strategy:
 * 1. Authoritative: Uses Firestore as primary source of truth.
 * 2. Simplified: Removes complex Drive scanning/indexing logic.
 * 3. Atomic: Leverages Firestore transactions for balance updates.
 */

class AdminRepository {
    /**
     * Primary Discovery Method: Firestore Collection
     */
    static async getUsers(token, referenceId, forceRefresh = false) {
        try {
            console.log('[AdminService] Fetching authoritative registry from Firestore...');
            const users = await userService.listUsers();

            // Map Firestore structure to UI-expected schema
            return users.map(u => ({
                id: u.id || u.uid || u.email,
                uid: u.uid || u.id,
                email: u.email,
                displayName: u.displayName || 'Guest User',
                lastLogin: u.lastSeen?.toDate?.()?.toISOString() || null,
                coins: u.coins || 0,
                loginCount: u.loginCount || 0
            }));
        } catch (error) {
            console.error('[AdminService] Registry Sync Failed:', error);
            throw error;
        }
    }

    /**
     * Grant Coins via Firestore Transaction
     */
    static async grantCoins(token, userObj, amount) {
        // Target Identification: UID is authoritative, fallback to Email lookup
        let uid = userObj.uid;

        // If uid missing from payload, check if 'id' field contains it (common in our Repository pattern)
        if (!uid && userObj.id && !userObj.id.includes('@')) {
            uid = userObj.id;
        }

        // If still missing, we must perform an authoritative lookup by email
        if (!uid && userObj.email) {
            console.log(`[AdminService] UID missing for ${userObj.email}, performing lookup...`);
            const profile = await userService.getProfileByEmail(userObj.email);
            uid = profile?.uid || profile?.id;
        }

        if (!uid) throw new Error("Could not identify user ID for transaction.");

        console.log(`[AdminService] Granting ${amount} coins to ${uid} via Secure Cloud Function...`);

        try {
            const grantCoinsFn = httpsCallable(functions, 'grantCoins');
            const result = await grantCoinsFn({ uid, amount });

            // Result.data contains the return value from the function
            const { newBalance } = result.data;

            return {
                success: true,
                newBalance,
                email: userObj.email
            };
        } catch (error) {
            console.error('[AdminService] Grant Coins failed:', error);
            const errorMessage = error.message || "Unknown error occurred";

            if (errorMessage.includes("permission-denied")) {
                throw new Error("Permission Denied: You are not authorized to grant coins.");
            }
            throw new Error(`Grant failed: ${errorMessage}`);
        }
    }

    static async getPrompts() {
        // Placeholder for future Firestore prompts collection
        return [];
    }
}

export const adminService = AdminRepository;
