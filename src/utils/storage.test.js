import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageStore } from './storage';

describe('StorageStore', () => {
    let mockLocalStorage;
    let storage;

    beforeEach(() => {
        let store = {};
        mockLocalStorage = {
            getItem: vi.fn(key => store[key] || null),
            setItem: vi.fn((key, value) => {
                store[key] = value.toString();
            }),
            removeItem: vi.fn(key => {
                delete store[key];
            }),
            clear: vi.fn(() => {
                store = {};
            }),
            key: vi.fn(index => Object.keys(store)[index] || null),
            get length() {
                return Object.keys(store).length;
            }
        };

        // Instantiate a fresh storage store for each test
        storage = new StorageStore('cic_v1_', mockLocalStorage);
        vi.clearAllMocks();
    });

    it('should set and get values correctly', () => {
        const key = 'test-key';
        const value = { foo: 'bar' };

        storage.set(key, value);
        expect(storage.get(key)).toEqual(value);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('cic_v1_' + key, JSON.stringify(value));
    });

    it('should return defaultValue if key does not exist', () => {
        expect(storage.get('non-existent', 'default')).toBe('default');
    });

    it('should handle JSON parse errors gracefully', () => {
        const key = 'bad-json';
        mockLocalStorage.getItem.mockReturnValue('invalid-json');

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        expect(storage.get(key, 'fallback')).toBe('fallback');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should remove items correctly', () => {
        storage.set('to-remove', 123);
        storage.remove('to-remove');
        expect(storage.get('to-remove')).toBe(null);
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cic_v1_to-remove');
    });

    it('should list keys in the current namespace', () => {
        storage.set('key1', 1);
        storage.set('key2', 2);

        // Add a key from another namespace directly to mock
        mockLocalStorage.setItem('other_key', 'value');

        const keys = storage.keys();
        expect(keys).toContain('key1');
        expect(keys).toContain('key2');
        expect(keys).not.toContain('other_key');
        expect(keys).toHaveLength(2);
    });

    it('should purge only namespaced keys', () => {
        storage.set('app_key', 'data');
        mockLocalStorage.setItem('foreign_key', 'data');

        storage.purge();

        expect(storage.get('app_key')).toBe(null);
        expect(mockLocalStorage.getItem('foreign_key')).toBe('data');
    });
});
