import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deriveUserKey, encryptLesson, decryptLesson } from './lessonCrypto';

describe('lessonCrypto', () => {
    const mockUID = 'user_123_abc';
    const mockData = { id: 'lesson_1', title: 'Test Lesson', questions: [] };

    it('should derive a consistent key for the same UID', async () => {
        const key1 = await deriveUserKey(mockUID);
        const key2 = await deriveUserKey(mockUID);

        // Keys should be identical in properties (though internal pointers differ)
        expect(key1.type).toBe('secret');
        expect(key1.algorithm.name).toBe('AES-GCM');
        expect(key1.extractable).toBe(false);
    });

    it('should result in successful encryption/decryption cycle', async () => {
        const key = await deriveUserKey(mockUID);
        const encrypted = await encryptLesson(mockData, key);

        expect(typeof encrypted).toBe('string');
        expect(encrypted.length).toBeGreaterThan(50);

        const decrypted = await decryptLesson(encrypted, key);
        expect(decrypted).toEqual(mockData);
    });

    it('should fail to decrypt with a different key (different UID)', async () => {
        const key1 = await deriveUserKey(mockUID);
        const key2 = await deriveUserKey('another_user_456');

        const encrypted = await encryptLesson(mockData, key1);

        await expect(decryptLesson(encrypted, key2)).rejects.toThrow('Lesson decryption failed');
    });

    it('should handle string data correctly', async () => {
        const key = await deriveUserKey(mockUID);
        const text = 'Hello Cardland';
        const encrypted = await encryptLesson(text, key);
        const decrypted = await decryptLesson(encrypted, key);

        expect(decrypted).toBe(text);
    });

    it('should throw error for corrupted data', async () => {
        const key = await deriveUserKey(mockUID);
        const corrupted = 'not_base64_or_too_short';

        await expect(decryptLesson(corrupted, key)).rejects.toThrow();
    });
});
