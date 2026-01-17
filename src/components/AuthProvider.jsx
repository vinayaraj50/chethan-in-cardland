import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { identityService, IdentityState } from '../services/googleAuth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState(identityService.getSnapshot());

    useEffect(() => {
        // Subscribe to auth state changes from the singleton service
        const unsubscribe = identityService.subscribe((newState) => {
            setAuthState(newState);
        });

        // Initialize the service if not already running
        identityService.initialize().catch(err => {
            console.error('[AuthProvider] Identity Initialization Failed:', err);
        });

        return () => unsubscribe();
    }, []);

    const signIn = useCallback((prompt = 'select_account') => {
        identityService.signIn({ prompt });
    }, []);

    const signOut = useCallback(() => {
        identityService.signOut();
    }, []);

    const value = {
        user: authState.user,
        authStatus: authState.status,
        error: authState.error,
        token: authState.token,
        hasDrive: authState.hasDrive,
        signIn,
        signOut,
        isLoading: authState.status === IdentityState.INITIALIZING || authState.status === IdentityState.AUTHENTICATING || authState.status === IdentityState.AUTHORIZING,
        isReady: authState.status !== IdentityState.IDLE && authState.status !== IdentityState.INITIALIZING
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
