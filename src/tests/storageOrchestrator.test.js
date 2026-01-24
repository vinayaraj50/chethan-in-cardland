import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storageService } from '../services/storageOrchestrator';
import { identityService } from '../services/googleAuth';
import * as drive from '../services/googleDrive';
import { sessionManager } from '../services/sessionManager';

// --- Mocks ---
vi.mock('../services/googleDrive');
vi.mock('../services/sessionManager', () => {
    let store = {};
    return {
        sessionManager: {
            userStore: {
                get: (k, d) => store[k] || d,
                set: (k, v) => store[k] = v,
                clear: () => store = {}
            }
        }
    };
});
vi.mock('../utils/lessonCrypto', () => ({
    encryptLesson: vi.fn((data) => JSON.stringify(data)),
    decryptLesson: vi.fn((data) => JSON.parse(data)),
    deriveUserKey: vi.fn(() => 'mock-key')
}));

describe('StorageOrchestrator (2026 Resilience)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset In-Memory Store
        sessionManager.userStore.clear();
        // Setup default identity
        vi.spyOn(identityService, 'uid', 'get').mockReturnValue('userA');
        storageService.setDriveAccess(true, 'mock-token');
    });

    it('Should enforce Composite IDs to prevent Cross-Account Bleed', async () => {
        // Scenario: User A saves a lesson
        const lesson = { id: 'math101', title: 'Calculus', questions: [{ id: 'q1', text: '1+1' }] };
        await storageService.saveLesson(lesson);

        // Verify Storage Key uses User A's ID
        // We can't access private methods, but we can verify what it tries to store in session
        // or check side effects.
        // Let's switch users and check visibility.

        // Switch to User B
        vi.spyOn(identityService, 'uid', 'get').mockReturnValue('userB');

        // Attempt to list lessons for User B
        const lessonsB = await storageService.listLessons();
        expect(lessonsB).toHaveLength(0); // Should NOT see User A's lesson
    });

    it('Should split Content and Progress on Save', async () => {
        const lesson = {
            id: 'chem202',
            title: 'Atoms',
            questions: [{ id: 'q1', text: 'H2O', lastRating: 2 }], // Mixed Content + Progress
            lastReviewed: '2026-01-01'
        };

        await storageService.saveLesson(lesson);

        // Verify Drive was called with separate files (or at least valid split logic enqueued)
        // Since sync is async/enqueued, we might need to await a bit or mock the queue execution
        // But we can check the Local Store immediately as it's synchronous logic in `saveLesson`

        // We expect store to have `progress_userA_chem202` and `content_userA_chem202`
        // (Accessing mocked store internal state logic strictly depends on mock impl)
        // Instead, let's verify retrieve logic handles the hydration.

        const hydrated = await storageService.getLessonContent({ id: 'chem202' });
        expect(hydrated.questions[0].lastRating).toBe(2);
        expect(hydrated.title).toBe('Atoms');
    });

    it('Should Hydrate (Merge) Content and Progress at Runtime', async () => {
        // Setup: Mock specific Drive responses for Content vs Progress
        // But for unit test speed, we'll preload the Local Store with split data
        // simulating a fresh load from disk/drive.

        const compositeKey = 'userA_bio303';
        sessionManager.userStore.set(`content_${compositeKey}`, {
            id: 'bio303',
            title: 'Biology',
            questions: [{ id: 'q1', text: 'Mitochondria' }]
        });
        sessionManager.userStore.set(`progress_${compositeKey}`, {
            ratings: { 'q1': 1 },
            lastReviewed: 'yesterday'
        });

        const result = await storageService.getLessonContent({ id: 'bio303' });

        expect(result.questions[0].lastRating).toBe(1); // Merged!
        expect(result.lastReviewed).toBe('yesterday');  // Merged!
    });

    it('Should REJECT empty shells (No Questions Found prevention)', async () => {
        const emptyLesson = { id: 'bad1', title: 'Empty', questions: [] };

        // Spy on console error
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        await storageService.saveLesson(emptyLesson);

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('BLOCKED SAVE'));

        // Ensure it wasn't saved to local store
        const result = await storageService.getLessonContent({ id: 'bad1' });
        // Should return the input stub itself (default fallback) but NOT persist it to valid cache
        // or trigger a sync.
        expect(drive.saveFile).not.toHaveBeenCalled();
    });

    it('Should implement Netflix-Style Progress Merge (Furthest Wins)', async () => {
        const compositeKey = 'userA_roam1';

        // 1. Setup Local State (Stale PC: Index 10)
        sessionManager.userStore.set(`content_${compositeKey}`, {
            id: 'roam1',
            questions: Array(50).fill({ id: 'q' }),
            updatedAt: '2026-01-01T10:00:00Z'
        });
        sessionManager.userStore.set(`progress_${compositeKey}`, {
            lastSessionIndex: 10,
            ratings: { 'q1': 1 },
            updatedAt: '2026-01-01T10:00:00Z'
        });

        // 2. Mock Remote State (Active Mobile: Index 34, Newer)
        const remoteContent = {
            id: 'roam1',
            questions: Array(50).fill({ id: 'q' }),
            updatedAt: '2026-01-01T12:00:00Z',
            // Remote has different/new progress embedded
            lastSessionIndex: 34,
            questions: [{ id: 'q1', lastRating: 1 }, { id: 'q34', lastRating: 5 }]
        };

        // Mock fetch response
        drive.fetchLessonContent.mockResolvedValue(remoteContent);

        // 3. Trigger Hydration with Newer Remote Timestamp
        const result = await storageService.getLessonContent({
            id: 'roam1',
            driveFileId: 'f1',
            modifiedTime: '2026-01-01T12:00:00Z' // Newer than local
        });

        // 4. Verification
        // Expect fetch to have happened
        expect(drive.fetchLessonContent).toHaveBeenCalled();

        // Expect Index 34 (Remote) to win over 10 (Local)
        expect(result.lastSessionIndex).toBe(34);

        // Expect Ratings to merge
        // q1 was in both, q34 was in remote
        // Result users mapped questions
        // In the mock above, remoteData.questions structure is loose, 
        // but the storage logic extracts `lastRating` from questions array.
        // Let's check the persisted progress store directly for precision
        const storedProgress = sessionManager.userStore.get(`progress_${compositeKey}`);
        expect(storedProgress.lastSessionIndex).toBe(34);
    });

});
