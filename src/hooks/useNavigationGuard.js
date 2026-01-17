/**
 * useNavigationGuard.js
 * 
 * A high-integrity hook designed for Big Tech production environments.
 * Encapsulates navigation lifecycle management to prevent accidental data loss
 * or session disruption.
 * 
 * Features:
 * 1. BeforeUnload: Protects against refresh/close/external links.
 * 2. History Sentinel: Traps back-button at the root level to allow themed confirmation.
 * 3. Atomic Exit: Provides a safe mechanism for intentional navigation.
 * 
 * @param {boolean} enabled - Whether the guard is active.
 * @param {string} browserMessage - The message shown by some browsers on beforeunload.
 */
import { useEffect, useCallback, useRef } from 'react';

export const useNavigationGuard = (enabled, browserMessage = '') => {
    const isExiting = useRef(false);

    // 1. Browser-level Guard (Refresh, Tab Close, External Links)
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (enabled && !isExiting.current) {
                // Standard preventative measures
                event.preventDefault();
                // Chrome/Edge/Safari require returnValue to be set to trigger the prompt
                event.returnValue = browserMessage;
                return browserMessage;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [enabled, browserMessage]);

    /**
     * Call this to bypass the guard for intentional navigation (e.g. Logout).
     */
    const allowExit = useCallback(() => {
        isExiting.current = true;
    }, []);

    /**
     * Sentinel Management
     * When enabled, ensures there is always a 'popable' state in the history stack.
     * This allows us to catch the back-button event before the user leaves the site.
     */
    useEffect(() => {
        if (enabled && !isExiting.current) {
            // If the current state isn't our guarded state, push it.
            if (window.history.state?.guard !== 'active') {
                window.history.pushState({ guard: 'active' }, '');
            }
        }
    }, [enabled]);

    return { allowExit };
};
