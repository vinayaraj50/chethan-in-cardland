
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storageService } from '../services/storageOrchestrator';
import * as drive from '../services/googleDrive';
import { sessionManager } from '../services/sessionManager';
import * as lessonCrypto from '../utils/lessonCrypto';

// Mock Dependencies
vi.mock('../services/googleDrive');
vi.mock('../services/sessionManager', () => ({
    sessionManager: {
        userStore: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn()
        }
    }
}));
vi.mock('../services/googleAuth', () => ({
    identityService: {
        uid: 'test-user-123'
    }
}));
vi.mock('../utils/lessonCrypto', () => ({
    deriveUserKey: vi.fn().mockResolvedValue('mock-key'),
    encryptLesson: vi.fn().mockImplementation((data) => Promise.resolve({ iv: 'iv', data: JSON.stringify(data) })),
    decryptLesson: vi.fn().mockImplementation((enc) => Promise.resolve(JSON.parse(enc.data)))
}));

describe('Cross-Device Sync (StorageOrchestrator)', () => {
    const mockUid = 'test-user-123';
    const mockLessonId = 'lesson-abc';
    const compositeKey = `${mockUid}_${mockLessonId}`;

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup Storage Service state
        storageService.setDriveAccess(true, 'mock-token');
    });

    it('should fetch and merge remote progress from a separate synchronization file', async () => {
        // SCENARIO: 
        // User played on Mobile. Drive has a `cic_progress_...` file with index 10.
        // User opens PC. Local storage is empty (new session or cleared).
        // Expectation: getLessonContent fetches the progress file and restores index 10.

        // 1. Setup Local Store (Empty/Stale)
        sessionManager.userStore.get.mockImplementation((key) => {
            if (key === `content_${compositeKey}`) return null;
            if (key === `progress_${compositeKey}`) return { lastSessionIndex: 0 }; // Stale
            return null;
        });

        // 2. Setup Drive Mocks
        // Mock Content Fetch (Standard Lesson)
        drive.fetchLessonContent.mockResolvedValue({
            id: mockLessonId,
            questions: Array(20).fill({ id: 'q' }),
            updatedAt: '2025-01-01T00:00:00Z'
        });

        // Mock Progress Existence Check (Found!)
        const progressFileName = `cic_progress_${mockUid}_${mockLessonId}.json`;
        drive.findFileByName.mockResolvedValue('file-progress-123');

        // Mock Progress File Content (The "Mobile" State)
        const mockRemoteProgress = {
            lastSessionIndex: 10,
            ratings: { 'q1': 'hard' },
            updatedAt: '2026-01-23T12:00:00Z'
        };
        drive.getFileContent.mockResolvedValue({
            iv: 'mock-iv',
            data: JSON.stringify(mockRemoteProgress)
        });

        // 3. Execution
        const lessonStub = { id: mockLessonId, driveFileId: 'file-content-999', modifiedTime: '2026-01-23T12:00:00Z' };
        const hydratedLesson = await storageService.getLessonContent(lessonStub);

        // 4. Verification

        // Assert it looked for the progress file
        expect(drive.findFileByName).toHaveBeenCalledWith('mock-token', progressFileName, null);

        // Assert it fetched the progress file
        expect(drive.getFileContent).toHaveBeenCalledWith('mock-token', 'file-progress-123');

        // Assert it decrypted and merged
        expect(sessionManager.userStore.set).toHaveBeenCalledWith(
            `progress_${compositeKey}`,
            expect.objectContaining({
                lastSessionIndex: 10
            })
        );
    });

    it('should prioritize furthest progress (max index)', async () => {
        // SCENARIO:
        // Local has index 5 (played offline recently).
        // Remote has index 3 (old sync).
        // Expectation: Keep index 5.

        sessionManager.userStore.get.mockImplementation((key) => {
            if (key === `progress_${compositeKey}`) return { lastSessionIndex: 5 };
            return null;
        });

        drive.fetchLessonContent.mockResolvedValue({ id: mockLessonId, questions: [] });
        drive.findFileByName.mockResolvedValue('file-progress-old');
        drive.getFileContent.mockResolvedValue({
            iv: 'iv', data: JSON.stringify({ lastSessionIndex: 3 })
        });

        const lessonStub = { id: mockLessonId };
        await storageService.getLessonContent(lessonStub);

        // Verify merge preference
        expect(sessionManager.userStore.set).toHaveBeenCalledWith(
            `progress_${compositeKey}`,
            expect.objectContaining({
                lastSessionIndex: 5
            })
        );
    });
});
