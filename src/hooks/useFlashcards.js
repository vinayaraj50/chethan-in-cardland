import { useState, useCallback, useRef, useEffect } from 'react';
import { storageService } from '../services/storageOrchestrator';
import { DEMO_STACK } from '../constants/data';

/**
 * Custom hook for Flashcard data management.
 * Leverages StorageOrchestrator for strategy-agnostic persistence.
 */
export const useFlashcards = (user, hasDrive, showAlert) => {
    const [stacks, setStacks] = useState([DEMO_STACK]);
    const [publicStacks, setPublicStacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [publicLoading, setPublicLoading] = useState(false);

    const lastFetchTime = useRef(0);
    const pendingUpdates = useRef([]);
    const batchIntervalRef = useRef(null);

    // Synchronize strategy
    useEffect(() => {
        storageService.setDriveAccess(hasDrive, user?.token);
    }, [hasDrive, user?.token]);

    const handleUpdateLocalStack = useCallback((updated) => {
        setStacks(prev => {
            const index = prev.findIndex(s => s.id === updated.id);
            if (index >= 0) {
                const copy = [...prev];
                copy[index] = { ...copy[index], ...updated };
                return copy;
            }
            return [updated, ...prev];
        });
    }, []);

    const fetchPublicStacks = useCallback(async () => {
        setPublicLoading(true);
        try {
            // Fetch from both Firestore and local JSON files in parallel
            const [firestoreResults, localResults] = await Promise.allSettled([
                import('../services/publicDrive').then(m => m.listPublicStacks()),
                import('../services/localStacksService').then(m => m.listLocalStacks())
            ]);

            const firestoreStacks = firestoreResults.status === 'fulfilled' ? (firestoreResults.value || []) : [];
            const localStacks = localResults.status === 'fulfilled' ? (localResults.value || []) : [];

            // Merge stacks, prioritizing Firestore (cloud) over local, deduplicate by ID
            const firestoreIds = new Set(firestoreStacks.map(s => s.id));
            const mergedStacks = [
                ...firestoreStacks,
                ...localStacks.filter(s => !firestoreIds.has(s.id))
            ];

            console.log(`[Flashcards] Loaded ${firestoreStacks.length} Firestore + ${localStacks.length} local stacks`);
            setPublicStacks(mergedStacks);
        } catch (error) {
            console.error('[Flashcards] Public fetch failed:', error);
        } finally {
            setPublicLoading(false);
        }
    }, []);

    const fetchStacks = useCallback(async (force = false) => {
        if (!user) {
            setStacks([DEMO_STACK]);
            return;
        }

        if (!force && Date.now() - lastFetchTime.current < 60000) return;
        lastFetchTime.current = Date.now();

        setLoading(true);
        try {
            // Fetch metadata list via Orchestrator (instant for local, cloud-synced for drive)
            const metadata = await storageService.listStacks();

            // Filter out existing DEMO_STACK to avoid double rendering
            const userStacks = metadata.filter(m => m.id !== DEMO_STACK.id);
            setStacks([DEMO_STACK, ...userStacks]);
            setLoading(false);

            // Lazy fetch full contents
            if (batchIntervalRef.current) clearInterval(batchIntervalRef.current);
            pendingUpdates.current = [];

            batchIntervalRef.current = setInterval(() => {
                const updates = pendingUpdates.current.splice(0, pendingUpdates.current.length);
                if (updates.length > 0) {
                    setStacks(prev => {
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
            const queue = [...userStacks];
            const fetchNext = async () => {
                if (queue.length === 0) return;
                const stack = queue.shift();
                try {
                    const content = await storageService.getStackContent(stack);
                    pendingUpdates.current.push(content);
                } catch (e) { }
                await fetchNext();
            };

            await Promise.all([fetchNext(), fetchNext()]);
            if (batchIntervalRef.current) {
                clearInterval(batchIntervalRef.current);
                batchIntervalRef.current = null;
            }

        } catch (error) {
            console.error('[Flashcards] Load failed:', error);
            setLoading(false);
        }
    }, [user]);

    const deleteStack = useCallback(async (stack) => {
        if (!stack) return;
        setLoading(true);
        try {
            if (stack.source === 'firestore' || (stack.isPublic && !stack.isLocal)) {
                const { deletePublicLesson } = await import('../services/publicDrive');
                await deletePublicLesson(stack.id);
                setPublicStacks(prev => prev.filter(s => s.id !== stack.id));
            } else {
                await storageService.deleteStack(stack);
                setStacks(prev => prev.filter(s => s.id !== stack.id));
            }

            if (showAlert) showAlert({ type: 'alert', message: `Deleted "${stack.title}"` });
        } catch (e) {
            console.error(e);
            if (showAlert) showAlert({ type: 'alert', message: 'Delete failed.' });
        } finally {
            setLoading(false);
        }
    }, [showAlert]);

    return {
        stacks,
        publicStacks,
        loading,
        publicLoading,
        setStacks,
        setPublicStacks,
        fetchStacks,
        fetchPublicStacks,
        handleUpdateLocalStack,
        deleteStack
    };
};
