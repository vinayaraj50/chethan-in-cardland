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
        setHeaderLoading,
        showHeaderNotice
    } = useUI();
    const { queuePostTourEvent, endTour } = useTour();

    // Helper to execute the actual import/purchase after checks/confirms
    // 2026 Standard: Optimistic UI with Rollback Pattern
    const processImport = async (lesson, cost, userProfile, handleUpdateCoins) => {
        const originalCoins = userProfile?.coins || 0;

        // 1. OPTIMISTIC UI: Update coins INSTANTLY for snappy feedback
        if (cost > 0 && handleUpdateCoins) {
            handleUpdateCoins(Math.max(0, originalCoins - cost));
        }

        setHeaderLoading(true);

        // 2. Timeout Protection: No operation should take > 15s
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out. Please try again.')), 15000)
        );

        try {
            const importOperation = async () => {
                // Authoritative Entitlement Record (Firestore)
                if (!user?.uid) throw new Error("User must be logged in to add lessons.");
                console.log(`[AppActions] Recording ownership for "${lesson.title}" (${cost} coins)`);
                await userService.purchaseLesson(user.uid, lesson.id, cost, lesson.title);
                console.log('[AppActions] Entitlement recorded in Cloud Ledger.');

                let lessonToSave = { ...lesson };
                console.log('[AppActions] Starting import for:', lesson.title);

                const questions = lessonToSave.questions || lessonToSave.cards || [];

                if (lessonToSave.isPublic && questions.length === 0) {
                    const { getPublicFileContent } = await import('../services/publicDrive');
                    const pathOrId = lessonToSave.storagePath || lessonToSave.driveFileId || lessonToSave.id;
                    console.log('[AppActions] Fetching full content from:', pathOrId);

                    const fullContent = await getPublicFileContent(pathOrId);

                    if (fullContent) {
                        let contentObj = null;

                        if (typeof fullContent === 'string') {
                            const { decryptionService } = await import('../services/decryptionService');
                            console.log('[AppActions] Requesting server-side decryption...');

                            const idToken = await auth.currentUser?.getIdToken();
                            if (!idToken) {
                                throw new Error("User must be authenticated to decrypt lessons.");
                            }

                            const lessonIdForServer = lessonToSave.lessonId || lessonToSave.id;
                            const rawDecrypted = await decryptionService.decryptPublicLesson(fullContent, lessonIdForServer, idToken);
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
                    source: 'local',
                    isLocal: true,
                    cost: 0,
                    questionCount: questionCount
                };

                console.log('[AppActions] Saving imported lesson as new local lesson. Questions:', questionCount);
                const savedLesson = await storageService.saveLesson(newLesson);

                // CRITICAL: Do NOT set driveFileId to the local ID. 
                // It must remain null/undefined until the SyncQueue successfully uploads it to Drive.
                handleUpdateLocalLesson(newLesson);
                showHeaderNotice(cost > 0 ? `Purchased "${lesson.title}"!` : `Added "${lesson.title}"!`);
            };

            // Race against timeout
            await Promise.race([importOperation(), timeoutPromise]);

        } catch (error) {
            console.error('[AppActions] Import/Purchase failed:', error);

            // 3. ROLLBACK: Restore original coins on failure
            if (cost > 0 && handleUpdateCoins) {
                handleUpdateCoins(originalCoins);
            }

            showNotification('alert', `Operation failed: ${error.message}`);
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
            duration: 10000,
            onUndo: () => {
                isUndone = true;
                setLessons(prev => [...prev, lesson]);
            },
            onClose: async () => {
                if (!isUndone) {
                    try {
                        // 1. Delete local file
                        await apiHookDelete(lesson);

                        // 2. Mark as archived in Firestore (preserves entitlement)
                        if (user?.uid && lesson.id) {
                            await userService.archiveLesson(user.uid, lesson.id);
                            console.log(`[AppActions] Lesson ${lesson.id} archived in Firestore.`);
                        }
                    } catch (err) {
                        console.error('Delete failed:', err);
                        // If delete physically fails, restore UI and alert (Fail-Safe)
                        setLessons(prev => [...prev, lesson]);
                        showNotification('alert', `Failed to delete: ${err.message}`);
                    }
                }
            }
        });

        // Close modals if open
        toggleModal('showAddModal', false);
        setReviewLesson(null);
        setNoteLesson(null);
    }, [user, apiHookDelete, toggleModal, setReviewLesson, setNoteLesson, setLessons, showToast, showNotification]);

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
        if (s.isPublic && !s.isOwned && !s.isLocal) {
            showHeaderNotice('Add to My Lessons to open');
            return;
        }
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
                        if (!contentObj && (fullContent.startsWith('v1:') || fullContent.length > 100)) {
                            // STRICT SECURITY: Delegate to server
                            const { decryptionService } = await import('../services/decryptionService');
                            const idToken = await auth.currentUser?.getIdToken();
                            if (idToken) {
                                const lessonIdForServer = lessonToReview.lessonId || lessonToReview.id;
                                const rawDecrypted = await decryptionService.decryptPublicLesson(fullContent, lessonIdForServer, idToken);
                                // CRITICAL: Normalize decrypted content from new schema to internal format
                                contentObj = normalizeLessonContent(rawDecrypted);
                            } else {
                                // User not authenticated - trigger sign-in flow
                                console.log('[AppActions] User not authenticated. Triggering sign-in...');
                                queuePostTourEvent(() => handleReviewLaunch(s));
                                signIn('consent');
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
                showHeaderNotice('Add to My Lessons to open');
                return;
            }
        }
        lessonToReview.importantNote ? setNoteLesson(lessonToReview) : setReviewLesson(lessonToReview);
    }, [user, showHeaderNotice, setNoteLesson, setReviewLesson, queuePostTourEvent, signIn]);

    return {
        handleImportLesson,
        handleDeleteLesson,
        handleDeleteAllData,
        handleEditLesson,
        handleReviewLaunch
    };
};
