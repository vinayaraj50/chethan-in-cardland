import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';
import { useAuth } from '../components/AuthProvider';

/**
 * AdminContext
 * Standard: Big Tech "Store" Pattern (React Context + Repository)
 * Responsibility: Manages Admin State (Users, Loading, Errors)
 */

const AdminContext = createContext(null);

import { useUI } from './UIContext';

export const AdminProvider = ({ children }) => {
    const { user } = useAuth(); // Admin User
    const { showToast } = useUI();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingIds, setProcessingIds] = useState(new Set());
    const [recentlyGranted, setRecentlyGranted] = useState(new Set());
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ totalReceived: 0, lastSync: null });

    // Core Action: Discover Users (Authoritative Sync from Firestore)
    const discoverUsers = useCallback(async () => {
        if (!user) {
            setError('AUTH_REQUIRED');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await adminService.getUsers(user.token);
            setUsers(data || []);
            setStats({
                totalReceived: data?.length || 0,
                lastSync: new Date().toLocaleTimeString()
            });

        } catch (err) {
            console.error('[AdminContext] Discovery Failed:', err);
            setError(err.message || "Failed to synchronize registry.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial Load
    useEffect(() => {
        if (user) discoverUsers();
    }, [discoverUsers, user]);

    return (
        <AdminContext.Provider value={{
            users,
            loading,
            error,
            stats,
            processingIds,
            recentlyGranted,
            refresh: () => discoverUsers(),
            grantCoins: async (userObj, amount) => {
                const targetId = userObj.id || userObj.uid || userObj.email;
                const originalBalance = userObj.coins || 0;
                let isUndone = false;

                // 1. OPTIMISTIC UPDATE
                setUsers(current => current.map(u => {
                    const uId = u.id || u.uid || u.email;
                    if (uId === targetId) return { ...u, coins: (u.coins || 0) + amount };
                    return u;
                }));

                // 2. SHOW UNDO TOAST
                showToast({
                    message: `Granted ${amount} coins to ${userObj.email}`,
                    type: 'undo',
                    duration: 10000,
                    onUndo: () => {
                        isUndone = true;
                        setUsers(current => current.map(u => {
                            const uId = u.id || u.uid || u.email;
                            if (uId === targetId) return { ...u, coins: originalBalance };
                            return u;
                        }));
                    },
                    onClose: async () => {
                        if (isUndone) return;

                        setProcessingIds(prev => new Set(prev).add(targetId));
                        try {
                            const result = await adminService.grantCoins(user.token, userObj, amount);
                            if (result && result.newBalance !== undefined) {
                                setUsers(current => current.map(u => {
                                    const uId = u.id || u.uid || u.email;
                                    if (uId === targetId) return { ...u, coins: result.newBalance };
                                    return u;
                                }));
                            }
                        } catch (e) {
                            console.error('[AdminContext] Grant failed', e);
                            setUsers(current => current.map(u => {
                                const uId = u.id || u.uid || u.email;
                                if (uId === targetId) return { ...u, coins: originalBalance };
                                return u;
                            }));
                        } finally {
                            setProcessingIds(prev => {
                                const next = new Set(prev);
                                next.delete(targetId);
                                return next;
                            });
                        }
                    }
                });
            }
        }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) throw new Error("useAdmin must be used within AdminProvider");
    return context;
};
