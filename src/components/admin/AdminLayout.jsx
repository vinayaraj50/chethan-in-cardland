import React, { useState, useEffect } from 'react';
import {
    Users, Database, FileText, Settings,
    Search, LogOut, Menu, X
} from 'lucide-react';

/**
 * AdminLayout - Shopify Polaris Standard Shell
 * 
 * Logic:
 * - Desktop: Persistent Sidebar.
 * - Mobile: Hamburger Menu toggles Drawer (Overlay).
 * 
 * Visuals:
 * - Clean White Background (--p-surface)
 */

const AdminLayout = ({ children, activeSection, onNavigate, onClose }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Responsive Check
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

    return (
        <div style={styles.shell}>
            {/* Mobile Header Toggle */}
            {isMobile && (
                <div style={styles.mobileHeader}>
                    <button onClick={toggleMobileMenu} style={styles.iconBtn}>
                        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <span style={styles.storeName}>Admin Workspace</span>
                    <div style={{ width: 32 }} /> {/* Spacer for balance */}
                </div>
            )}

            {/* Sidebar Navigation (Desktop Persistent / Mobile Drawer) */}
            <aside
                style={{
                    ...styles.sidebar,
                    transform: isMobile
                        ? (isMobileOpen ? 'translateX(0)' : 'translateX(-100%)')
                        : 'none',
                    position: isMobile ? 'absolute' : 'relative',
                    height: '100%'
                }}
                className="admin-sidebar"
            >
                {!isMobile && (
                    <div style={styles.sidebarHeader}>
                        <div style={styles.logoBadge}>A</div>
                        <span style={styles.storeName}>Admin Workspace</span>
                    </div>
                )}

                <nav style={styles.nav}>
                    <div style={styles.sectionLabel}>GENERAL</div>
                    <NavItem
                        icon={<Users size={18} />}
                        label="Registry"
                        active={activeSection === 'users'}
                        onClick={() => {
                            onNavigate('users');
                            if (isMobile) setIsMobileOpen(false);
                        }}
                    />
                    <NavItem
                        icon={<Database size={18} />}
                        label="Smart Paste"
                        active={activeSection === 'smart_paste'}
                        onClick={() => {
                            onNavigate('smart_paste');
                            if (isMobile) setIsMobileOpen(false);
                        }}
                    />
                    <NavItem
                        icon={<FileText size={18} />}
                        label="Prompts"
                        active={activeSection === 'prompts'}
                        onClick={() => {
                            onNavigate('prompts');
                            if (isMobile) setIsMobileOpen(false);
                        }}
                    />
                </nav>

                <div style={styles.sidebarFooter}>
                    <button onClick={onClose} style={styles.exitBtn}>
                        <LogOut size={16} /> Exit Admin
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay Backdrop */}
            {isMobile && isMobileOpen && (
                <div style={styles.backdrop} onClick={() => setIsMobileOpen(false)} />
            )}

            {/* Main Content Area */}
            <main style={{
                ...styles.main,
                paddingTop: isMobile ? '60px' : '0'
            }}>
                {/* Top Bar (Desktop Only) */}
                {!isMobile && (
                    <header style={styles.topBar}>
                        <div style={styles.searchWrapper}>
                            <Search size={16} style={{ opacity: 0.5 }} />
                            <input
                                type="text"
                                placeholder="Search"
                                style={styles.globalSearch}
                            />
                        </div>
                        <div style={styles.userMenu}>
                            <div style={styles.avatar}>A</div>
                        </div>
                    </header>
                )}

                {/* Page Content */}
                <div style={styles.contentFrame}>
                    {children}
                </div>
            </main>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        style={{
            ...styles.navItem,
            background: active ? '#ffffff' : 'transparent',
            color: active ? '#008060' : '#5c5f62',
            fontWeight: active ? 600 : 500,
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
        }}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const styles = {
    shell: {
        position: 'fixed',
        inset: 0,
        background: '#f6f6f7',
        zIndex: 5000,
        display: 'flex',
        fontFamily: '-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    },
    mobileHeader: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '56px',
        background: 'white',
        borderBottom: '1px solid #e1e3e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        zIndex: 20
    },
    sidebar: {
        width: '240px',
        background: '#ebebeb',
        borderRight: '1px solid #e1e3e5',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 30,
        transition: 'transform 0.3s ease-in-out',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
    },
    backdrop: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 25
    },
    sidebarHeader: {
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
    },
    logoBadge: {
        width: '32px', height: '32px',
        background: '#5c5f62', color: 'white', borderRadius: '6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
    },
    storeName: {
        fontWeight: 600, fontSize: '0.9rem', color: '#202223'
    },
    nav: {
        padding: '1rem 0.5rem',
        flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem'
    },
    sectionLabel: {
        fontSize: '0.75rem', fontWeight: 600, color: '#444',
        padding: '0.5rem 0.75rem', marginTop: '0.5rem'
    },
    navItem: {
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.5rem 0.75rem', border: 'none', borderRadius: '4px',
        cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem', marginBottom: '2px'
    },
    sidebarFooter: {
        padding: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)'
    },
    exitBtn: {
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.5rem', padding: '0.5rem', background: 'white', border: '1px solid #c9cccf',
        borderRadius: '4px', fontWeight: 500, cursor: 'pointer', color: '#202223'
    },
    main: {
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'
    },
    topBar: {
        height: '56px', background: 'white', borderBottom: '1px solid #e1e3e5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem'
    },
    searchWrapper: {
        width: '400px', height: '36px', background: '#f1f2f3', borderRadius: '4px',
        display: 'flex', alignItems: 'center', padding: '0 0.75rem', gap: '0.5rem', border: '1px solid #e1e3e5'
    },
    globalSearch: {
        border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem'
    },
    contentFrame: {
        flex: 1, overflowY: 'auto', padding: '2rem', maxWidth: '1100px', margin: '0 auto', width: '100%'
    },
    userMenu: { display: 'flex', alignItems: 'center', gap: '1rem' },
    avatar: {
        width: '32px', height: '32px', borderRadius: '50%', background: '#008060', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600
    },
    iconBtn: {
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px'
    }
};

export default AdminLayout;
