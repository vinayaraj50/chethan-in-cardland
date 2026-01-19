import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RootLayout from './RootLayout';
import React from 'react';

// Mock child components
vi.mock('../CoinsDisplay', () => ({
    default: () => <div data-testid="coins-display">Coins</div>
}));

// Mock UIContext
vi.mock('../../context/UIContext', () => ({
    useUI: () => ({
        headerNotice: null,
        clearHeaderNotice: vi.fn(),
        toast: null,
        hideToast: vi.fn(),
        notification: null,
        clearNotification: vi.fn()
    })
}));

// Mock icons
vi.mock('lucide-react', () => ({
    Plus: () => <div data-testid="plus-icon" />,
    Menu: () => <div data-testid="menu-icon" />,
    Zap: () => <div data-testid="zap-icon" />,
    RefreshCw: () => <div data-testid="refresh-icon" />,
    X: () => <div data-testid="x-icon" />
}));

describe('RootLayout Component', () => {
    const mockProps = {
        user: { email: 'test@example.com' },
        userProfile: { coins: 100 },
        isUnlimited: false,
        isProfileLoading: false,
        onShowMenu: vi.fn(),
        onShowCoinModal: vi.fn(),
        onAddLesson: vi.fn(),
        onLogin: vi.fn(),
        children: <div data-testid="child">Child Content</div>
    };

    it('should show the header loader when headerLoading is true', () => {
        const { container } = render(<RootLayout {...mockProps} headerLoading={true} />);

        // The loader is represented by card-loader-small class
        const loader = container.querySelector('.card-loader-small');
        expect(loader).toBeTruthy();
        expect(screen.getByTestId('child')).toBeTruthy();
    });

    it('should not show loader when headerLoading is false', () => {
        const { container } = render(<RootLayout {...mockProps} headerLoading={false} />);
        const loader = container.querySelector('.card-loader-small');
        expect(loader).toBeNull();
    });
});
