import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storageService } from '../storageOrchestrator';
import * as lessonCrypto from '../../utils/lessonCrypto';

vi.mock('../../utils/lessonCrypto', () => ({
    deriveUserKey: vi.fn().mockResolvedValue('mock-key'),
    encryptLesson: vi.fn((lesson) => Promise.resolve(lesson)),
    decryptLesson: vi.fn((blob) => Promise.resolve(blob))
}));

// Hoist mocks to ensure they are available to vi.mock factories
const mocks = vi.hoisted(() => ({
    mockDriveSave: vi.fn().mockResolvedValue({ id: 'drive-id-123' }),
    mockDriveFetch: vi.fn(),
    mockDriveList: vi.fn().mockResolvedValue([]),
    mockIdentityUid: 'test-user',
    mockIdentityEnsure: vi.fn().mockResolvedValue('test-token')
}));

// Mock the dependencies SURGICALLY
vi.mock('../../utils/storage', () => {
    class MockStorageStore {
        #data = {};
        constructor(prefix) { this.prefix = prefix; }
        get(key, def) { return this.#data[key] || def; }
        set(key, val) { this.#data[key] = val; }
        remove(key) { delete this.#data[key]; }
    }
    return {
        StorageStore: MockStorageStore,
        storage: new MockStorageStore('cic_v1_'),
        default: new MockStorageStore('cic_v1_')
    };
});

vi.mock('../googleDrive', () => ({
    saveLesson: (...args) => mocks.mockDriveSave(...args),
    fetchLessonContent: (...args) => mocks.mockDriveFetch(...args),
    listLessonMetadata: (...args) => mocks.mockDriveList(...args),
    deleteLesson: vi.fn()
}));

vi.mock('../googleAuth', () => ({
    identityService: {
        uid: mocks.mockIdentityUid,
        ensureDriveAccess: mocks.mockIdentityEnsure
    }
}));

// We need to mock sessionManager to return our MockStorageStore
vi.mock('../sessionManager', () => {
    class MockStorageStore {
        #data = {};
        constructor(prefix) { this.prefix = prefix; }
        get(key, def) { return this.#data[key] || def; }
        set(key, val) { this.#data[key] = val; }
        remove(key) { delete this.#data[key]; }
    }
    const store = new MockStorageStore(`user_${mocks.mockIdentityUid}_`);
    return {
        sessionManager: {
            userStore: store,
            startSession: vi.fn()
        }
    };
});

describe('Drive Integrity', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        storageService.setDriveAccess(true, 'test-token');
    });

    it('should NOT delete questions when updating only metadata (Smart Merge)', async () => {
        vi.useFakeTimers();

        const fullLesson = {
            id: 'lesson-1',
            title: 'Full Lesson',
            questions: [{ text: 'Question 1' }]
        };

        // 1. Save the full lesson first
        await storageService.saveLesson(fullLesson);
        vi.advanceTimersByTime(3000); // Trigger debounce

        // Flush microtasks to allow async timeout callback to complete
        for (let i = 0; i < 20; i++) await Promise.resolve();

        // 2. Simulate a progress update (stub)
        const progressUpdate = {
            id: 'lesson-1',
            lastMarks: 10,
            reviewStage: 1
        };

        // 3. Save the update
        await storageService.saveLesson(progressUpdate);
        vi.advanceTimersByTime(3000); // Trigger debounce
        for (let i = 0; i < 20; i++) await Promise.resolve();

        // 4. Verify that the Drive save included the questions (from the merge)
        const lastDriveCall = [...mocks.mockDriveSave.mock.calls].reverse().find(call => call[1].id === 'lesson-1');
        expect(lastDriveCall).toBeDefined();

        const dataSentToDrive = lastDriveCall[1];
        expect(dataSentToDrive.questions).toBeDefined();
        expect(dataSentToDrive.questions.length).toBe(1);
        expect(dataSentToDrive.lastMarks).toBe(10);

        vi.useRealTimers();
    });
});
