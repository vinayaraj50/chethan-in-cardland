import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const TourContext = createContext(null);

/**
 * Enterprise Tour Provider
 * Manages tour lifecycle, step progression, and post-tour event orchestration.
 */
export const TourProvider = ({ children }) => {
    const [state, setState] = useState({
        isActive: false,
        currentStep: 1,
        isComplete: localStorage.getItem('tour_complete') === 'true',
        isDemoGracePeriod: false, // Prevents tour logic during active demo
        eventQueue: []
    });

    const idleTimerRef = useRef(null);

    // Persist completion state
    useEffect(() => {
        if (state.isComplete) {
            localStorage.setItem('tour_complete', 'true');
        }
    }, [state.isComplete]);

    const startTour = useCallback(() => {
        setState(prev => ({ ...prev, isActive: true, currentStep: 1 }));
    }, []);

    const endTour = useCallback(() => {
        setState(prev => ({ ...prev, isActive: false, currentStep: 1 }));
    }, []);

    const nextStep = useCallback(() => {
        setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }, []);

    const setStep = useCallback((step) => {
        setState(prev => ({ ...prev, currentStep: step }));
    }, []);

    /**
     * Post-Tour Event Queue
     * Ensures popups/rewards only trigger when user is in a "Neutral" state.
     */
    const queuePostTourEvent = useCallback((event) => {
        setState(prev => ({
            ...prev,
            eventQueue: [...prev.eventQueue, event]
        }));
    }, []);

    const processNextEvent = useCallback(() => {
        if (state.eventQueue.length === 0) return;

        const [next, ...remaining] = state.eventQueue;
        next(); // Execute the callback
        setState(prev => ({ ...prev, eventQueue: remaining }));
    }, [state.eventQueue]);

    // Activity detector for "Neutral State" processing
    useEffect(() => {
        if (state.eventQueue.length === 0 || state.isActive) return;

        const handleActivity = () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            // Wait for 3 seconds of inactivity before processing queue
            idleTimerRef.current = setTimeout(() => {
                processNextEvent();
            }, 3000);
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [state.eventQueue, state.isActive, processNextEvent]);

    const value = {
        ...state,
        startTour,
        endTour,
        nextStep,
        setStep,
        queuePostTourEvent,
        setIsDemoGracePeriod: (val) => setState(prev => ({ ...prev, isDemoGracePeriod: val }))
    };

    return (
        <TourContext.Provider value={value}>
            {children}
        </TourContext.Provider>
    );
};

export const useTour = () => {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};
