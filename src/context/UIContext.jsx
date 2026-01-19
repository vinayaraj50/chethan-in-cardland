import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import NotificationModal from '../components/NotificationModal'; // Adjust path
import Toast from '../components/common/Toast';

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);
    const [toast, setToast] = useState(null);
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

    const [headerLoading, setHeaderLoading] = useState(false);

    const [activeLesson, setActiveLesson] = useState(null); // For Add/Edit modal
    const [reviewLesson, setReviewLesson] = useState(null); // For Review modal
    const [noteLesson, setNoteLesson] = useState(null); // For Important Note popup

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
        setActiveLesson(null);
        setReviewLesson(null);
        setNoteLesson(null);
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

    // Toast Helper
    const showToast = useCallback(({ message, type = 'info', onUndo = null, duration = 5000, onClose = null }) => {
        setToast({
            id: Date.now(),
            message,
            type,
            onUndo,
            duration,
            onCloseCallback: onClose // Store custom onClose callback
        });
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => {
            if (prev?.onCloseCallback) prev.onCloseCallback(); // Run callback if exists (e.g. to finalize delete)
            return null;
        });
    }, []);

    return (
        <UIContext.Provider value={{
            modals,
            toggleModal,
            closeAllModals,
            activeLesson, setActiveLesson,
            reviewLesson, setReviewLesson,
            noteLesson, setNoteLesson,
            notification,
            showNotification,
            clearNotification,
            showToast,
            hideToast,
            headerLoading, setHeaderLoading
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

            {/* Global Toast Rendered Here */}
            <AnimatePresence>
                {toast && (
                    <Toast
                        key={toast.id} // Key ensures re-mount on new toast
                        message={toast.message}
                        type={toast.type}
                        onUndo={toast.onUndo}
                        onClose={hideToast}
                        duration={toast.duration}
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
