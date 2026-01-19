import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUserProfile } from './useUserProfile';
import { userService } from '../services/userService';

// Mock Services
vi.mock('../services/userService', () => ({
    userService: {
        syncProfile: vi.fn(),
        checkDailyBonus: vi.fn(),
        applyReferral: vi.fn(),
        updateBalance: vi.fn().mockResolvedValue(true)
    }
}));

describe('useUserProfile Hook', () => {
    const mockUser = { uid: 'fake-uid', email: 'test@example.com', token: 'fake-token' };
    const mockShowAlert = vi.fn();
    const mockSetRewardData = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize and fetch profile on mount', async () => {
        const mockProfile = { coins: 100, displayName: 'Test User', uid: 'fake-uid' };
        userService.syncProfile.mockResolvedValue(mockProfile);
        userService.checkDailyBonus.mockResolvedValue({ awarded: false });

        const { result } = renderHook(() => useUserProfile(mockUser, mockShowAlert, mockSetRewardData));

        // Use a small delay for the useEffect to trigger
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(userService.syncProfile).toHaveBeenCalledWith(mockUser);
        expect(result.current.userProfile).toEqual(mockProfile);
    });

    it('should detect external coin grants and trigger reward animation', async () => {
        const initialProfile = { coins: 100, displayName: 'Test User', uid: 'fake-uid' };
        const updatedProfile = { coins: 150, displayName: 'Test User', uid: 'fake-uid' };

        userService.syncProfile.mockResolvedValueOnce(initialProfile);
        userService.checkDailyBonus.mockResolvedValueOnce({ awarded: false });

        const { result } = renderHook(({ user }) =>
            useUserProfile(user, mockShowAlert, mockSetRewardData),
            { initialProps: { user: mockUser } }
        );

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.userProfile.coins).toBe(100);

        // Simulate a refresh trigger
        userService.syncProfile.mockResolvedValueOnce(updatedProfile);
        userService.checkDailyBonus.mockResolvedValueOnce({ awarded: false });

        await act(async () => {
            result.current.loadProfile();
            await new Promise(resolve => setTimeout(resolve, 10)); // Allow effect to run
        });

        expect(result.current.userProfile.coins).toBe(150);
        expect(mockSetRewardData).toHaveBeenCalledWith({ amount: 50, type: 'Gift Received' });
    });

    it('should handle profile update correctly', async () => {
        const mockProfile = { coins: 100, displayName: 'Test User', uid: 'fake-uid' };
        userService.syncProfile.mockResolvedValue(mockProfile);
        userService.checkDailyBonus.mockResolvedValue({ awarded: false });

        const { result } = renderHook(() => useUserProfile(mockUser, mockShowAlert, mockSetRewardData));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        await act(async () => {
            result.current.handleUpdateCoins(200);
        });

        expect(result.current.userProfile.coins).toBe(200);
    });
});
