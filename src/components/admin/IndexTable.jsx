import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import GrantCoinsModal from './GrantCoinsModal';
import { requestDriveAccess } from '../../services/googleAuth';
import { RefreshCw, AlertTriangle, CheckCircle, Database, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { userService } from '../../services/userService';

/**
 * IndexTable - Shopify Polaris Standard
 * Features:
 * - Semantic Table Structure (thead, tbody)
 * - Mobile Responsive Stacking (Cards on Mobile)
 * - Diagnostic Feedback for Empty/Error States
 * - Explicit Auth Trigger
 */

const IndexTable = () => {
    const { users, loading, error, stats, refresh, grantCoins, processingIds, recentlyGranted } = useAdmin();
    const [selectedUser, setSelectedUser] = React.useState(null);

    if (loading && users.length === 0) {
        return <LoadingState />;
    }

    if (error === 'AUTH_REQUIRED') {
        return <AuthRequiredState />;
    }

    if (error) {
        return <ErrorState error={error} retry={refresh} />;
    }

    return (
        <div style={styles.container}>
            {/* Index Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>Users</h1>
                <div style={styles.actions}>
                    <span style={styles.badge}>{users.length} Records</span>
                    <button onClick={refresh} style={styles.iconBtn} title="Refresh Index">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Diagnostic Alert */}
            {stats.lastSync && (
                <div style={styles.diagnosticBanner}>
                    <CheckCircle size={14} color="#008060" />
                    <span>Directory Synced at {stats.lastSync}. Status: Live from Firestore</span>
                </div>
            )}

            {users.length === 0 ? (
                <EmptyState retry={refresh} />
            ) : (
                <div style={styles.card}>
                    <div className="table-responsive">
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.theadRow}>
                                    <th style={styles.th}>Name</th>
                                    <th style={styles.th}>Email</th>
                                    <th style={styles.th}>Last Active</th>
                                    <th style={styles.th}>Logins</th>
                                    <th style={styles.th}>Coins</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => {
                                    const userId = user.id || user.uid || user.email;
                                    const isProcessing = processingIds?.has(userId);
                                    const isRecentlyGranted = recentlyGranted?.has(userId);

                                    return (
                                        <tr key={userId} style={styles.tr}>
                                            <td style={styles.td}>
                                                <span style={styles.nameText}>{user.displayName}</span>
                                            </td>
                                            <td style={styles.td}>{user.email}</td>
                                            <td style={styles.td}>
                                                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '-'}
                                            </td>
                                            <td style={styles.td}>{user.loginCount || 0}</td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    color: '#008060',
                                                    fontWeight: 700,
                                                    background: '#e3f1df',
                                                    padding: '2px 8px',
                                                    borderRadius: '10px',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {user.coins || 0}
                                                </span>
                                            </td>
                                            <td style={styles.td}>
                                                <button
                                                    disabled={isProcessing}
                                                    onClick={() => setSelectedUser(user)}
                                                    style={{
                                                        ...styles.actionLink,
                                                        color: isRecentlyGranted ? '#008060' : (isProcessing ? '#6d7175' : '#101010'),
                                                        opacity: isProcessing ? 0.5 : 1,
                                                        cursor: isProcessing ? 'wait' : 'pointer',
                                                        textDecoration: isProcessing ? 'none' : 'underline',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    {isRecentlyGranted ? (
                                                        <><CheckCircle size={14} /> Success</>
                                                    ) : (
                                                        isProcessing ? 'Granting...' : 'Grant Coins'
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <GrantCoinsModal
                user={selectedUser}
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                onGrant={grantCoins}
            />

            <style>{`
                .table-responsive { overflow-x: auto; }
                @media (max-width: 600px) {
                    /* Mobile styles can be enhanced here */
                }
            `}</style>
        </div>
    );
};

// --- Sub-Components ---

const AuthRequiredState = () => {
    const [localLoading, setLocalLoading] = React.useState(false);
    return (
        <div style={styles.errorBox}>
            <Lock size={32} color="#5c5f62" />
            <h3 style={styles.errorTitle}>Authorization Required</h3>
            <p style={styles.errorDesc}>Admin access requires Google Drive permissions.</p>
            <button
                disabled={localLoading}
                onClick={async () => {
                    setLocalLoading(true);
                    try {
                        console.log('[AdminAuth] Requesting Drive Access...');
                        await requestDriveAccess();
                        console.log('[AdminAuth] Access Granted. Refreshing context...');
                    } catch (e) {
                        console.error('[AdminAuth] Access Denied:', e);
                        alert(`Authorization Failed: ${e.message || e}`);
                    } finally {
                        setLocalLoading(false);
                    }
                }}
                style={{
                    ...styles.primaryBtn,
                    opacity: localLoading ? 0.7 : 1,
                    cursor: localLoading ? 'wait' : 'pointer'
                }}
            >
                {localLoading ? 'Authorizing...' : 'Authorize Admin Access'}
            </button>
        </div>
    );
};

const LoadingState = () => (
    <div style={styles.centerBox}>
        <div className="polaris-spinner" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: '#6d7175' }}>Loading Users from Firestore...</p>
    </div>
);

const ErrorState = ({ error, retry }) => (
    <div style={styles.errorBox}>
        <AlertTriangle size={32} color="#d82c0d" />
        <h3 style={styles.errorTitle}>Directory Access Failed</h3>
        <p style={styles.errorDesc}>{error}</p>
        <button onClick={retry} style={styles.primaryBtn}>Retry Sync</button>
    </div>
);

const EmptyState = ({ retry }) => {
    const { user } = useAuth();
    const [registering, setRegistering] = React.useState(false);

    const handleRegister = async () => {
        if (!user) return;
        setRegistering(true);
        try {
            await userService.syncProfile(user);
            retry();
        } catch (e) {
            console.error(e);
            alert("Registration failed: " + e.message);
        } finally {
            setRegistering(false);
        }
    };

    return (
        <div style={styles.centerBox}>
            <Database size={48} color="#babec3" />
            <h2 style={styles.emptyTitle}>No Users Found</h2>
            <p style={styles.emptyDesc}>The user directory is currently empty.</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={retry} style={styles.primaryBtn}>
                    <RefreshCw size={14} style={{ marginRight: '8px' }} /> Refresh List
                </button>
                <button
                    onClick={handleRegister}
                    disabled={registering || !user}
                    style={{
                        ...styles.primaryBtn,
                        background: 'white',
                        color: '#008060',
                        border: '1px solid #008060',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <UserPlus size={14} style={{ marginRight: '8px' }} />
                    {registering ? 'Registering...' : 'Register Me'}
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
    title: { fontSize: '1.5rem', fontWeight: 700, color: '#202223', margin: 0 },
    actions: { display: 'flex', gap: '1rem', alignItems: 'center' },
    badge: { background: '#dfe3e8', color: '#202223', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 },
    iconBtn: { background: 'white', border: '1px solid #e1e3e5', borderRadius: '4px', padding: '0.5rem', cursor: 'pointer', color: '#5c5f62' },
    diagnosticBanner: {
        background: '#e3f1df', // Shopify Success Light
        color: '#008060',
        padding: '0.75rem 1rem',
        borderRadius: '4px',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        border: '1px solid #1a1a1a0d'
    },
    card: {
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 0 0 1px rgba(63, 63, 68, 0.05), 0 1px 3px 0 rgba(63, 63, 68, 0.15)',
        overflow: 'hidden'
    },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    theadRow: { background: '#f9fafb', borderBottom: '1px solid #e1e3e5' },
    th: { padding: '1rem', fontSize: '0.8rem', fontWeight: 600, color: '#6d7175', textTransform: 'uppercase' },
    tr: { borderBottom: '1px solid #e1e3e5' },
    td: { padding: '1rem', fontSize: '0.9rem', color: '#202223' },
    nameText: { fontWeight: 600 },
    actionLink: {
        background: 'none', border: 'none', color: '#008060', fontWeight: 600,
        cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline'
    },
    centerBox: { padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    primaryBtn: {
        marginTop: '1rem', padding: '0.75rem 1.5rem', background: '#008060',
        color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer'
    },
    errorBox: {
        padding: '2rem', background: '#fff4f4', border: '1px solid #eecaca', borderRadius: '8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#8f2316'
    },
    errorTitle: { marginTop: '1rem', fontSize: '1.2rem' },
    errorDesc: { opacity: 0.8 }
};

export default IndexTable;
