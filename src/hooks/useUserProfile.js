import { useState, useCallback, useEffect, useRef } from 'react';
import { userService } from '../services/userService';

/**
 * useUserProfile - Authoritative hook for user engagement and state.
 * Refactored to strictly use Firestore (2026 Strategy).
 */
export const useUserProfile = (user, showAlert, setRewardData) => {
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const prevCoinsRef = useRef(0);

    const lastRecordedUid = useRef(null);

    useEffect(() => {
        if (!user?.uid) {
            setUserProfile(null);
            return;
        }

        let isMounted = true;

        const syncProfile = async () => {
            if (!userProfile) setIsLoading(true);

            try {
                // 1. Determine if this is a fresh login for this session
                const isFreshLogin = lastRecordedUid.current !== user.uid;

                // 2. Authoritative Sync (Firestore)
                // Only increment login count if it's a fresh login
                const profile = await userService.syncProfile(user, isFreshLogin);

                if (!isMounted) return;

                if (isFreshLogin) {
                    lastRecordedUid.current = user.uid;
                }

                // 3. Referral Logic (Check LocalStorage for pending)
                const pendingRef = localStorage.getItem('pendingReferral');
                if (pendingRef && !profile.referredBy) {
                    const success = await userService.applyReferral(user.uid, pendingRef);
                    if (success) {
                        localStorage.removeItem('pendingReferral');
                        if (showAlert) showAlert({ type: 'alert', message: 'Referral bonus applied!' });
                        // Re-sync to get new balance (don't increment login again)
                        const updated = await userService.syncProfile(user, false);
                        if (isMounted) setUserProfile(updated);
                        return;
                    }
                }

                // 4. Daily Bonus Logic (Firestore Transaction)
                const bonusResult = await userService.checkDailyBonus(user.uid);
                if (!isMounted) return;

                if (bonusResult.awarded) {
                    if (setRewardData) setRewardData({ amount: bonusResult.bonus, type: 'Daily Login' });
                    profile.coins = bonusResult.newBalance;
                }

                // 5. External Grant Detection (for visual celebratory effects)
                if (profile.coins > prevCoinsRef.current && prevCoinsRef.current > 0) {
                    const diff = profile.coins - prevCoinsRef.current;
                    if (setRewardData) setRewardData({ amount: diff, type: 'Gift Received' });
                }

                prevCoinsRef.current = profile.coins;
                setUserProfile(profile);

            } catch (error) {
                console.error("[useUserProfile] Sync Failed:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        syncProfile();

        // Refresh on tab focus (Industry Standard for real-time consistency)
        const handleFocus = () => {
            if (document.visibilityState === 'visible' && user?.uid) syncProfile();
        };
        window.addEventListener('visibilitychange', handleFocus);
        return () => {
            isMounted = false;
            window.removeEventListener('visibilitychange', handleFocus);
        };
    }, [user?.uid, showAlert, setRewardData, refreshTrigger]);

    const handleUpdateCoins = useCallback((newCoins) => {
        if (!user || !userProfile) return;
        // Optimistic UI update
        setUserProfile(prev => ({ ...prev, coins: newCoins }));
    }, [user, userProfile]);

    return {
        userProfile,
        setUserProfile,
        isProfileLoading: isLoading,
        handleUpdateCoins,
        loadProfile: useCallback(() => setRefreshTrigger(prev => prev + 1), [])
    };
};
