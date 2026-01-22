import { onCall, HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";

const ADMIN_EMAILS = [
    "chethanincardland@gmail.com"
];

/**
 * Grant Coins to a user.
 * Restricted to Admins only.
 */
export const grantCoins = onCall(async (request) => {
    const { data, auth } = request;

    // 1. Authentication Check
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const callerEmail = auth.token.email;
    const callerUid = auth.uid;

    // 2. Admin Authorization Check
    if (!ADMIN_EMAILS.includes(callerEmail)) {
        console.warn(`Unauthorized grant attempt by ${callerEmail} (${callerUid})`);
        throw new HttpsError(
            "permission-denied",
            "You do not have permission to grant coins."
        );
    }

    // 3. Input Validation
    const targetUid = data.uid;
    const amount = parseInt(data.amount);

    if (!targetUid || typeof targetUid !== "string") {
        throw new HttpsError(
            "invalid-argument",
            "The function must be called with a valid 'uid'."
        );
    }

    if (!Number.isInteger(amount)) {
        throw new HttpsError(
            "invalid-argument",
            "The function must be called with an integer 'amount'."
        );
    }

    // 4. Execution (Atomic Transaction)
    const db = admin.firestore();
    const userRef = db.collection("users").doc(targetUid);
    const auditRef = db.collection("audit_logs").doc();

    try {
        const newBalance = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new HttpsError("not-found", "User not found.");
            }

            const currentCoins = userDoc.data().coins || 0;
            const updatedCoins = currentCoins + amount;

            // Update User Balance
            transaction.update(userRef, {
                coins: updatedCoins,
                lastCoinUpdate: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Write Audit Log
            transaction.set(auditRef, {
                action: "GRANT_COINS",
                adminEmail: callerEmail,
                adminUid: callerUid,
                targetUid: targetUid,
                amount: amount,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                previousBalance: currentCoins,
                newBalance: updatedCoins,
                app: "chethan-in-cardland"
            });

            return updatedCoins;
        });

        return {
            success: true,
            newBalance: newBalance,
            targetUid: targetUid,
            grantedAmount: amount,
        };
    } catch (error) {
        console.error("Transaction failure:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError(
            "internal",
            "Transaction failed",
            error.message
        );
    }
});
