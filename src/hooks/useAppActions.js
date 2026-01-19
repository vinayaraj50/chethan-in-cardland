import { useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useLesson } from '../context/LessonContext';
import { useUI } from '../context/UIContext';
import { useTour } from '../components/TourContext';
import { storageService } from '../services/storageOrchestrator';
import { ADMIN_EMAIL } from '../constants/config';
import { auth } from '../services/firebase';
import { userService } from '../services/userService';
import { normalizeLessonContent } from '../utils/importUtils';

/**
 * useAppActions Hook
 * Centralized Service Layer for complex side-effects and cross-context operations.
 * Decouples business logic from the monolithic App.jsx.
 */
export const useAppActions = () => {
    const { user, signIn, signOut } = useAuth();
    const {
        handleUpdateLocalLesson,
        deleteLesson: apiHookDelete,
        fetchLessons,
        fetchPublicLessons,
        lessons,
        setPublicLessons,
        publicLessons,
        setLessons
    } = useLesson(); // Imported setLessons to handle optimistic updates
    const {
        toggleModal,
        setReviewLesson,
        setNoteLesson,
        showNotification,
        setActiveLesson,
        showToast,
        modals,
        setHeaderLoading
    } = useUI();
    const { queuePostTourEvent, endTour } = useTour();

    // Helper to execute the actual import/purchase after checks/confirms
    const processImport = async (lesson, cost, userProfile, handleUpdateCoins) => { // Added userProfile to signature
        setHeaderLoading(true);
        try {
            // 1. Atomic Server-Side Purchase (Entitlement Grant)
            // We do this BEFORE fetching content to ensure server allows decryption
            if (cost > 0) {
                if (!user?.uid) throw new Error("User must be logged in to purchase.");

                console.log('[AppActions] Initiating purchase transaction for:', lesson.title);
                // We use the ID that the server recognizes (lessonId or storagePath or id)
                // Typically matches the document ID in 'lessons' collection or the file ID.
                // Should match what DECRYPTION_API expects.
                const purchaseId = lesson.id;

                await userService.purchaseLesson(user.uid, purchaseId, cost);
                console.log('[AppActions] Purchase successful. Entitlement granted.');
            }

            let lessonToSave = { ...lesson };
            console.log('[AppActions] Starting import for:', lesson.title);

            const questions = lessonToSave.questions || lessonToSave.cards || [];

            if (lessonToSave.isPublic && questions.length === 0) {
                const { getPublicFileContent } = await import('../services/publicDrive');
                // FIX: Prioritize storagePath (Firestore Source of Truth) over legacy IDs
                const pathOrId = lessonToSave.storagePath || lessonToSave.driveFileId || lessonToSave.id;
                console.log('[AppActions] Fetching full content from:', pathOrId);

                // Note: Content is fetched as encrypted blob. Decryption MUST happen on server.
                const fullContent = await getPublicFileContent(pathOrId);

                if (fullContent) {
                    let contentObj = null;

                    if (typeof fullContent === 'string') {
                        // STRICT SECURITY COMPLIANCE: 
                        // Client must NEVER decrypt public content locally using a shared key.
                        // We must send this blob to the backend for decryption.
                        const { decryptionService } = await import('../services/decryptionService');
                        console.log('[AppActions] Requesting server-side decryption...');

                        const idToken = await auth.currentUser?.getIdToken();
                        if (!idToken) {
                            console.error('[AppActions] Authentication Check Failed: auth.currentUser is null. Please refresh the page or sign in again.');
                            throw new Error("User must be authenticated to decrypt lessons.");
                        }

                        // IMPORTANT: Send the lessonId field (matches encrypted blob), not the Firestore document ID
                        const lessonIdForServer = lessonToSave.lessonId || lessonToSave.id;
                        const rawDecrypted = await decryptionService.decryptPublicLesson(fullContent, lessonIdForServer, idToken);

                        // CRITICAL: Normalize decrypted content from new schema to internal format
                        contentObj = normalizeLessonContent(rawDecrypted);

                        console.log('[AppActions] Server decryption successful. Normalized questions:', contentObj.questions?.length);

                    } else {
                        contentObj = fullContent;
                    }

                    lessonToSave = {
                        ...lessonToSave,
                        ...contentObj,
                        isPublic: true
                    };
                    const importedQuestions = lessonToSave.questions || lessonToSave.cards || [];
                    console.log('[AppActions] Merged content. Questions count:', importedQuestions.length);

                    if (importedQuestions.length === 0) {
                        throw new Error('Imported lesson contains no questions.');
                    }
                } else {
                    throw new Error('Could not fetch lesson questions for import.');
                }
            }

            const activeQuestions = lessonToSave.questions || lessonToSave.cards || [];
            const questionCount = activeQuestions.length;
            const newLesson = {
                ...lessonToSave,
                id: Date.now().toString(),
                driveFileId: null,
                isPublic: false,
                source: 'local', // Explicitly set as local
                isLocal: true,
                cost: 0,
                questionCount: questionCount
            };

            console.log('[AppActions] Saving imported lesson as new local lesson. Questions:', questionCount);
            const savedLesson = await storageService.saveLesson(newLesson);

            // Sync local coin state from server source of truth (now that purchase is done)
            if (cost > 0 && handleUpdateCoins) {
                // We just call the updater with the new calculated value to keeps UI snappy
                // But ideally we should re-sync profile. 
                // For now, consistent subtraction is fine.
                handleUpdateCoins((userProfile?.coins || 0) - cost);
            }

            handleUpdateLocalLesson({ ...newLesson, driveFileId: savedLesson.driveFileId || savedLesson.id });
            showNotification('alert', cost > 0 ? `Purchased "${lesson.title}"!` : `Added "${lesson.title}"!`);

        } catch (error) {
            console.error('[AppActions] Import/Purchase failed:', error);
            showNotification('alert', `Operation failed: ${error.message}`);
            // If purchase succeeded but save failed, user is charged but no content.
            // This is an edge case. In a real app we'd have a 'Restore Purchases' button
            // or the server would check 'purchasedLessons' on next attempt and skip charge.
            // Our purchaseLesson handles idempotency, so it's safe to retry.
        } finally {
            setHeaderLoading(false);
        }
    };

    const handleImportLesson = useCallback(async (lesson, userProfile, handleUpdateCoins) => {
        if (!user) {
            queuePostTourEvent(() => handleImportLesson(lesson, userProfile, handleUpdateCoins));
            signIn();
            return;
        }

        const cost = lesson.cost || 0;

        // Validation: Coins
        if (cost > 0) {
            const currentCoins = userProfile?.coins || 0;
            if (currentCoins < cost) {
                showNotification('alert', `Not enough coins! You need ${cost} coins.`);
                return;
            }
        }

        const execute = () => {
            processImport(lesson, cost, userProfile, handleUpdateCoins);
        };

        if (cost > 0) {
            // Modern UI Confirmation (Non-blocking)
            showNotification('confirm', `Buy "${lesson.title}" for ${cost} coins?`, execute);
        } else {
            execute();
        }

    }, [user, queuePostTourEvent, signIn, showNotification]);

    const handleDeleteLesson = useCallback((lesson) => {
        // Optimistic UI - Immediately remove from list
        setLessons(prev => prev.filter(l => l.id !== lesson.id));

        let isUndone = false;

        showToast({
            message: `Deleted "${lesson.title}"`,
            type: 'undo',
            duration: 4000,
            onUndo: () => {
                isUndone = true;
                // Restore logic - simplified append. 
                // For a perfect implementation we'd need the index, but appending is acceptable for "Undo".
                // Ideally, we re-fetch or keep index, but let's just push back.
                setLessons(prev => [...prev, lesson]);
            },
            onClose: () => {
                // If not undone, commit the delete
                if (!isUndone) {
                    apiHookDelete(lesson);
                }
            }
        });

        // Close modals if open
        toggleModal('showAddModal', false);
        setReviewLesson(null);
        setNoteLesson(null);
    }, [apiHookDelete, toggleModal, setReviewLesson, setNoteLesson, setLessons, showToast]);

    const handleDeleteAllData = useCallback(async (allowAppExit) => {
        if (!user) return;
        if (!window.confirm("Are you sure? This will delete ALL your lessons. This cannot be undone.")) return;

        try {
            const userLessons = lessons.filter(s => s.driveFileId && !s.isPublic);
            for (const lesson of userLessons) await apiHookDelete(lesson);
            showNotification('alert', "All local data deleted.");
            allowAppExit();
            signOut();
        } catch (e) {
            showNotification('alert', `Cleanup partially failed: ${e.message}`);
        } finally {
            toggleModal('showMenu', false);
        }
    }, [user, lessons, apiHookDelete, signOut, showNotification, toggleModal]);

    const handleEditLesson = useCallback(async (lesson, fromAdminSection = null) => {
        let lessonToEdit = lesson;
        const questions = lessonToEdit.questions || lessonToEdit.cards || [];

        if (lessonToEdit.isPublic && !lessonToEdit.isLocal && questions.length === 0) {
            try {
                const { getPublicFileContent } = await import('../services/publicDrive');
                // FIX: Prioritize storagePath (Firestore Source of Truth) over legacy IDs
                const pathOrId = lessonToEdit.storagePath || lessonToEdit.driveFileId || lessonToEdit.id;
                const fullContent = await getPublicFileContent(pathOrId);

                if (fullContent) {
                    let contentObj = null;

                    if (typeof fullContent === 'string') {
                        // STRICT SECURITY: Delegate to server
                        const { decryptionService } = await import('../services/decryptionService');
                        const idToken = await auth.currentUser?.getIdToken();

                        if (!idToken) {
                            showNotification('alert', 'Please sign in to edit this lesson.');
                            return;
                        }

                        // IMPORTANT: Send the lessonId field (matches encrypted blob), not the Firestore document ID
                        const lessonIdForServer = lessonToEdit.lessonId || lessonToEdit.id;
                        const rawDecrypted = await decryptionService.decryptPublicLesson(fullContent, lessonIdForServer, idToken);

                        // CRITICAL: Normalize decrypted content from new schema to internal format
                        contentObj = normalizeLessonContent(rawDecrypted);
                    } else {
                        contentObj = fullContent;
                    }

                    if (contentObj && (contentObj.questions?.length > 0 || contentObj.cards?.length > 0)) {
                        lessonToEdit = { ...lessonToEdit, ...contentObj, isPublic: true };
                        setPublicLessons(prev => prev.map(p => p.id === lesson.id ? lessonToEdit : p));
                    } else {
                        throw new Error("Decrypted content has no questions.");
                    }
                }
            } catch (e) {
                console.error('[AppActions] Failed to fetch full content for edit:', e);
                showNotification('alert', 'Failed to load lesson for editing.');
                return;
            }
        }
        setActiveLesson(lessonToEdit);
        window.history.pushState({ modal: 'active' }, '', window.location.pathname);
        toggleModal('showAddModal', true);
    }, [user, setPublicLessons, setActiveLesson, toggleModal, showNotification]);

    const handleReviewLaunch = useCallback(async (s) => {
        let lessonToReview = s;
        const questions = lessonToReview.questions || lessonToReview.cards || [];

        if (questions.length === 0 && lessonToReview.isPublic && !lessonToReview.isLocal) {
            try {
                const { getPublicFileContent } = await import('../services/publicDrive');
                const pathOrId = lessonToReview.driveFileId || lessonToReview.storagePath || lessonToReview.id;
                const fullContent = await getPublicFileContent(pathOrId);
                if (fullContent) {
                    let contentObj = null;
                    if (typeof fullContent === 'string') {
                        if (!contentObj && fullContent.startsWith('v1:')) {
                            // STRICT SECURITY: Delegate to server
                            const { decryptionService } = await import('../services/decryptionService');
                            const idToken = await auth.currentUser?.getIdToken();
                            if (idToken) {
                                const lessonIdForServer = lessonToReview.lessonId || lessonToReview.id;
                                const rawDecrypted = await decryptionService.decryptPublicLesson(fullContent, lessonIdForServer, idToken);
                                // CRITICAL: Normalize decrypted content from new schema to internal format
                                contentObj = normalizeLessonContent(rawDecrypted);
                            } else {
                                console.warn('[AppActions] Cannot decrypt for review: User not authenticated');
                                showNotification('alert', 'Please sign in to view this lesson.');
                                return;
                            }
                        }
                        if (!contentObj) contentObj = {};
                    } else {
                        contentObj = fullContent;
                    }
                    lessonToReview = { ...lessonToReview, ...contentObj };
                }
            } catch (e) {
                console.error('[AppActions] Failed to fetch full content for review:', e);
                showNotification('alert', 'Failed to open.');
                return;
            }
        }
        lessonToReview.importantNote ? setNoteLesson(lessonToReview) : setReviewLesson(lessonToReview);
    }, [user, showNotification, setNoteLesson, setReviewLesson]);

    return {
        handleImportLesson,
        handleDeleteLesson,
        handleDeleteAllData,
        handleEditLesson,
        handleReviewLaunch
    };
};
