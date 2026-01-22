import { onCall, HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";

const USERS_COLLECTION = 'users';

/**
 * purchaseLesson - Atomic lesson purchase on service side.
 * Validates balance and grants entitlement in a single transaction.
 */
export const purchaseLesson = onCall(async (request) => {
    // 1. Verify Authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in to purchase lessons.");
    }

    const uid = request.auth.uid;
    const { lessonId, cost } = request.data;

    if (!lessonId || cost === undefined) {
        throw new HttpsError("invalid-argument", "Missing lessonId or cost.");
    }

    const db = admin.firestore();
    const userRef = db.collection(USERS_COLLECTION).doc(uid);

    try {
        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new HttpsError("not-found", "User profile not found.");
            }

            const userData = userDoc.data();
            const currentCoins = userData.coins || 0;

            // 2. Validate Balance
            if (currentCoins < cost) {
                throw new HttpsError("failed-precondition", "Insufficient coins.");
            }

            // 3. Check if already purchased (Idempotency)
            const purchases = userData.purchasedLessons || {};
            if (purchases[lessonId]) {
                return { success: true, alreadyOwned: true };
            }

            // 4. Atomic Update
            const updatedCoins = Math.max(0, currentCoins - cost);

            // Record entitlement in user doc
            transaction.update(userRef, {
                coins: updatedCoins,
                [`purchasedLessons.${lessonId}`]: {
                    purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
                    cost: cost,
                    title: request.data.title || 'Untitled Lesson',
                    archived: false
                }
            });

            // Create flat audit log
            const auditRef = db.collection('transactions').doc();
            transaction.set(auditRef, {
                userId: uid,
                type: 'purchase',
                lessonId: lessonId,
                title: request.data.title || 'Untitled Lesson',
                delta: -cost,
                balanceAfter: updatedCoins,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, newBalance: updatedCoins };
        });

        return result;
    } catch (error) {
        console.error("[PurchaseLesson] Error:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "An internal error occurred during purchase.");
    }
});

/**
 * checkDailyBonus - Verify and award daily login bonus on server.
 */
export const checkDailyBonus = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection(USERS_COLLECTION).doc(uid);

    try {
        return await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return { awarded: false };

            const data = userDoc.data();
            const lastBonusDate = data.lastBonusDate;
            const lastBonus = lastBonusDate ? (lastBonusDate.toDate ? lastBonusDate.toDate() : new Date(lastBonusDate)) : new Date(0);

            // Server-side date validation
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (lastBonus < today) {
                const bonus = 10;
                const newCoins = (data.coins || 0) + bonus;
                transaction.update(userRef, {
                    coins: newCoins,
                    lastBonusDate: admin.firestore.FieldValue.serverTimestamp()
                });
                return { awarded: true, bonus, newBalance: newCoins };
            }

            return { awarded: false };
        });
    } catch (error) {
        console.error("[DailyBonus] Error:", error);
        throw new HttpsError("internal", "Failed to process daily bonus.");
    }
});

/**
 * applyReferral - Server-side referral code processing.
 * Validates first-time users and marks referral as pending until first lesson completion.
 */
export const applyReferral = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { referralCode } = request.data;
    if (!referralCode) {
        throw new HttpsError("invalid-argument", "Missing referral code.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection(USERS_COLLECTION).doc(uid);

    try {
        return await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new HttpsError("not-found", "User profile not found.");

            const userData = userDoc.data();

            // Enforce first-time user validation
            if (userData.referredBy) {
                throw new HttpsError("already-exists", "You have already used a referral code.");
            }

            // Check if user has ever completed a lesson (abuse prevention)
            if (userData.totalReviews && userData.totalReviews > 0) {
                throw new HttpsError("failed-precondition", "Referral codes can only be used by new users who haven't completed any lessons yet.");
            }

            // Search for referrer
            const referrerQuery = await db.collection(USERS_COLLECTION)
                .where('referralCode', '==', referralCode)
                .limit(1)
                .get();

            if (referrerQuery.empty) {
                throw new HttpsError("not-found", "Invalid referral code.");
            }

            const referrerDoc = referrerQuery.docs[0];
            const referrerId = referrerDoc.id;

            // Prevent self-referral
            if (referrerId === uid) {
                throw new HttpsError("invalid-argument", "You cannot refer yourself.");
            }

            // Mark referral as pending (reward granted after first lesson completion)
            transaction.update(userRef, {
                referredBy: referralCode,
                referrerId: referrerId,
                referralStatus: 'pending', // Will become 'completed' after first lesson
                referralAppliedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, message: "Referral code applied! Your referrer will receive coins when you complete your first lesson." };
        });
    } catch (error) {
        console.error("[ApplyReferral] Error:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Failed to apply referral.");
    }
});

/**
 * checkReferralCompletion - Rewards referrer when new user completes first qualified lesson.
 * Called after a user completes a lesson review.
 * Only rewards for non-demo, non-user-created lessons.
 */
export const checkReferralCompletion = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { lessonId, isDemo, isUserCreated } = request.data;
    const uid = request.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection(USERS_COLLECTION).doc(uid);

    try {
        return await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                return { rewarded: false, reason: 'User not found' };
            }

            const userData = userDoc.data();

            // Check if user has a pending referral
            if (userData.referralStatus !== 'pending') {
                return { rewarded: false, reason: 'No pending referral' };
            }

            // Validate lesson qualifies for referral bonus
            if (isDemo) {
                return { rewarded: false, reason: 'Demo lessons do not count for referral bonus' };
            }

            if (isUserCreated) {
                return { rewarded: false, reason: 'User-created lessons do not count for referral bonus' };
            }

            // Get referrer
            const referrerId = userData.referrerId;
            if (!referrerId) {
                return { rewarded: false, reason: 'Referrer ID not found' };
            }

            const referrerRef = db.collection(USERS_COLLECTION).doc(referrerId);
            const referrerDoc = await transaction.get(referrerRef);

            if (!referrerDoc.exists) {
                return { rewarded: false, reason: 'Referrer not found' };
            }

            // Award coins to referrer
            const REFERRAL_BONUS = 50;
            transaction.update(referrerRef, {
                coins: admin.firestore.FieldValue.increment(REFERRAL_BONUS)
            });

            // Mark referral as completed
            transaction.update(userRef, {
                referralStatus: 'completed',
                referralCompletedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Create audit log
            const auditRef = db.collection('transactions').doc();
            transaction.set(auditRef, {
                userId: referrerId,
                type: 'referral_bonus',
                referredUserId: uid,
                lessonId: lessonId,
                delta: REFERRAL_BONUS,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            return {
                rewarded: true,
                bonus: REFERRAL_BONUS,
                referrerEmail: referrerDoc.data().email
            };
        });
    } catch (error) {
        console.error("[CheckReferralCompletion] Error:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Failed to process referral completion.");
    }
});

