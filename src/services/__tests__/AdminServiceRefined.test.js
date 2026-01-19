import { describe, it, expect, vi } from 'vitest';
import { adminService } from '../adminService';
import { userService } from '../userService';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase Functions
vi.mock('firebase/functions', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        httpsCallable: vi.fn()
    };
});

describe('AdminService Refined Fix Verification', () => {
    it('getUsers should correctly map UID from doc id', async () => {
        // Mock listUsers to return data with only doc 'id', no 'uid' field
        const spy = vi.spyOn(userService, 'listUsers').mockResolvedValue([
            { id: 'UID_123', email: 'test@example.com' }
        ]);

        const users = await adminService.getUsers('token');

        expect(users[0].uid).toBe('UID_123');
        expect(users[0].id).toBe('UID_123');
        expect(users[0].email).toBe('test@example.com');

        spy.mockRestore();
    });

    it('grantCoins should identify UID from id field if uid field is missing', async () => {
        const mockGrantFn = vi.fn().mockResolvedValue({ data: { newBalance: 100 } });
        vi.mocked(httpsCallable).mockReturnValue(mockGrantFn);

        const userObj = { id: 'UID_456', email: 'other@example.com' };
        const result = await adminService.grantCoins('token', userObj, 50);

        expect(mockGrantFn).toHaveBeenCalledWith({ uid: 'UID_456', amount: 50 });
        expect(result.newBalance).toBe(100);
    });

    it('grantCoins should fallback to email lookup if both uid and id are missing or email-like', async () => {
        const mockGrantFn = vi.fn().mockResolvedValue({ data: { newBalance: 200 } });
        vi.mocked(httpsCallable).mockReturnValue(mockGrantFn);
        const spyLookup = vi.spyOn(userService, 'getProfileByEmail').mockResolvedValue({ id: 'UID_LOOKUP', uid: 'UID_LOOKUP' });

        const userObj = { email: 'lookup@example.com' };
        const result = await adminService.grantCoins('token', userObj, 100);

        expect(spyLookup).toHaveBeenCalledWith('lookup@example.com');
        expect(mockGrantFn).toHaveBeenCalledWith({ uid: 'UID_LOOKUP', amount: 100 });
        expect(result.newBalance).toBe(200);

        spyLookup.mockRestore();
    });
});
