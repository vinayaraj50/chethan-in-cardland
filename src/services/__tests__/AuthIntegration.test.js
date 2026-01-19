import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionManager, SessionManager } from '../sessionManager';
import { storageService } from '../storageOrchestrator';

// Mock dependencies if needed, but we want to test the integration of Manager + Orchestrator
describe('Auth Integration & Data Isolation (Zero Trust)', () => {
    let mockLocalStorage;

    beforeEach(() => {
        // Reset LocalStorage
        let store = {};
        mockLocalStorage = {
            getItem: vi.fn(key => store[key] || null),
            setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
            removeItem: vi.fn(key => { delete store[key]; }),
            key: vi.fn(index => Object.keys(store)[index] || null),
            length: 0 // Vitest mock might need getter
        };
        Object.defineProperty(mockLocalStorage, 'length', {
            get: () => Object.keys(store).length,
        });

        vi.stubGlobal('localStorage', mockLocalStorage);
        vi.stubGlobal('window', { localStorage: mockLocalStorage });

        // Reset SessionManager
        sessionManager.endSession();
    });

    it('[Auth Switch] Data written by User A must not be visible to User B', async () => {
        // 1. Login as User A
        sessionManager.startSession('user_A');

        // 2. Write data via Orchestrator (simulating app usage)
        const lessonA = { id: 'lesson_1', title: 'User A Data' };
        await storageService.saveLesson(lessonA);

        // Verify secure write
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
            expect.stringContaining('cic_user_user_A_'),
            expect.stringContaining('User A Data')
        );

        // 3. Hot-Swap to User B (Simulating rapid account switch or relogin)
        sessionManager.startSession('user_B'); // Internally calls endSession/cleanup logic if any

        // 4. Verify User B sees EMPTY lessons
        const lessonsB = await storageService.listLessons();
        expect(lessonsB).toEqual([]);

        // 5. Verify User B cannot access User A's data via Orchestrator
        const contentB = await storageService.getLessonContent({ id: 'lesson_1' });
        expect(contentB.title).toBeUndefined(); // Should return the input object or null (fallback behavior)
    });

    it('[Cold Purge] App Boot must purge user data', () => {
        // 1. Simulate existing stale data on disk
        mockLocalStorage.setItem('cic_user_user_OLD_lessons', JSON.stringify([{ id: 'hack' }]));
        mockLocalStorage.setItem('cic_user_user_OLD_cache', '{"secret":true}');

        // 2. Simulate App Boot
        SessionManager.purgeAllUserSessions();

        // 3. Verify Clean Slate
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cic_user_user_OLD_lessons');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cic_user_user_OLD_cache');
    });

    it('[Pre-Auth Protection] Storage Access without Session must be blocked/empty', async () => {
        // Ensure no session
        sessionManager.endSession();

        // Try to list lessons -> Should be safely empty (Recruiter Mode / Zero Trust)
        const result = await storageService.listLessons();
        expect(result).toEqual([]);

        // Try to save lesson -> Should safe-fail or be consistent (Orchestrator safe-fails)
        // With current implementation, it writes to a dummy store
        await storageService.saveLesson({ id: 'test' });
        // Verify NOTHING hit localStorage
        expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
});
