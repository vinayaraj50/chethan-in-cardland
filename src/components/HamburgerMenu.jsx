import React, { useState } from 'react';
import { Sun, Moon, LogOut, Trash2, X, User, ChevronDown } from 'lucide-react';

const HamburgerMenu = ({ user, theme, onToggleTheme, onClose, onLogout, onDeleteData, onDeleteAndLogout, sortBy, onSortChange, filterLabel, onLabelChange, availableLabels }) => {
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isLabelOpen, setIsLabelOpen] = useState(false);

    const sortOptions = ['Creation Date', 'Number of Cards', 'Average Rating', 'Last Reviewed'];

    return (
        <div className="menu-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.01)', zIndex: 1000
        }} onClick={onClose}>
            <div
                className="menu-content neo-flat"
                style={{
                    position: 'absolute', top: 0, right: 0, width: '300px', height: '100%', padding: '2rem',
                    display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'slideIn 0.3s ease-out', overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="neo-button icon-btn" onClick={onClose}><X size={20} /></button>
                </div>

                {/* User Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '12px' }} className="neo-inset">
                    {user.picture ? (
                        <img src={user.picture} alt="profile" style={{ width: '50px', height: '50px', borderRadius: '50%' }} />
                    ) : (
                        <div className="neo-button icon-btn" style={{ borderRadius: '50%' }}><User size={24} /></div>
                    )}
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user.name}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7, textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.email}</div>
                    </div>
                </div>

                {/* Theme Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                    <button className="neo-button icon-btn neo-glow-blue" onClick={onToggleTheme}>
                        {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                {/* Custom Sort Dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                    <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>Sort by</span>
                    <button
                        className="neo-select"
                        style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onClick={() => setIsSortOpen(!isSortOpen)}
                    >
                        {sortBy}
                        <ChevronDown size={18} style={{ transform: isSortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                    </button>

                    {isSortOpen && (
                        <div className="neo-flat" style={{
                            marginTop: '10px', width: '100%',
                            padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px'
                        }}>
                            {sortOptions.map(opt => (
                                <div
                                    key={opt}
                                    className={`neo-button ${sortBy === opt ? 'neo-inset' : ''}`}
                                    style={{
                                        padding: '10px', fontSize: '0.9rem', cursor: 'pointer', boxShadow: sortBy === opt ? 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)' : 'none',
                                        background: sortBy === opt ? 'var(--accent-soft)' : 'transparent',
                                        border: 'none', borderRadius: '8px', width: '100%', textAlign: 'left'
                                    }}
                                    onClick={() => { onSortChange(opt); setIsSortOpen(false); }}
                                >
                                    {opt}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Label Filter Dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                    <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>Filter by Label</span>
                    <button
                        className="neo-select"
                        style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onClick={() => setIsLabelOpen(!isLabelOpen)}
                    >
                        {filterLabel || 'All Labels'}
                        <ChevronDown size={18} style={{ transform: isLabelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                    </button>

                    {isLabelOpen && (
                        <div className="neo-flat" style={{
                            marginTop: '10px', width: '100%',
                            padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px'
                        }}>
                            <div
                                className={`neo-button ${!filterLabel ? 'neo-inset' : ''}`}
                                style={{
                                    padding: '10px', fontSize: '0.9rem', cursor: 'pointer',
                                    boxShadow: !filterLabel ? 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)' : 'none',
                                    background: !filterLabel ? 'var(--accent-soft)' : 'transparent',
                                    border: 'none', borderRadius: '8px', width: '100%', textAlign: 'left'
                                }}
                                onClick={() => { onLabelChange(null); setIsLabelOpen(false); }}
                            >
                                All Labels
                            </div>
                            {availableLabels.map(lbl => (
                                <div
                                    key={lbl}
                                    className={`neo-button ${filterLabel === lbl ? 'neo-inset' : ''}`}
                                    style={{
                                        padding: '10px', fontSize: '0.9rem', cursor: 'pointer',
                                        boxShadow: filterLabel === lbl ? 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)' : 'none',
                                        background: filterLabel === lbl ? 'var(--accent-soft)' : 'transparent',
                                        border: 'none', borderRadius: '8px', width: '100%', textAlign: 'left'
                                    }}
                                    onClick={() => { onLabelChange(lbl); setIsLabelOpen(false); }}
                                >
                                    {lbl}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ flex: 1 }}></div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button className="neo-button" style={{ width: '100%' }} onClick={onLogout}>
                        <LogOut size={18} /> Logout
                    </button>
                    <button className="neo-button neo-glow-red" style={{ width: '100%', color: 'var(--error-color)' }} onClick={onDeleteData}>
                        <Trash2 size={18} /> Delete Data
                    </button>
                    <button className="neo-button neo-glow-red" style={{ width: '100%', color: 'var(--error-color)', fontWeight: 'bold' }} onClick={onDeleteAndLogout}>
                        <Trash2 size={18} /> Wipe & Logout
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
