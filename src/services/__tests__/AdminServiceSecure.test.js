import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '../adminService';
import { httpsCallable } from 'firebase/functions';

// Mock dependencies
vi.mock('../firebase', () => ({
    functions: {},
    db: {}
}));

vi.mock('firebase/functions', () => ({
    httpsCallable: vi.fn()
}));

vi.mock('../userService', () => ({
    userService: {
        listUsers: vi.fn(),
        getProfileByEmail: vi.fn(),
        updateBalance: vi.fn() // Should NOT be called now
    }
}));

describe('AdminService Secure Grant', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call the grantCoins cloud function with correct parameters', async () => {
        const mockGrantFn = vi.fn().mockResolvedValue({
            data: { success: true, newBalance: 150 }
        });
        httpsCallable.mockReturnValue(mockGrantFn);

        const userObj = { uid: 'test-uid-123', email: 'test@example.com' };
        const result = await adminService.grantCoins('token', userObj, 50);

        // Verify it didn't use the old insecure method
        const { userService } = await import('../userService');
        expect(userService.updateBalance).not.toHaveBeenCalled();

        // Verify it used the cloud function
        expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'grantCoins');
        expect(mockGrantFn).toHaveBeenCalledWith({ uid: 'test-uid-123', amount: 50 });

        expect(result).toEqual({
            success: true,
            newBalance: 150,
            email: 'test@example.com'
        });
    });

    it('should handle permission denied errors gracefully', async () => {
        const mockGrantFn = vi.fn().mockRejectedValue(new Error('permission-denied'));
        httpsCallable.mockReturnValue(mockGrantFn);

        const userObj = { uid: 'test-uid-123' };

        await expect(adminService.grantCoins('token', userObj, 50))
            .rejects.toThrow("Permission Denied: You are not authorized to grant coins.");
    });
});
