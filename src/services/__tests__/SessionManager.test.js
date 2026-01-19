import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager, sessionManager } from '../sessionManager';

describe('SessionManager (Zero-Trust Isolation)', () => {
    let mockLocalStorage;

    beforeEach(() => {
        // Mock LocalStorage
        let store = {};
        mockLocalStorage = {
            getItem: vi.fn(key => store[key] || null),
            setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
            removeItem: vi.fn(key => { delete store[key]; }),
            clear: vi.fn(() => { store = {}; }),
            key: vi.fn(index => Object.keys(store)[index] || null),
            get length() { return Object.keys(store).length; }
        };

        // Inject mock into global window
        vi.stubGlobal('localStorage', mockLocalStorage);
        vi.stubGlobal('window', { localStorage: mockLocalStorage });

        // Reset singleton (hacky but needed for tests if state leaks)
        sessionManager.endSession();
    });

    it('should throw Security Violation when accessing userStore without session', () => {
        expect(() => sessionManager.userStore).toThrow(/Security Violation/);
    });

    it('should allow access to globalStore without session', () => {
        expect(() => sessionManager.globalStore).not.toThrow();
        sessionManager.globalStore.set('theme', 'dark');
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('cic_global_theme', '"dark"');
    });

    it('should namespace storage by UID', () => {
        sessionManager.startSession('user_123');
        sessionManager.userStore.set('secret', 'data');

        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('cic_user_user_123_secret', '"data"');
    });

    it('should isolate data between users', () => {
        // User A
        sessionManager.startSession('user_A');
        sessionManager.userStore.set('note', 'A_data');
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('cic_user_user_A_note', '"A_data"');

        // Switch to User B
        sessionManager.startSession('user_B');
        sessionManager.userStore.set('note', 'B_data');
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('cic_user_user_B_note', '"B_data"');

        // Verify UserStore now points to B
        // We can't easily peek into the private store map without implementation details, 
        // but the prefix check above confirms isolation.
    });

    it('should purge all user sessions on Cold-Start', () => {
        // Setup existing dirty state
        mockLocalStorage.setItem('cic_user_user_OLD_data', 'compromised');
        mockLocalStorage.setItem('cic_global_theme', 'light');
        mockLocalStorage.setItem('cic_lesson_legacy', 'delete_me');

        // Run Purge
        SessionManager.purgeAllUserSessions();

        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cic_user_user_OLD_data');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cic_lesson_legacy');
        expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('cic_global_theme');
    });
});
