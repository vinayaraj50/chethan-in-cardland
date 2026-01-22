import React from 'react';
import { Plus, Menu, RefreshCw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import logo from '../../assets/logo.png';
import CoinsDisplay from '../CoinsDisplay';
import { useUI } from '../../context/UIContext';

/**
 * RootLayout Component
 * The structural shell of the application. Manages high-level UI elements
 * like the Header, FAB, and global layout containers.
 */
const RootLayout = ({
    user,
    userProfile,
    isUnlimited,
    isAdmin,
    isTourActive,
    onShowCoinModal,
    onShowMenu,
    onAddLesson,
    onLogin,
    isProfileLoading,
    headerLoading,
    children
}) => {
    const { headerNotice, clearHeaderNotice, toast, hideToast, notification, clearNotification } = useUI();

    // Handle Toast Timer
    React.useEffect(() => {
        if (toast && toast.duration) {
            const timer = setTimeout(() => {
                hideToast();
            }, toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast, hideToast]);

    return (
        <div className="app-layout">
            <header className="main-header" style={{ position: 'relative' }}>
                <AnimatePresence mode="wait">
                    {headerLoading ? (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'absolute',
                                left: '1rem',
                                right: '1rem',
                                top: '0.5rem',
                                bottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--bg-color)',
                                zIndex: 10,
                                borderRadius: '16px',
                                boxShadow: '5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light)'
                            }}
                        >
                            <div className="card-loader-small">
                                <div className="card-loader-item-small"></div>
                                <div className="card-loader-item-small"></div>
                                <div className="card-loader-item-small"></div>
                            </div>
                        </motion.div>
                    ) : notification ? (
                        <motion.div
                            key="notification"
                            className={notification.type === 'confirm' ? "neo-glow-header-confirm" : "neo-glow-blue"}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'absolute',
                                left: '1rem',
                                right: '1rem',
                                top: '0.5rem',
                                bottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                zIndex: 11,
                                borderRadius: '16px',
                                padding: '0 1rem'
                            }}
                        >
                            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-color)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {notification.message}
                            </span>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                {notification.type === 'confirm' ? (
                                    <>
                                        <button
                                            className="neo-button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (notification.onConfirm) notification.onConfirm();
                                                clearNotification();
                                            }}
                                            style={{
                                                padding: '0.4rem 1.2rem',
                                                fontSize: '0.85rem',
                                                fontWeight: '800',
                                                height: 'auto',
                                                minHeight: 'unset',
                                                background: 'var(--accent-color)',
                                                color: 'white',
                                                border: 'none',
                                                boxShadow: '0 4px 12px rgba(var(--accent-rgb), 0.4)'
                                            }}
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            className="neo-button icon-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearNotification();
                                            }}
                                            style={{
                                                padding: '4px',
                                                width: '28px',
                                                height: '28px',
                                                minWidth: '28px',
                                                background: 'var(--bg-color)',
                                                border: 'none',
                                                boxShadow: '2px 2px 5px var(--shadow-dark), -2px -2px 5px var(--shadow-light)'
                                            }}
                                        >
                                            <X size={14} color="#ef4444" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="neo-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearNotification();
                                        }}
                                        style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: '700', height: 'auto', minHeight: 'unset', color: 'var(--accent-color)' }}
                                    >
                                        Got it
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ) : toast ? (
                        <motion.div
                            key="toast"
                            className="neo-glow-header"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'absolute',
                                left: '1rem',
                                right: '1rem',
                                top: '0.5rem',
                                bottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                color: 'var(--text-color)',
                                zIndex: 10,
                                borderRadius: '16px',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                padding: '0 1rem'
                            }}
                        >
                            <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {toast.message}
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {toast.onUndo && (
                                    <button
                                        className="neo-button"
                                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', height: 'auto', minHeight: 'unset' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toast.onUndo();
                                            toast.onClose ? toast.onClose() : hideToast();
                                        }}
                                    >
                                        Undo
                                    </button>
                                )}
                                <button
                                    className="neo-button icon-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        hideToast();
                                    }}
                                    style={{
                                        padding: '4px',
                                        width: '28px',
                                        height: '28px',
                                        minWidth: '28px',
                                        background: 'var(--bg-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: 'none',
                                        boxShadow: '2px 2px 5px var(--shadow-dark), -2px -2px 5px var(--shadow-light)'
                                    }}
                                >
                                    <X size={14} color="#ef4444" />
                                </button>
                            </div>
                        </motion.div>
                    ) : headerNotice ? (
                        <motion.div
                            key="notice"
                            className="neo-glow-header"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'absolute',
                                left: '1rem',
                                right: '1rem',
                                top: '0.5rem',
                                bottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent-color)',
                                zIndex: 10,
                                borderRadius: '16px',
                                fontWeight: '700',
                                fontSize: '1rem',
                                padding: '0 1.5rem',
                                textAlign: 'center'
                            }}
                        >
                            <span>{headerNotice.message}</span>
                            <button
                                className="neo-button icon-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearHeaderNotice();
                                }}
                                style={{
                                    position: 'absolute',
                                    right: '0.5rem',
                                    padding: '4px',
                                    width: '28px',
                                    height: '28px',
                                    minWidth: '28px',
                                    background: 'var(--bg-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    boxShadow: '2px 2px 5px var(--shadow-dark), -2px -2px 5px var(--shadow-light)'
                                }}
                            >
                                <X size={14} color="#ef4444" />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <img src={logo} alt="Chethan" className="app-logo" />
                            <div className="header-actions">
                                {user && (
                                    <div onClick={onShowCoinModal} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <CoinsDisplay coins={userProfile?.coins || 0} isUnlimited={isUnlimited} />
                                    </div>
                                )}
                                <button className="neo-button icon-btn" onClick={onShowMenu}>
                                    <Menu size={24} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <div className="app-container">
                <main className="main-content">
                    {children}
                </main>

                {(user || isTourActive) && (
                    <button
                        id="fab-add-lesson"
                        className="neo-button neo-glow-blue fab-add-button"
                        onClick={onAddLesson}
                    >
                        <Plus size={32} />
                    </button>
                )}
            </div>

            <style>{`
                .app-layout {
                    display: flex;
                    flex-direction: column;
                    min-height: 100dvh;
                    background: var(--bg-color);
                }
                .main-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    background: var(--bg-color);
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                    z-index: 1000;
                    position: sticky;
                    top: 0;
                }
                .header-actions {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                }
                .app-logo {
                    height: 2.5rem;
                    width: auto;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                }
                .main-content {
                    flex: 1;
                    padding-bottom: 5rem; /* Space for FAB */
                }
                
                @media (max-width: 480px) {
                    .main-header {
                        padding: 0.75rem 1rem;
                    }
                    .app-logo {
                        height: 2rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default RootLayout;
