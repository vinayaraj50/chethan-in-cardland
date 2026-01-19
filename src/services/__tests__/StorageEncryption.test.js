import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { storageService } from '../storageOrchestrator';
import * as drive from '../googleDrive';
import { identityService } from '../googleAuth';
import * as cryptoUtils from '../../utils/lessonCrypto';

// Mock dependencies
vi.mock('../googleDrive');
vi.mock('../googleAuth');
vi.mock('../../utils/lessonCrypto');

describe('StorageOrchestrator Encryption/Decryption Flow', () => {
    const MOCK_UID = 'user_123';
    const MOCK_KEY = 'mock_crypto_key';
    const ENCRYPTED_BLOB = 'v1:iv:ciphertext';
    const DECRYPTED_DATA = {
        title: 'Secret Lesson',
        questions: [{ q: 1, a: 1 }]
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup Identity
        try {
            Object.defineProperty(identityService, 'uid', {
                get: vi.fn(() => MOCK_UID),
                configurable: true
            });
        } catch (e) { }

        // Setup Crypto
        vi.mocked(cryptoUtils.deriveUserKey).mockResolvedValue(MOCK_KEY);
        vi.mocked(cryptoUtils.decryptLesson).mockResolvedValue(DECRYPTED_DATA);
        vi.mocked(cryptoUtils.encryptLesson).mockResolvedValue(ENCRYPTED_BLOB);

        // Setup Drive Defaults
        vi.mocked(drive.fetchLessonContent).mockResolvedValue({
            encryptedContent: ENCRYPTED_BLOB,
            driveFileId: 'file_123',
            modifiedTime: '2026-01-01'
        });

        // Silence logs
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'info').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        // Initialize Storage
        storageService.setDriveAccess(true, 'mock_token');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('getLessonContent decodes wrapped encrypted content correctly', async () => {
        const lesson = { id: '1', driveFileId: 'file_123', modifiedTime: '2026-01-01' };

        const result = await storageService.getLessonContent(lesson);

        // Verify crypto flow
        expect(cryptoUtils.deriveUserKey).toHaveBeenCalledWith(MOCK_UID);
        expect(cryptoUtils.decryptLesson).toHaveBeenCalledWith(ENCRYPTED_BLOB, MOCK_KEY);

        expect(result).toMatchObject({
            title: 'Secret Lesson',
            questions: [{ q: 1, a: 1 }],
            driveFileId: 'file_123'
        });

        expect(result.encryptedContent).toBeUndefined();
    });

    test('getLessonContent handles decryption failure gracefully', async () => {
        const lesson = { id: '1', driveFileId: 'file_fail', modifiedTime: '2026-01-01' };

        vi.mocked(cryptoUtils.decryptLesson).mockRejectedValue(new Error('Bad Key'));

        vi.mocked(drive.fetchLessonContent).mockResolvedValue({
            encryptedContent: 'bad_blob',
            driveFileId: 'file_fail'
        });

        const result = await storageService.getLessonContent(lesson);

        expect(result).toMatchObject({
            driveFileId: 'file_fail',
            encryptedContent: 'bad_blob'
        });
    });

    test('saveLesson encrypts data before sending to Drive', async () => {
        const lesson = { id: '1', title: 'Top Secret' };

        vi.mocked(drive.saveLesson).mockResolvedValue({ id: 'new_id' });

        await storageService.saveLesson(lesson);

        expect(cryptoUtils.deriveUserKey).toHaveBeenCalledWith(MOCK_UID);
        expect(cryptoUtils.encryptLesson).toHaveBeenCalledWith(expect.objectContaining(lesson), MOCK_KEY);

        expect(drive.saveLesson).toHaveBeenCalledWith(
            'mock_token',
            ENCRYPTED_BLOB,
            undefined, // fileId is undefined in lesson object
            null // folderId default is null
        );
    });
});
