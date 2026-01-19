import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionManager, SessionManager } from '../sessionManager';
import { storageService } from '../storageOrchestrator';

describe('Purchase Persistence & Smart Purge (Fix Verification)', () => {
    let mockLocalStorage;

    beforeEach(() => {
        // Reset LocalStorage
        let store = {};
        mockLocalStorage = {
            getItem: vi.fn(key => store[key] || null),
            setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
            removeItem: vi.fn(key => { delete store[key]; }),
            key: vi.fn(index => Object.keys(store)[index] || null),
            clear: vi.fn(() => { store = {}; }),
            get length() { return Object.keys(store).length; }
        };

        vi.stubGlobal('localStorage', mockLocalStorage);
        vi.stubGlobal('window', { localStorage: mockLocalStorage });

        // Reset SessionManager
        sessionManager.endSession();
    });

    it('should NOT purge current user data on session start (Smart Purge)', () => {
        const uid = 'user_123';
        const key = `cic_user_${uid}_lessons`;
        const data = JSON.stringify([{ id: 'purchased_1' }]);

        // 1. Simulate existing data for the user
        mockLocalStorage.setItem(key, data);

        // 2. Start session (This is what happens on refresh)
        // In the old version, main.jsx would have already purged everything.
        // In the new version, startSession performs a SMART purge.
        sessionManager.startSession(uid);

        // 3. Verify data is STILL THERE
        expect(mockLocalStorage.getItem(key)).toBe(data);
    });

    it('should purge OTHER user data on session start (Shared Device Security)', () => {
        const currentUid = 'user_A';
        const otherUid = 'user_B';

        const keyA = `cic_user_${currentUid}_data`;
        const keyB = `cic_user_${otherUid}_data`;

        mockLocalStorage.setItem(keyA, JSON.stringify('A_data'));
        mockLocalStorage.setItem(keyB, JSON.stringify('B_data'));

        // Start session for User A
        sessionManager.startSession(currentUid);

        // User A data should be preserved
        expect(mockLocalStorage.getItem(keyA)).toBe('"A_data"');

        // User B data should be REMOVED
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(keyB);
        expect(mockLocalStorage.getItem(keyB)).toBeNull();
    });

    it('should purge legacy keys on any session start', () => {
        const uid = 'user_123';
        const legacyKey = 'cic_lesson_old';
        mockLocalStorage.setItem(legacyKey, 'old_data');

        sessionManager.startSession(uid);

        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(legacyKey);
        expect(mockLocalStorage.getItem(legacyKey)).toBeNull();
    });

    it('should handle hot-swapping users by purging the previous user', () => {
        // 1. User A session
        sessionManager.startSession('user_A');
        mockLocalStorage.setItem('cic_user_user_A_data', JSON.stringify('A'));

        // 2. User B session starts (without explicit User A logout)
        sessionManager.startSession('user_B');

        // 3. User A data must be purged for security
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cic_user_user_A_data');
    });
});
