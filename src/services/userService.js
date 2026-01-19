import { db } from './firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    getDocs,
    where,
    serverTimestamp,
    runTransaction
} from 'firebase/firestore';

/**
 * userService - Authoritative User Profile Management via Firestore
 * 
 * 2026 Industry Standard:
 * 1. ACID Transactions for Coin Balances.
 * 2. Real-time Synchronization.
 * 3. Identity-first Discovery.
 */

const USERS_COLLECTION = 'users';

export const userService = {
    /**
     * Synchronize a user profile with Firestore.
     * Updates identifying info and merges balances if necessary.
     */
    async syncProfile(authUser, existingProfile = {}) {
        console.log('[UserService] syncProfile called with:', {
            uid: authUser?.uid,
            email: authUser?.email
        });

        if (!authUser?.uid) {
            console.warn('[UserService] syncProfile aborted: No UID provided');
            return null;
        }

        const userRef = doc(db, USERS_COLLECTION, authUser.uid);
        const userSnap = await getDoc(userRef);

        const profileData = {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName || existingProfile.displayName || 'Learner',
            photoURL: authUser.photoURL || null,
            lastSeen: serverTimestamp(),
            // Only set these if it's a new user
            coins: existingProfile.coins || 0,
            totalReviews: existingProfile.totalReviews || 0,
            loginCount: (existingProfile.loginCount || 0) + 1,
        };

        if (!userSnap.exists()) {
            // New User Registration
            await setDoc(userRef, {
                ...profileData,
                createdAt: serverTimestamp(),
            });
            return { ...profileData, id: authUser.uid };
        } else {
            // Existing User Update
            const currentData = userSnap.data();
            const updatePayload = {
                displayName: authUser.displayName || currentData.displayName,
                photoURL: authUser.photoURL || currentData.photoURL,
                lastSeen: serverTimestamp(),
                loginCount: (currentData.loginCount || 0) + 1
            };
            await updateDoc(userRef, updatePayload);
            return { ...currentData, ...updatePayload };
        }
    },

    /**
     * Fetch a profile by UID.
     */
    async getProfile(uid) {
        if (!uid) return null;
        const userRef = doc(db, USERS_COLLECTION, uid);
        const snap = await getDoc(userRef);
        return snap.exists() ? { ...snap.data(), id: snap.id } : null;
    },

    /**
     * Discover a user by email (Admin Path).
     */
    async getProfileByEmail(email) {
        if (!email) return null;
        const q = query(collection(db, USERS_COLLECTION), where('email', '==', email));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return { ...snap.docs[0].data(), id: snap.docs[0].id };
    },

    /**
     * List all users (Admin Path).
     */
    async listUsers() {
        const q = query(collection(db, USERS_COLLECTION));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), id: d.id }));
    },

    /**
     * Update coin balance via Transaction to ensure atomicity.
     */
    async updateBalance(uid, amount) {
        const userRef = doc(db, USERS_COLLECTION, uid);
        return await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User does not exist!");

            const newCoins = (userDoc.data().coins || 0) + Number(amount);
            transaction.update(userRef, { coins: newCoins });
            return newCoins;
        });
    },

    /**
     * Process Daily Login Bonus
     */
    async checkDailyBonus(uid) {
        const userRef = doc(db, USERS_COLLECTION, uid);
        return await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) return { awarded: false };

            const data = userDoc.data();
            const lastBonus = data.lastBonusDate?.toDate() || new Date(0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (lastBonus < today) {
                const bonus = 10; // Daily Login Reward
                const newCoins = (data.coins || 0) + bonus;
                transaction.update(userRef, {
                    coins: newCoins,
                    lastBonusDate: serverTimestamp()
                });
                return { awarded: true, bonus, newBalance: newCoins };
            }

            return { awarded: false };
        });
    },

    /**
     * Apply Referral Code
     */
    async applyReferral(uid, referralCode) {
        const userRef = doc(db, USERS_COLLECTION, uid);
        return await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists() || userDoc.data().referredBy) return false;

            // Search for the referrer profile
            const q = query(collection(db, USERS_COLLECTION), where('referralCode', '==', referralCode));
            const referrerSnap = await getDocs(q);

            if (referrerSnap.empty) return false;
            const referrerId = referrerSnap.docs[0].id;

            // 1. Update the New User
            transaction.update(userRef, {
                referredBy: referralCode,
                coins: (userDoc.data().coins || 0) + 50 // Signup Bonus
            });

            // 2. Reward the Referrer
            const referrerRef = doc(db, USERS_COLLECTION, referrerId);
            const referrerDoc = await transaction.get(referrerRef);
            transaction.update(referrerRef, {
                coins: (referrerDoc.data().coins || 0) + 100 // Referral Bounty
            });

            return true;
        });
    },
    /**
     * Purchase a lesson atomically.
     * Deducts coins and grants entitlement in a single transaction.
     */
    async purchaseLesson(uid, lessonId, cost) {
        const userRef = doc(db, USERS_COLLECTION, uid);
        return await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User does not exist!");

            const userData = userDoc.data();
            const currentCoins = userData.coins || 0;

            // 1. Validate Balance
            if (currentCoins < cost) {
                throw new Error("Insufficient coins.");
            }

            // 2. Check if already purchased (Idempotency)
            const purchases = userData.purchasedLessons || {};
            if (purchases[lessonId]) {
                return { success: true, alreadyOwned: true };
            }

            // 3. Execute Transaction
            const newCoins = currentCoins - cost;
            const newPurchases = {
                ...purchases,
                [lessonId]: {
                    purchaseDate: serverTimestamp(),
                    cost: cost
                }
            };

            transaction.update(userRef, {
                coins: newCoins,
                [`purchasedLessons.${lessonId}`]: {
                    purchaseDate: serverTimestamp(),
                    cost: cost
                }
            });

            return { success: true, newBalance: newCoins };
        });
    }
};
