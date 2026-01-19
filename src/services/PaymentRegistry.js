import { db } from './firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { userService } from './userService';

/**
 * @fileoverview PaymentRegistry - Refactored for Firestore (2026)
 * 
 * DESIGN PRINCIPLES:
 * 1. Authoritative: Firestore is the Ledger.
 * 2. Immutable Logs: Every transfer creates a transaction document.
 * 3. Atomic: Balanced updates viarunTransaction.
 */

export const TransactionStatus = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

export const TransactionType = {
    GRANT_COINS: 'GRANT_COINS',
    PURCHASE_LESSON: 'PURCHASE_LESSON'
};

class PaymentRegistry {
    static #instance = null;
    #subscribers = new Set();

    constructor() {
        if (PaymentRegistry.#instance) return PaymentRegistry.#instance;
        PaymentRegistry.#instance = this;
    }

    subscribe(callback) {
        this.#subscribers.add(callback);
        return () => this.#subscribers.delete(callback);
    }

    /**
    * Core Transfer Method: Grants coins via Firestore.
    */
    async executeTransfer(recipient, amount, adminToken) {
        const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const recipientEmail = typeof recipient === 'string' ? recipient : recipient.email;

        // 1. Identify Target UID
        let targetUid = recipient.uid;
        if (!targetUid) {
            const profile = await userService.getProfileByEmail(recipientEmail);
            targetUid = profile?.uid;
        }

        if (!targetUid) throw new Error(`User ${recipientEmail} not found in authoritative registry.`);

        try {
            // 2. Perform Atomic Update
            console.log(`[PaymentRegistry] Initiating transfer: ${amount} coins -> ${targetUid}`);
            const newBalance = await userService.updateBalance(targetUid, amount);

            // 3. Log Transaction (Audit Trail)
            const txRef = doc(collection(db, 'transactions'), txId);
            await setDoc(txRef, {
                type: TransactionType.GRANT_COINS,
                recipientUid: targetUid,
                recipientEmail,
                amount,
                status: TransactionStatus.COMPLETED,
                timestamp: serverTimestamp(),
                adminId: 'SYSTEM' // Could be updated with current admin UID if available
            });

            return { success: true, newBalance, transactionId: txId };

        } catch (error) {
            console.error('[PaymentRegistry] Transfer Failed:', error);
            throw error;
        }
    }
}

export const paymentRegistry = new PaymentRegistry();
