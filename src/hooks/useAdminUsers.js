import { useReducer, useCallback, useEffect, useMemo } from 'react';
import { listUsers, grantCoins } from '../services/adminService';
import { useAuth } from '../components/AuthProvider';

/**
 * useAdminUsers - State-managed orchestration hook for Admin Workspace.
 * Employs a formal state machine to manage user registry lifecycles.
 */
const initialState = {
    users: [],
    loading: false,
    error: null,
    total: 0,
    offset: 0,
    hasMore: false,
    search: ''
};

function adminReducer(state, action) {
    switch (action.type) {
        case 'INIT_FETCH':
            return { ...state, loading: true, error: null, offset: 0 };
        case 'INIT_MORE':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return {
                ...state,
                loading: false,
                users: action.isAppend ? [...state.users, ...action.payload.data] : action.payload.data,
                total: action.payload.total,
                hasMore: action.payload.hasMore,
                offset: state.offset + action.payload.data.length
            };
        case 'FETCH_FAILURE':
            return { ...state, loading: false, error: action.payload };
        case 'SET_SEARCH':
            return { ...state, search: action.payload, offset: 0 };
        case 'GRANT_OPTIMISTIC':
            return {
                ...state,
                users: state.users.map(u => u.email === action.payload.email ? { ...u, coins: (u.coins || 0) + action.payload.amount } : u)
            };
        case 'GRANT_REVERT':
            return {
                ...state,
                users: state.users.map(u => u.email === action.payload.email ? { ...u, coins: (u.coins || 0) - action.payload.amount } : u)
            };
        default:
            return state;
    }
}

export const useAdminUsers = (activeSection, searchInput, publicFolderId = null, showToast = null) => {
    const { token } = useAuth();
    const [state, dispatch] = useReducer(adminReducer, initialState);

    const executeDiscovery = useCallback(async (isNextPage = false) => {
        if (!token || !publicFolderId) return;

        dispatch({ type: isNextPage ? 'INIT_MORE' : 'INIT_FETCH' });
        try {
            const result = await listUsers(token, publicFolderId, {
                offset: isNextPage ? state.offset : 0,
                limit: 50,
                search: state.search
            });
            dispatch({ type: 'FETCH_SUCCESS', payload: result, isAppend: isNextPage });
        } catch (err) {
            dispatch({ type: 'FETCH_FAILURE', payload: err.message });
        }
    }, [token, publicFolderId, state.offset, state.search]);

    // Handle initial load and searching
    useEffect(() => {
        if (activeSection === 'users') {
            executeDiscovery(false);
        }
    }, [activeSection, state.search]);

    // Debounce search input from UI
    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch({ type: 'SET_SEARCH', payload: searchInput });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleGrant = useCallback(async (userObj, amount) => {
        if (!token) return;

        const targetEmail = userObj.email;
        let isUndone = false;

        // 1. Optimistic Update
        dispatch({ type: 'GRANT_OPTIMISTIC', payload: { email: targetEmail, amount } });

        // 2. Show Toast with Undo
        if (showToast) {
            showToast({
                message: `Granted ${amount} coins to ${targetEmail}`,
                type: 'undo',
                duration: 8000,
                onUndo: () => {
                    isUndone = true;
                    dispatch({ type: 'GRANT_REVERT', payload: { email: targetEmail, amount } });
                },
                onClose: async () => {
                    if (!isUndone) {
                        try {
                            await grantCoins(token, userObj, amount);
                        } catch (err) {
                            console.error('[useAdminUsers] Ledger Sync Failed', err);
                            dispatch({ type: 'GRANT_REVERT', payload: { email: targetEmail, amount } });
                            // Optionally alert if physical sync fails after toast closes
                        }
                    }
                }
            });
        } else {
            // Fallback if no toast system provided
            try {
                await grantCoins(token, userObj, amount);
            } catch (err) {
                dispatch({ type: 'GRANT_REVERT', payload: { email: targetEmail, amount } });
                throw err;
            }
        }
    }, [token, showToast]);

    return {
        ...state,
        fetchMore: () => executeDiscovery(true),
        refresh: () => executeDiscovery(false),
        handleGrant
    };
};
