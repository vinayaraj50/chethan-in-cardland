import React, { useState } from 'react';
import CloseButton from './common/CloseButton';
import { X, LogOut, Trash2, Sun, Moon, Volume2, VolumeX, MessageCircle, Settings, User, ChevronDown, MessageSquare, ExternalLink, Users, Sparkles } from 'lucide-react';
import { ADMIN_EMAIL } from '../constants/config';

const HamburgerMenu = ({ user, theme, onToggleTheme, soundsEnabled, onToggleSounds, onShowFeedback, onClose, onLogout, onLogin,
    onDeleteData,
    onShowAdminPanel,
    onShowReferral,
    onShowTour,
    appVersion
}) => {

    const handleCheckUpdate = () => {
        if (window.confirm("Check for updates? This will refresh the page.")) {
            window.location.reload(true);
        }
    };

    return (
        <div className="fixed inset-0" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 5000, pointerEvents: 'none', display: 'flex', justifyContent: 'flex-end' }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', pointerEvents: 'auto' }}
                onClick={onClose}
            />

            {/* Menu Panel */}
            <div
                className="relative w-80 h-full bg-white dark:bg-gray-800 shadow-2xl p-6 flex flex-col gap-6 overflow-y-auto"
                style={{
                    position: 'relative',
                    width: '320px',
                    height: '100%',
                    background: 'var(--bg-color)',
                    boxShadow: '-5px 0 25px rgba(0,0,0,0.1)',
                    padding: '2rem',
                    paddingBottom: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    pointerEvents: 'auto',
                    borderLeft: '1px solid var(--border-color)',
                    animation: 'slideIn 0.3s ease-out',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                    touchAction: 'pan-y'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Menu</h2>
                    <CloseButton onClick={onClose} />
                </div>

                {user ? (
                    <div className="neo-card flex items-center gap-3 p-3" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                            {user.picture ? (
                                <img
                                    src={user.picture}
                                    alt={user.name}
                                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                background: 'var(--accent-soft)',
                                display: user.picture ? 'none' : 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent-color)'
                            }}>
                                <User size={24} />
                            </div>
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-color)', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                        </div>
                    </div>
                ) : (
                    <button
                        className="neo-button"
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            textAlign: 'left'
                        }}
                        onClick={() => { onClose(); onLogin(); }}
                    >
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'var(--bg-secondary)'
                        }}>
                            <User size={20} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '600', fontSize: '1rem' }}>Guest User</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Sign in to save progress</span>
                        </div>
                    </button>
                )}


                {/* Sponsor Button */}


                {/* Theme Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                    <button className="neo-button icon-btn neo-glow-blue" onClick={onToggleTheme}>
                        {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                {/* Sound Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{soundsEnabled ? 'Sounds On' : 'Sounds Off'}</span>
                    <button className={`neo-button icon-btn ${soundsEnabled ? 'neo-glow-blue' : ''}`} onClick={onToggleSounds}>
                        {soundsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                </div>

                <div style={{ flex: 1 }}></div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {user?.email === ADMIN_EMAIL && (
                        <button className="neo-button neo-glow-blue" style={{ width: '100%', color: 'var(--accent-color)', fontWeight: 'bold' }} onClick={onShowAdminPanel}>
                            <Settings size={18} /> Admin Panel
                        </button>
                    )}
                    <button className="neo-button" style={{ width: '100%', color: 'var(--accent-color)' }} onClick={onShowFeedback}>
                        <MessageSquare size={18} /> Help/Feedback
                    </button>
                    {user && (
                        <button className="neo-button" style={{ width: '100%', color: '#f59e0b' }} onClick={onShowReferral}>
                            <Users size={18} /> Refer a Friend
                        </button>
                    )}
                    {user ? (
                        <>
                            <button className="neo-button" style={{ width: '100%', color: '#8b5cf6' }} onClick={onShowTour}>
                                <Sparkles size={18} /> Beginner's Guide
                            </button>
                            <button className="neo-button" style={{ width: '100%' }} onClick={onLogout}>
                                <LogOut size={18} /> Logout
                            </button>
                            <button className="neo-button neo-glow-red" style={{ width: '100%', color: 'var(--error-color)' }} onClick={onDeleteData}>
                                <Trash2 size={18} /> Delete Data
                            </button>
                        </>
                    ) : (
                        <button className="neo-button neo-glow-blue" style={{ width: '100%', backgroundColor: 'var(--accent-color)', color: 'white' }} onClick={() => { onClose(); onLogin(); }}>
                            <User size={18} /> Sign in with Google
                        </button>
                    )}
                </div>

                {/* Version Info */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '0.5rem',
                    opacity: 0.5
                }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '500' }}>v{appVersion}</span>
                    <button
                        onClick={handleCheckUpdate}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-color)',
                            fontSize: '0.65rem',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        Check for updates
                    </button>
                </div>
            </div>
            <style>{`
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
            `}</style>
        </div>
    );
};

export default HamburgerMenu;
