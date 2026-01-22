import { useEffect, useRef, useCallback } from 'react';
import { userService } from '../services/userService';
import { storageService } from '../services/storageOrchestrator';
import { useAuth } from '../components/AuthProvider';
import { useUI } from '../context/UIContext';
import { decryptionService } from '../services/decryptionService';
import { getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';

/**
 * useEntitlementSync - The "Ghostbusters" Hook
 * 
 * Responsibility:
 * 1. Checks Firestore "Truth" (ownedLessons) vs Local Reality (IndexedDB).
 * 2. If a lesson is OWNED but MISSING (and NOT Archived), it Auto-Restores it.
 * 3. Handles the "Crash Recovery" scenario where a user buys but browser dies before save.
 */
export const useEntitlementSync = () => {
    const { user, token } = useAuth();
    const { showToast } = useUI();
    const isSyncing = useRef(false);

    const performSync = useCallback(async (isManual = false, onComplete = null) => {
        if (!user || !token || isSyncing.current) return;

        isSyncing.current = true;
        console.log(`[EntitlementSync] ${isManual ? 'Manual' : 'Auto'} audit started...`);

        try {
            // 1. Fetch Truth (Firestore Ledger)
            const entitlements = await userService.getEntitlements(user.uid);
            if (!entitlements || Object.keys(entitlements).length === 0) {
                if (isManual) showToast({ message: 'No purchased lessons found to restore.', type: 'info' });
                isSyncing.current = false;
                return;
            }

            // 2. Fetch Reality (Local Storage)
            const localIndex = await storageService.listLessons();
            const localIds = new Set(localIndex.map(l => l.id));

            // 3. Find Missing Souls
            const missingIds = Object.keys(entitlements).filter(id => {
                const entitlement = entitlements[id];
                // IGNORE if user explicitly archived (deleted) it
                if (entitlement.archived) return false;
                // IGNORE if we already have it locally
                if (localIds.has(id)) return false;
                return true;
            });

            if (missingIds.length === 0) {
                console.log('[EntitlementSync] All clear. No missing lessons.');
                if (isManual) showToast({ message: 'Your library is already up to date.', type: 'success' });
                isSyncing.current = false;
                return;
            }

            console.log(`[EntitlementSync] Found ${missingIds.length} missing lessons. Initiating restore...`, missingIds);

            // Only show restoration toast if manual OR if there are actually lessons to restore (to avoid noise)
            // But the user specifically asked for "Do it silently" on login.
            if (isManual) {
                showToast({
                    message: `Restoring ${missingIds.length} purchased lesson(s)...`,
                    type: 'info',
                    duration: 4000
                });
            }

            const { getPublicFileContent } = await import('../services/publicDrive');

            // 4. Auto-Restore
            let restoredCount = 0;
            for (const lessonId of missingIds) {
                try {
                    // A. Fetch Source Metadata from 'lessons' collection
                    const lessonRef = doc(db, 'lessons', lessonId);
                    const lessonSnap = await getDoc(lessonRef);

                    if (!lessonSnap.exists()) {
                        console.error(`[EntitlementSync] Cannot restore ${lessonId}: Metadata missing from catalog.`);
                        continue;
                    }

                    const sourceData = lessonSnap.data();

                    // B. Fetch Content from Storage
                    const storagePath = sourceData.storagePath || `lessons/${sourceData.type === 'premium' ? 'premium' : 'free'}/${lessonId}.enc`;
                    const rawContent = await getPublicFileContent(storagePath);

                    let finalLesson;
                    if (typeof rawContent === 'string') {
                        // FORCE REFRESH: Always get a fresh token before sensitive decryption
                        // CRITICAL: Use auth.currentUser directly to ensure we have the SDK object with .getIdToken()
                        // The 'user' from context might be a plain object or stripped version.
                        // BUG FIX: Deleting 'auth.currentUser' will cause 'getIdToken is not a function' for non-SDK objects.
                        const freshToken = await auth.currentUser?.getIdToken(true);
                        finalLesson = await decryptionService.decryptPublicLesson(rawContent, lessonId, freshToken);
                    } else {
                        finalLesson = rawContent;
                    }

                    finalLesson.id = lessonId;

                    // C. Save to Local Storage (Auth-bound sync handled by Orchestrator)
                    await storageService.saveLesson(finalLesson);
                    restoredCount++;
                    console.log(`[EntitlementSync] Restored ${lessonId} successfully.`);
                } catch (err) {
                    console.error(`[EntitlementSync] Failed to restore ${lessonId}:`, err);
                }
            }

            // 5. Finalize UI State (Triggers My Lessons refresh)
            if (restoredCount > 0 && onComplete) {
                await onComplete();
            }

            if (isManual) {
                showToast({
                    message: restoredCount > 0
                        ? `Successfully restored ${restoredCount} lesson(s).`
                        : 'No lessons were restored.',
                    type: restoredCount > 0 ? 'success' : 'info'
                });
            }

        } catch (err) {
            console.error('[EntitlementSync] Audit failed:', err);
            if (isManual) showToast({ message: 'Failed to restore purchases. Please try again.', type: 'error' });
        } finally {
            isSyncing.current = false;
        }
    }, [user, token, showToast]);

    useEffect(() => {
        if (!user || !token) return;
        const timer = setTimeout(() => performSync(false), 2000);
        return () => clearTimeout(timer);
    }, [user, token, performSync]);

    return { performSync };
};
