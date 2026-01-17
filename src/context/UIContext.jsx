import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import NotificationModal from '../components/NotificationModal'; // Adjust path

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);
    const [modals, setModals] = useState({
        showMenu: false,
        showAddModal: false,
        showFeedback: false,
        showKnowMore: false,
        showReferral: false,
        showAdminPanel: false,
        showCoinModal: false,
        showLoginPrompt: false,
        showNamePrompt: false,
        showAdminQuickTools: false
    });

    const [activeStack, setActiveStack] = useState(null); // For Add/Edit modal
    const [reviewStack, setReviewStack] = useState(null); // For Review modal
    const [noteStack, setNoteStack] = useState(null); // For Important Note popup

    // Helper to close all modals or specific ones
    const closeAllModals = useCallback(() => {
        setModals({
            showMenu: false,
            showAddModal: false,
            showFeedback: false,
            showKnowMore: false,
            showReferral: false,
            showAdminPanel: false,
            showCoinModal: false,
            showLoginPrompt: false,
            showNamePrompt: false,
            showAdminQuickTools: false
        });
        setActiveStack(null);
        setReviewStack(null);
        setNoteStack(null);
    }, []);

    const toggleModal = useCallback((modalName, value = null) => {
        setModals(prev => ({
            ...prev,
            [modalName]: value !== null ? value : !prev[modalName]
        }));
    }, []);

    // Notification Helper
    const showNotification = useCallback((type, message, onConfirm = null) => {
        setNotification({ type, message, onConfirm });
    }, []);

    const clearNotification = useCallback(() => {
        setNotification(null);
    }, []);

    return (
        <UIContext.Provider value={{
            modals,
            toggleModal,
            closeAllModals,
            activeStack, setActiveStack,
            reviewStack, setReviewStack,
            noteStack, setNoteStack,
            notification,
            showNotification,
            clearNotification
        }}>
            {children}
            {/* Global Notification Rendered Here */}
            <AnimatePresence>
                {notification && (
                    <NotificationModal
                        type={notification.type}
                        message={notification.message}
                        onConfirm={notification.onConfirm}
                        onClose={clearNotification}
                    />
                )}
            </AnimatePresence>
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
