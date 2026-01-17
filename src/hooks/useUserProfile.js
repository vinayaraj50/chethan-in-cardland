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

    useEffect(() => {
        if (!user?.uid) {
            setUserProfile(null);
            return;
        }

        let isMounted = true;

        const syncProfile = async () => {
            if (!userProfile) setIsLoading(true);

            try {
                // 1. Authoritative Sync (Firestore)
                const profile = await userService.syncProfile(user);
                if (!isMounted) return;

                // 2. Referral Logic (Check LocalStorage for pending)
                const pendingRef = localStorage.getItem('pendingReferral');
                if (pendingRef && !profile.referredBy) {
                    const success = await userService.applyReferral(user.uid, pendingRef);
                    if (success) {
                        localStorage.removeItem('pendingReferral');
                        if (showAlert) showAlert({ type: 'alert', message: 'Referral bonus applied!' });
                        // Re-sync to get new balance
                        return syncProfile();
                    }
                }

                // 3. Daily Bonus Logic (Firestore Transaction)
                const bonusResult = await userService.checkDailyBonus(user.uid);
                if (!isMounted) return;

                if (bonusResult.awarded) {
                    if (setRewardData) setRewardData({ amount: bonusResult.bonus, type: 'Daily Login' });
                    profile.coins = bonusResult.newBalance;
                }

                // 4. External Grant Detection (for visual celebratory effects)
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
        if (!userProfile) return;
        setUserProfile(prev => ({ ...prev, coins: newCoins }));
    }, [userProfile]);

    return {
        userProfile,
        setUserProfile,
        isProfileLoading: isLoading,
        handleUpdateCoins,
        loadProfile: useCallback(() => setRefreshTrigger(prev => prev + 1), [])
    };
};
