import { db, functions } from './firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    getDocs,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

/**
 * userService - Authoritative User Profile Management via Firestore
 * 
 * 2026 Industry Standard:
 * 1. Server-Side Enforcement for Financials.
 * 2. Identity-first Discovery.
 */

const USERS_COLLECTION = 'users';

export const userService = {
    /**
     * Synchronize a user profile with Firestore.
     */
    async syncProfile(authUser, incrementLogin = false) {
        if (!authUser?.uid) return null;

        const userRef = doc(db, USERS_COLLECTION, authUser.uid);
        const userSnap = await getDoc(userRef);

        const profileData = {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName || 'Learner',
            photoURL: authUser.photoURL || null,
            lastSeen: serverTimestamp()
        };

        if (!userSnap.exists()) {
            const initialData = {
                ...profileData,
                coins: 0,
                totalReviews: 0,
                loginCount: 1,
                createdAt: serverTimestamp()
            };
            await setDoc(userRef, initialData);
            return { ...initialData, id: authUser.uid };
        } else {
            const currentData = userSnap.data();
            const updatePayload = {
                ...profileData,
                loginCount: incrementLogin ? (currentData.loginCount || 0) + 1 : (currentData.loginCount || 1)
            };
            await updateDoc(userRef, updatePayload);
            return { ...currentData, ...updatePayload };
        }
    },

    async getProfile(uid) {
        if (!uid) return null;
        const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
        return snap.exists() ? { ...snap.data(), id: snap.id } : null;
    },

    /**
     * ENTITLEMENT MANAGEMENT
     */

    /**
     * getEntitlements - Fetch the authoritative ledger of owned lessons.
     * @param {string} uid 
     * @returns {Promise<Object>} Map of lessonId -> { purchaseDate, cost, archived }
     */
    async getEntitlements(uid) {
        if (!uid) return {};
        const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
        if (!snap.exists()) return {};
        return snap.data().purchasedLessons || {};
    },

    /**
     * archiveLesson - Mark a lesson as archived (deleted from local) but still owned.
     * Use this instead of hard deleting to allow for restore.
     */
    async archiveLesson(uid, lessonId) {
        if (!uid || !lessonId) return;
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            [`purchasedLessons.${lessonId}.archived`]: true,
            [`purchasedLessons.${lessonId}.archivedAt`]: serverTimestamp()
        });
    },

    /**
     * restoreLesson - Un-archive a lesson (user wants to re-download).
     */
    async restoreLesson(uid, lessonId) {
        if (!uid || !lessonId) return;
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            [`purchasedLessons.${lessonId}.archived`]: false,
            [`purchasedLessons.${lessonId}.restoredAt`]: serverTimestamp()
        });
    },

    /**
     * SECURE MONEY OPERATIONS (Cloud Functions)
     */

    async purchaseLesson(uid, lessonId, cost, title) {
        const purchaseFunc = httpsCallable(functions, 'purchaseLesson');
        const result = await purchaseFunc({ lessonId, cost, title });
        return result.data;
    },

    async checkDailyBonus(uid) {
        const bonusFunc = httpsCallable(functions, 'checkDailyBonus');
        const result = await bonusFunc();
        return result.data;
    },

    async applyReferral(uid, referralCode) {
        const referralFunc = httpsCallable(functions, 'applyReferral');
        const result = await referralFunc({ referralCode });
        return result.data;
    },

    async checkReferralCompletion(uid, lessonId, isDemo, isUserCreated) {
        const checkFunc = httpsCallable(functions, 'checkReferralCompletion');
        const result = await checkFunc({ lessonId, isDemo, isUserCreated });
        return result.data;
    },

    // updateBalance is deprecated for general use. 
    // Use specific business logic functions above instead.
    async updateBalance(uid, amount) {
        throw new Error("Direct balance updates are disabled for security. Use specific action functions.");
    },

    async adminAddCoins(uid, amount) {
        const adminAddFunc = httpsCallable(functions, 'grantCoins');
        const result = await adminAddFunc({ uid, amount });
        return result.data;
    },

    async listUsers() {
        const q = query(collection(db, USERS_COLLECTION));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), id: d.id }));
    }
};
