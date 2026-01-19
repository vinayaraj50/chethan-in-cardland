import { useState, useCallback, useRef, useEffect } from 'react';
import { storageService } from '../services/storageOrchestrator';
import { DEMO_LESSON } from '../constants/data';
import { ADMIN_EMAIL } from '../constants/config';

/**
 * Custom hook for Lesson data management.
 * Leverages StorageOrchestrator for strategy-agnostic persistence.
 */
export const useLessons = (user, hasDrive, showAlert) => {
    const [lessons, setLessons] = useState([DEMO_LESSON]);
    const [publicLessons, setPublicLessons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [publicLoading, setPublicLoading] = useState(false);

    const lastFetchTime = useRef(0);
    const pendingUpdates = useRef([]);
    const batchIntervalRef = useRef(null);

    // Synchronize strategy
    useEffect(() => {
        // 2026 Strategy: Only enable Drive if we have an explicit token.
        // On refresh, we might have 'hasDrive' true from the UI/IdentityState,
        // but 'user.token' might be null until ensureDriveAccess completes.
        // We set the access to true if we expect drive, but pass the token as well.
        storageService.setDriveAccess(hasDrive, user?.token);
    }, [hasDrive, user?.token]);

    const handleUpdateLocalLesson = useCallback((updated) => {
        setLessons(prev => {
            const index = prev.findIndex(s => s.id === updated.id);
            if (index >= 0) {
                const copy = [...prev];
                copy[index] = { ...copy[index], ...updated };
                return copy;
            }
            return [updated, ...prev];
        });
    }, []);

    const fetchPublicLessons = useCallback(async () => {
        // Legacy: Manual fetch is now a no-op or just re-triggers a local check if we wanted, 
        // but for now we rely on the subscription. 
        // We can just log or maybe refresh local files.
        console.log('[Lessons] Public lessons are now real-time synced.');
    }, []);

    // Real-time subscription for Public Lessons
    useEffect(() => {
        let unsubscribe = () => { };
        let isMounted = true;

        const syncPublicLessons = async () => {
            setPublicLoading(true);
            try {
                const [localModule, publicModule] = await Promise.all([
                    import('../services/localLessonsService'),
                    import('../services/publicDrive')
                ]);

                if (!isMounted) return;

                // 1. Fetch Local Lessons (Static)
                const locals = await localModule.listLocalLessons();

                // 2. Subscribe to Firestore (Real-time)
                unsubscribe = publicModule.subscribeToPublicLessons((firestoreLessons) => {
                    if (!isMounted) return;

                    const firestoreIds = new Set(firestoreLessons.map(s => s.id));
                    const mergedLessons = [
                        ...firestoreLessons,
                        ...locals.filter(s => !firestoreIds.has(s.id))
                    ];

                    console.log(`[Lessons] Synced ${firestoreLessons.length} Cloud + ${locals.length} Local`);
                    setPublicLessons(mergedLessons);
                    setPublicLoading(false);
                });

            } catch (error) {
                console.error('[Lessons] Subscription failed:', error);
                if (isMounted) setPublicLoading(false);
            }
        };

        syncPublicLessons();

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    const fetchLessons = useCallback(async (force = false) => {
        if (!user) {
            setLessons([DEMO_LESSON]);
            return;
        }

        if (!force && Date.now() - lastFetchTime.current < 60000) return;
        lastFetchTime.current = Date.now();

        setLoading(true);
        try {
            // Fetch metadata list via Orchestrator (instant for local, cloud-synced for drive)
            const metadata = await storageService.listLessons();

            // Filter out existing DEMO_LESSON to avoid double rendering
            const userLessons = metadata.filter(m => m.id !== DEMO_LESSON.id);
            setLessons([DEMO_LESSON, ...userLessons]);
            setLoading(false);

            // Lazy fetch full contents
            if (batchIntervalRef.current) clearInterval(batchIntervalRef.current);
            pendingUpdates.current = [];

            batchIntervalRef.current = setInterval(() => {
                const updates = pendingUpdates.current.splice(0, pendingUpdates.current.length);
                if (updates.length > 0) {
                    setLessons(prev => {
                        const next = [...prev];
                        updates.forEach(upd => {
                            const idx = next.findIndex(s => s.id === upd.id);
                            if (idx >= 0) next[idx] = { ...next[idx], ...upd, loading: false };
                        });
                        return next;
                    });
                }
            }, 500);

            // Sequential fetch with limited concurrency
            const queue = [...userLessons];
            const fetchNext = async () => {
                if (queue.length === 0) return;
                const lesson = queue.shift();
                try {
                    const content = await storageService.getLessonContent(lesson);
                    pendingUpdates.current.push(content);
                } catch (e) { }
                await fetchNext();
            };

            await Promise.all([fetchNext(), fetchNext()]);

            // FINAL FLUSH: Ensure any remaining updates in the queue are applied before we stop the batcher
            if (pendingUpdates.current.length > 0) {
                const finalUpdates = pendingUpdates.current.splice(0, pendingUpdates.current.length);
                setLessons(prev => {
                    const next = [...prev];
                    finalUpdates.forEach(upd => {
                        const idx = next.findIndex(s => s.id === upd.id);
                        if (idx >= 0) next[idx] = { ...next[idx], ...upd, loading: false };
                    });
                    return next;
                });
            }

            if (batchIntervalRef.current) {
                clearInterval(batchIntervalRef.current);
                batchIntervalRef.current = null;
            }

        } catch (error) {
            console.error('[Lessons] Load failed:', error);
            setLoading(false);
        }
    }, [user]);
    const deleteLesson = useCallback(async (lesson) => {
        if (!lesson) return;
        setLoading(true);
        try {
            const isAdmin = user?.email === ADMIN_EMAIL;
            // Only attempt Firestore deletion if user is Admin AND it's strictly a Firestore lesson
            const isStrictlyPublic = (lesson.source === 'firestore' || (lesson.isPublic && !lesson.isLocal));

            if (isAdmin && isStrictlyPublic) {
                const { deletePublicLesson } = await import('../services/publicDrive');
                await deletePublicLesson(lesson.id);
                setPublicLessons(prev => prev.filter(s => s.id !== lesson.id));
            } else {
                // For everyone else (or local copies), delete from local storage/drive
                await storageService.deleteLesson(lesson);
                setLessons(prev => prev.filter(s => s.id !== lesson.id));
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [showAlert]);

    return {
        lessons,
        publicLessons,
        loading,
        publicLoading,
        setLessons,
        setPublicLessons,
        fetchLessons,
        fetchPublicLessons,
        handleUpdateLocalLesson,
        deleteLesson
    };
};
