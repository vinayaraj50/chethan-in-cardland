
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useLessons } from '../hooks/useLessons'; // Adjust path if needed
import { useUI } from './UIContext';

const LessonContext = createContext(null);

export const LessonProvider = ({ children }) => {
    const { user, hasDrive } = useAuth();
    const { showNotification } = useUI();

    // We lift the hook usage here.
    // Note: useLessons was originally designed to take setNotification.
    // Ideally, Notification should also be a context, but for now we might need to pass it or refactor UIContext first.
    // BETTER APPROACH: UIContext should come first so we can use useNotification() here.

    // Adapter for useLessons which expects an object { type, message } setter
    const setNotificationAdapter = useCallback((notif) => {
        if (!notif) return; // Handle null clear?
        showNotification(notif.type, notif.message, notif.onConfirm);
    }, [showNotification]);

    const lessonData = useLessons(user, hasDrive, setNotificationAdapter);

    return (
        <LessonContext.Provider value={lessonData}>
            {children}
        </LessonContext.Provider>
    );
};

export const useLesson = () => {
    const context = useContext(LessonContext);
    if (!context) {
        throw new Error('useLesson must be used within a LessonProvider');
    }
    return context;
};
