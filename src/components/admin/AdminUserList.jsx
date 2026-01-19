import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Mail, Calendar, LogIn, ChevronRight, User } from 'lucide-react';

/**
 * AdminUserList - High-Fidelity Data Grid
 * Design Standard: Premium Dashboard (Shopify/Stripe level)
 * Features: rem-scaling, micro-interactions, responsive flex-grid.
 */
const AdminUserList = ({ users, loading, onGrantClick }) => {
    if (loading && users.length === 0) {
        return (
            <div style={styles.emptyState}>
                <div className="spinning" style={styles.largeLoader}><Zap size={32} /></div>
                <p style={styles.emptyText}>Synchronizing with Authority Registry...</p>
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div style={styles.emptyState}>
                <div className="neo-inset" style={styles.emptyIcon}><User size={32} /></div>
                <p style={styles.emptyText}>No matching records discovered in the current registry scope.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Desktop Header Grid */}
            <div style={styles.gridHeader} className="hide-mobile">
                <div style={styles.colEmail}>EMAIL ADDRESS</div>
                <div style={styles.colActivity}>LAST ACTIVE</div>
                <div style={styles.colLogins}>LOGINS</div>
                <div style={styles.colActions}>LEDGER ACTIONS</div>
            </div>

            {/* Responsive Row List */}
            <div style={styles.list}>
                <AnimatePresence>
                    {users.map((user, idx) => (
                        <motion.div
                            key={user.id || user.email}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="neo-flat-hover"
                            style={styles.row}
                        >
                            {/* Identity Section */}
                            <div style={styles.colEmail}>
                                <div style={styles.avatarGroup}>
                                    <div style={styles.avatar} className="neo-inset">
                                        {user.displayName?.charAt(0).toUpperCase() || <Mail size={14} />}
                                    </div>
                                    <div style={styles.identityInfo}>
                                        <span style={styles.userName}>{user.displayName}</span>
                                        <span style={styles.userEmail}>{user.email}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Temporal Section */}
                            <div style={styles.colActivity}>
                                <div style={styles.metaBox}>
                                    <Calendar size={14} style={styles.metaIcon} />
                                    <span>{new Date(user.lastLogin).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            </div>

                            {/* Engagement Section */}
                            <div style={styles.colLogins}>
                                <div style={styles.metaBox}>
                                    <LogIn size={14} style={styles.metaIcon} />
                                    <span style={styles.bold}>{user.loginCount}</span>
                                    <span style={styles.unit}>Sessions</span>
                                </div>
                            </div>

                            {/* Ledger Action Section */}
                            <div style={styles.colActions}>
                                <div style={styles.grantGroup}>
                                    <GrantBtn amount={50} label="+ ₹79" onClick={() => onGrantClick(user, 50)} />
                                    <GrantBtn amount={200} label="+ ₹299" onClick={() => onGrantClick(user, 200)} />
                                    <GrantBtn amount={500} label="+ ₹479" onClick={() => onGrantClick(user, 500)} />
                                </div>
                            </div>

                            <ChevronRight size={16} style={styles.chevron} className="hide-mobile" />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

const GrantBtn = ({ amount, label, onClick }) => (
    <button className="neo-button" style={styles.grantBtn} onClick={onClick}>
        <span style={styles.grantLabel}>{label}</span>
        <span style={styles.grantAmount}>+ {amount}</span>
    </button>
);

// --- Big Tech Precision Styling (rem-based) ---

const styles = {
    container: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    gridHeader: {
        display: 'grid',
        gridTemplateColumns: 'minmax(20rem, 2fr) 1.5fr 1fr 2.5fr 2rem',
        padding: '0 1.5rem 1rem',
        fontSize: '0.7rem',
        fontWeight: 800,
        color: 'var(--text-color)',
        opacity: 0.4,
        letterSpacing: '0.1em',
        textTransform: 'uppercase'
    },
    list: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    row: {
        display: 'grid',
        gridTemplateColumns: 'minmax(20rem, 2fr) 1.5fr 1fr 2.5fr 2rem',
        padding: '1.25rem 1.5rem',
        alignItems: 'center',
        background: 'white',
        borderRadius: '16px',
        transition: 'all 0.2s ease',
        cursor: 'default'
    },
    avatarGroup: { display: 'flex', alignItems: 'center', gap: '1rem' },
    avatar: {
        width: '2.5rem',
        height: '2.5rem',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '1rem',
        color: 'var(--accent-color)',
        background: 'var(--bg-color)',
        boxShadow: 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)'
    },
    identityInfo: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
    userName: { fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' },
    userEmail: { fontSize: '0.75rem', opacity: 0.5 },
    metaBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' },
    metaIcon: { opacity: 0.3 },
    bold: { fontWeight: 700 },
    unit: { fontSize: '0.7rem', opacity: 0.5 },
    grantGroup: { display: 'flex', gap: '0.75rem' },
    grantBtn: {
        flex: 1,
        padding: '0.5rem 0.75rem',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.2rem',
        minWidth: '4.5rem'
    },
    grantLabel: { fontSize: '0.65rem', fontWeight: 800, opacity: 0.8 },
    grantAmount: { fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-color)' },
    chevron: { opacity: 0.1 },
    emptyState: { padding: '8rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' },
    largeLoader: { color: 'var(--accent-color)', opacity: 0.5 },
    emptyIcon: { padding: '1.5rem', borderRadius: '50%', background: 'var(--bg-color)', opacity: 0.2 },
    emptyText: { fontSize: '1rem', opacity: 0.4, fontWeight: 500, maxWidth: '20rem' },
    colEmail: {}, colActivity: {}, colLogins: {}, colActions: {}
};

export default AdminUserList;
