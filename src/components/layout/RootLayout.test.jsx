import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RootLayout from './RootLayout';
import React from 'react';

// Mock child components
vi.mock('../CoinsDisplay', () => ({
    default: () => <div data-testid="coins-display">Coins</div>
}));

// Mock icons
vi.mock('lucide-react', () => ({
    Plus: () => <div data-testid="plus-icon" />,
    Menu: () => <div data-testid="menu-icon" />,
    Zap: () => <div data-testid="zap-icon" />,
    RefreshCw: () => <div data-testid="refresh-icon" />
}));

describe('RootLayout Component', () => {
    const mockProps = {
        user: { email: 'test@example.com' },
        userProfile: { coins: 100 },
        isUnlimited: false,
        isProfileLoading: false,
        onShowMenu: vi.fn(),
        onShowCoinModal: vi.fn(),
        onAddStack: vi.fn(),
        onLogin: vi.fn(),
        children: <div data-testid="child">Child Content</div>
    };

    it('should render without crashing and include the Refresh icon when loading', () => {
        const { getByTestId, rerender } = render(<RootLayout {...mockProps} isProfileLoading={true} />);

        expect(getByTestId('refresh-icon')).toBeTruthy();
        expect(getByTestId('child')).toBeTruthy();
    });

    it('should not show refresh icon when not loading', () => {
        const { queryByTestId } = render(<RootLayout {...mockProps} isProfileLoading={false} />);
        expect(queryByTestId('refresh-icon')).toBeNull();
    });
});
