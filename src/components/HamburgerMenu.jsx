import React, { useState } from 'react';
import { X, LogOut, Trash2, Sun, Moon, Volume2, VolumeX, MessageCircle, Settings, User, ChevronDown, MessageSquare, ExternalLink } from 'lucide-react';

const HamburgerMenu = ({ user, theme, onToggleTheme, soundsEnabled, onToggleSounds, onShowFeedback, onClose, onLogout, onLogin,
    onDeleteData,
    onDeleteAndLogout,
    onShowAd,
    onShowAdminPanel
}) => {

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
                    paddingBottom: '4rem', // Extra padding for scroll
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
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
                    <button className="neo-button icon-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* User Info */}
                <div className="neo-card flex items-center gap-3 p-3" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {user?.picture ? (
                        <img src={user.picture} alt={user.name} style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                    ) : (
                        <div className="neo-button icon-btn" style={{ borderRadius: '50%' }}><User size={24} /></div>
                    )}
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: '600', truncate: true }}>{user?.name || 'Guest User'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'Not signed in'}</div>
                    </div>
                </div>


                {/* Sponsor Button */}
                <button
                    className="neo-button w-full justify-start gap-3"
                    onClick={() => { onClose(); onShowAd(); }}
                    style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', gap: '0.75rem', padding: '12px' }}
                >
                    <ExternalLink size={20} /> View Sponsor
                </button>

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
                    {user?.email === 'chethanincardland@gmail.com' && (
                        <button className="neo-button neo-glow-blue" style={{ width: '100%', color: 'var(--accent-color)', fontWeight: 'bold' }} onClick={() => { onClose(); onShowAdminPanel(); }}>
                            <Settings size={18} /> Admin Panel
                        </button>
                    )}
                    <button className="neo-button" style={{ width: '100%', color: 'var(--accent-color)' }} onClick={onShowFeedback}>
                        <MessageSquare size={18} /> Feedback
                    </button>
                    {user ? (
                        <>
                            <button className="neo-button" style={{ width: '100%' }} onClick={onLogout}>
                                <LogOut size={18} /> Logout
                            </button>
                            <button className="neo-button neo-glow-red" style={{ width: '100%', color: 'var(--error-color)' }} onClick={onDeleteData}>
                                <Trash2 size={18} /> Delete Data
                            </button>
                            <button className="neo-button neo-glow-red" style={{ width: '100%', color: 'var(--error-color)', fontWeight: 'bold' }} onClick={onDeleteAndLogout}>
                                <Trash2 size={18} /> Wipe & Logout
                            </button>
                        </>
                    ) : (
                        <button className="neo-button neo-glow-blue" style={{ width: '100%' }} onClick={() => { onClose(); onLogin(); }}>
                            <User size={18} /> Sign in
                        </button>
                    )}
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
