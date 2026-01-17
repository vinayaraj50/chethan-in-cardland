import { userService } from './userService';

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
                id: u.uid || u.email,
                uid: u.uid,
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
        const uid = userObj.uid || (await userService.getProfileByEmail(userObj.email))?.uid;
        if (!uid) throw new Error("Could not identify user ID for transaction.");

        console.log(`[AdminService] Granting ${amount} coins to ${uid}...`);
        const newBalance = await userService.updateBalance(uid, amount);

        return {
            success: true,
            newBalance,
            email: userObj.email
        };
    }

    static async getPrompts() {
        // Placeholder for future Firestore prompts collection
        return [];
    }
}

export const adminService = AdminRepository;
