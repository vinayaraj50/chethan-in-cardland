import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLessons } from '../useLessons';

// Use vi.hoisted to ensure mocks are available in factory
const { mockSubscribe, mockListLocal } = vi.hoisted(() => {
    return {
        mockSubscribe: vi.fn(),
        mockListLocal: vi.fn()
    };
});

// Mock Services
vi.mock('../../services/publicDrive', () => ({
    subscribeToPublicLessons: (cb) => {
        mockSubscribe(cb);
        return () => { }; // Unsubscribe
    },
    listPublicLessons: vi.fn(),
    apiService: {
        subscribeToPublicLessons: (cb) => mockSubscribe(cb)
    }
}));

vi.mock('../../services/localLessonsService', () => ({
    listLocalLessons: () => mockListLocal()
}));

// Mock Data
const MOCK_FIRESTORE_LESSONS = [
    { id: 'cloud1', title: 'Cloud Lesson 1' },
    { id: 'cloud2', title: 'Cloud Lesson 2' }
];

const MOCK_LOCAL_LESSONS = [
    { id: 'local1', title: 'Local Lesson 1' },
    { id: 'cloud1', title: 'Local Copy of Cloud 1' } // Should be deduped
];

describe('useLessons Hook (Real-time Sync)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListLocal.mockResolvedValue([]);
    });

    it('should subscribe to public lessons on mount', async () => {
        const { result } = renderHook(() => useLessons({}, false, vi.fn()));

        await waitFor(() => {
            expect(mockSubscribe).toHaveBeenCalled();
        });
    });

    it('should merge cloud and local lessons correctly', async () => {
        // Setup mocks
        mockListLocal.mockResolvedValue(MOCK_LOCAL_LESSONS);

        let triggerUpdate;
        mockSubscribe.mockImplementation((cb) => {
            triggerUpdate = cb;
            return () => { };
        });

        const { result } = renderHook(() => useLessons({}, false, vi.fn()));

        // Act: Trigger Firestore update
        await waitFor(() => expect(triggerUpdate).toBeDefined());

        act(() => {
            triggerUpdate(MOCK_FIRESTORE_LESSONS);
        });

        // Assert: Cloud1 should invoke cloud version (priority), Local1 should be present
        await waitFor(() => {
            const lessons = result.current.publicLessons;
            expect(lessons).toHaveLength(3); // cloud1, cloud2, local1

            const cloud1 = lessons.find(l => l.id === 'cloud1');
            expect(cloud1.title).toBe('Cloud Lesson 1'); // Priority check
        });
    });

    it('should update state when firestore emits new data', async () => {
        mockListLocal.mockResolvedValue([]);

        let triggerUpdate;
        mockSubscribe.mockImplementation((cb) => {
            triggerUpdate = cb;
            return () => { };
        });

        const { result } = renderHook(() => useLessons({}, false, vi.fn()));

        await waitFor(() => expect(triggerUpdate).toBeDefined());

        // Initial Empty
        act(() => {
            triggerUpdate([]);
        });
        expect(result.current.publicLessons).toEqual([]);

        // Update
        act(() => {
            triggerUpdate(MOCK_FIRESTORE_LESSONS);
        });

        await waitFor(() => {
            expect(result.current.publicLessons).toEqual(MOCK_FIRESTORE_LESSONS);
        });
    });
});
