import { useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useStack } from '../context/StackContext';
import { useUI } from '../context/UIContext';
import { useTour } from '../components/TourContext';
import { storageService } from '../services/storageOrchestrator';
import { ADMIN_EMAIL } from '../constants/config';

/**
 * useAppActions Hook
 * Centralized Service Layer for complex side-effects and cross-context operations.
 * Decouples business logic from the monolithic App.jsx.
 */
export const useAppActions = () => {
    const { user, signIn, signOut } = useAuth();
    const {
        handleUpdateLocalStack,
        deleteStack: apiHookDelete,
        fetchStacks,
        fetchPublicStacks,
        stacks,
        setPublicStacks,
        publicStacks
    } = useStack();
    const {
        toggleModal,
        setReviewStack,
        setNoteStack,
        showNotification,
        setActiveStack,
        modals
    } = useUI();
    const { queuePostTourEvent, endTour } = useTour();

    const handleImportStack = useCallback(async (stack, userProfile, handleUpdateCoins) => {
        if (!user) {
            queuePostTourEvent(() => handleImportStack(stack, userProfile, handleUpdateCoins));
            signIn();
            return;
        }

        const cost = stack.cost || 0;
        if (cost > 0) {
            if ((userProfile?.coins || 0) < cost) {
                showNotification('alert', `Not enough coins! You need ${cost} coins.`);
                return;
            }
            // Standard confirm for cost (Consider migrating to custom modal later)
            if (!window.confirm(`Buy "${stack.title}" for ${cost} coins?`)) return;
        }

        try {
            let stackToSave = { ...stack };
            if (stackToSave.isPublic && (!stackToSave.cards || stackToSave.cards.length === 0)) {
                const { getPublicFileContent } = await import('../services/publicDrive');
                const pathOrId = stackToSave.driveFileId || stackToSave.storagePath || stackToSave.id;
                const fullContent = await getPublicFileContent(pathOrId);
                if (fullContent && (fullContent.cards || typeof fullContent === 'string')) {
                    stackToSave = { ...stackToSave, ...(typeof fullContent === 'string' ? {} : fullContent), isPublic: true };
                } else {
                    throw new Error('Could not fetch stack cards for import.');
                }
            }

            const newStack = { ...stackToSave, id: Date.now().toString(), driveFileId: null, isPublic: false, cost: 0 };
            const savedStack = await storageService.saveStack(newStack);

            if (cost > 0) handleUpdateCoins(userProfile.coins - cost);

            handleUpdateLocalStack({ ...newStack, driveFileId: savedStack.driveFileId || savedStack.id });
            showNotification('alert', cost > 0 ? `Purchased "${stack.title}"!` : `Added "${stack.title}"!`);
        } catch (error) {
            showNotification('alert', `Operation failed: ${error.message}`);
        }
    }, [user, queuePostTourEvent, signIn, handleUpdateLocalStack, showNotification]);

    const handleDeleteStack = useCallback(async (stack) => {
        await apiHookDelete(stack);
        toggleModal('showAddModal', false);
        setReviewStack(null);
        setNoteStack(null);
    }, [apiHookDelete, toggleModal, setReviewStack, setNoteStack]);

    const handleDeleteAllData = useCallback(async (allowAppExit) => {
        if (!user) return;
        if (!window.confirm("Are you sure? This will delete ALL your cards. This cannot be undone.")) return;

        try {
            const userStacks = stacks.filter(s => s.driveFileId && !s.isPublic);
            for (const stack of userStacks) await apiHookDelete(stack);
            showNotification('alert', "All local data deleted.");
            allowAppExit();
            signOut();
        } catch (e) {
            showNotification('alert', `Cleanup partially failed: ${e.message}`);
        } finally {
            toggleModal('showMenu', false);
        }
    }, [user, stacks, apiHookDelete, signOut, showNotification, toggleModal]);

    const handleEditStack = useCallback(async (stack, fromAdminSection = null) => {
        // We'll manage adminContextRef externally or via a local state if needed
        let stackToEdit = stack;
        // Skip fetching for local stacks as they are already fully loaded
        if (stackToEdit.isPublic && !stackToEdit.isLocal && (!stackToEdit.cards || stackToEdit.cards.length === 0)) {
            try {
                const { getPublicFileContent } = await import('../services/publicDrive');
                const pathOrId = stackToEdit.driveFileId || stackToEdit.storagePath || stackToEdit.id;
                const fullContent = await getPublicFileContent(pathOrId);
                if (fullContent) {
                    stackToEdit = { ...stackToEdit, ...(typeof fullContent === 'string' ? {} : fullContent), isPublic: true };
                    setPublicStacks(prev => prev.map(p => p.id === stack.id ? stackToEdit : p));
                }
            } catch (e) { }
        }
        setActiveStack(stackToEdit);
        window.history.pushState({ modal: 'active' }, '', window.location.pathname);
        toggleModal('showAddModal', true);
    }, [user, setPublicStacks, setActiveStack, toggleModal]);

    const handleReviewLaunch = useCallback(async (s) => {
        let stackToReview = s;
        if (!stackToReview.cards?.length && stackToReview.isPublic && !stackToReview.isLocal) {
            try {
                const { getPublicFileContent } = await import('../services/publicDrive');
                const pathOrId = stackToReview.driveFileId || stackToReview.storagePath || stackToReview.id;
                const fullContent = await getPublicFileContent(pathOrId);
                if (fullContent) stackToReview = { ...stackToReview, ...(typeof fullContent === 'string' ? {} : fullContent) };
            } catch (e) {
                showNotification('alert', 'Failed to open.');
                return;
            }
        }
        stackToReview.importantNote ? setNoteStack(stackToReview) : setReviewStack(stackToReview);
    }, [user, showNotification, setNoteStack, setReviewStack]);

    return {
        handleImportStack,
        handleDeleteStack,
        handleDeleteAllData,
        handleEditStack,
        handleReviewLaunch
    };
};
