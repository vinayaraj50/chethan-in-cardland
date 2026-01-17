import React from 'react';
import { Plus, Menu, Zap, RefreshCw } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import logo from '../../assets/logo.png';
import CoinsDisplay from '../CoinsDisplay';

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
    showAdminQuickTools,
    onToggleAdminQuickTools,
    onShowCoinModal,
    onShowMenu,
    onAddStack,
    onLogin,
    isProfileLoading,
    children
}) => {
    return (
        <div className="app-layout">
            <header className="main-header">
                <img src={logo} alt="Chethan" className="app-logo" />
                <div className="header-actions">
                    {isAdmin && (
                        <button
                            className={`neo-button icon-btn ${showAdminQuickTools ? 'active' : ''}`}
                            onClick={onToggleAdminQuickTools}
                            title="Admin Quick Tools"
                            style={{ background: showAdminQuickTools ? 'var(--accent-soft)' : '' }}
                        >
                            <Zap size={20} color={showAdminQuickTools ? 'var(--accent-color)' : 'currentColor'} />
                        </button>
                    )}
                    {user && (
                        <div onClick={onShowCoinModal} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CoinsDisplay coins={userProfile?.coins || 0} isUnlimited={isUnlimited} />
                            {isProfileLoading && (
                                <RefreshCw
                                    size={14}
                                    className="spin"
                                    style={{ color: 'var(--accent-color)', opacity: 0.7 }}
                                />
                            )}
                        </div>
                    )}
                    <button className="neo-button icon-btn" onClick={onShowMenu}>
                        <Menu size={24} />
                    </button>
                </div>
            </header>

            <div className="app-container">
                <main className="main-content">
                    {children}
                </main>

                {(user || isTourActive) && (
                    <button
                        id="fab-add-stack"
                        className="neo-button neo-glow-blue fab-add-button"
                        onClick={onAddStack}
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
