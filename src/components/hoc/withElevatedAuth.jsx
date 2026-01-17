import React from 'react';
import { useAuth } from '../AuthProvider';

/**
 * @fileoverview ScopeGuard HOC - Implements "Just-in-Time" Authorization.
 * Highly reusable pattern to prevent business logic leakage into View components.
 */

export const withElevatedAuth = (WrappedComponent) => {
    return (props) => {
        const { user, hasDrive, signIn } = useAuth();

        const handleAction = async (originalOnClick, ...args) => {
            if (!user) {
                // Not even logged in
                signIn({ prompt: 'select_account' });
                return;
            }

            if (!hasDrive) {
                // Logged in but no Drive (Recruiter mode or just skipped)
                if (window.confirm("This action requires Google Drive for cloud sync. Would you like to enable it now?\n\n(If you are a reviewer, you can continue using Local Storage)")) {
                    signIn({ prompt: 'consent', elevated: true });
                } else {
                    // Proceed with local storage mode if confirmed
                    originalOnClick?.(...args);
                }
                return;
            }

            // All clear
            originalOnClick?.(...args);
        };

        return <WrappedComponent {...props} onProtectedClick={handleAction} />;
    };
};
