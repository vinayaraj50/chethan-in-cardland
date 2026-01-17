
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFlashcards } from '../hooks/useFlashcards'; // Adjust path if needed
import { useUI } from './UIContext';

const StackContext = createContext(null);

export const StackProvider = ({ children }) => {
    const { user, hasDrive } = useAuth();
    const { showNotification } = useUI();

    // We lift the hook usage here.
    // Note: useFlashcards was originally designed to take setNotification.
    // Ideally, Notification should also be a context, but for now we might need to pass it or refactor UIContext first.
    // BETTER APPROACH: UIContext should come first so we can use useNotification() here.

    // Adapter for useFlashcards which expects an object { type, message } setter
    const setNotificationAdapter = useCallback((notif) => {
        if (!notif) return; // Handle null clear?
        showNotification(notif.type, notif.message, notif.onConfirm);
    }, [showNotification]);

    const flashcardData = useFlashcards(user, hasDrive, setNotificationAdapter);

    return (
        <StackContext.Provider value={flashcardData}>
            {children}
        </StackContext.Provider>
    );
};

export const useStack = () => {
    const context = useContext(StackContext);
    if (!context) {
        throw new Error('useStack must be used within a StackProvider');
    }
    return context;
};
