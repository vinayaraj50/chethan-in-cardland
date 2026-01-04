import React, { useEffect, useRef } from 'react';
import CloseButton from './common/CloseButton';
import { Play, X, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ADMIN_EMAIL } from '../constants/config';

const ImportantNotePopup = ({ stack, user, onStart, onClose, onEdit, onDelete, showConfirm }) => {
    const containerRef = useRef(null);
    const canEdit = user && (stack.ownedByMe || user.email === ADMIN_EMAIL);

    if (!stack || !stack.importantNote) return null;

    useEffect(() => {
        // Reset scroll position when popup opens
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [stack]);

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
                position: 'fixed', // Changed from absolute to fixed for better mobile coverage
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'var(--bg-color)',
                zIndex: 1500,
                display: 'flex',
                flexDirection: 'column',
                padding: window.innerWidth < 768 ? '1rem' : '2rem', // Responsive padding
                overflowY: 'auto',
                overscrollBehavior: 'contain' // Prevent background scrolling
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
                <h2 style={{ fontSize: window.innerWidth < 768 ? '1.5rem' : '1.8rem', margin: 0 }}>Important Note</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {canEdit && (
                        <>
                            <button
                                className="neo-button icon-btn"
                                onClick={() => showConfirm(`Delete "${stack.title}"?`, onDelete)}
                                title="Delete Stack"
                                style={{ color: '#ef4444' }}
                            >
                                <Trash2 size={20} />
                            </button>
                            <button className="neo-button icon-btn" onClick={onEdit} title="Edit Stack">
                                <Edit2 size={20} />
                            </button>
                        </>
                    )}
                    <CloseButton onClick={onClose} size={20} />
                </div>
            </div>

            <div className="neo-inset" style={{
                flex: 1, // Takes available space but allows scrolling
                padding: window.innerWidth < 768 ? '1.25rem' : '2rem', // Responsive padding
                whiteSpace: 'pre-wrap',
                fontSize: window.innerWidth < 768 ? '1rem' : '1.1rem',
                lineHeight: '1.6',
                color: 'var(--text-color)',
                marginBottom: '8rem', // Increased margin to clear the floating button + safe area
                borderRadius: '16px'
            }}>
                {stack.importantNote}
            </div>

            <button
                className="neo-button neo-glow-blue"
                onClick={onStart}
                style={{
                    position: 'fixed',
                    bottom: '2rem', // Slightly adjusted for mobile feel
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '1rem 2.5rem',
                    fontSize: '1.2rem',
                    background: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    zIndex: 1600,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)', // Added shadow for better separation
                    width: 'max-content',
                    maxWidth: '90%'
                }}
            >
                <Play size={24} fill="currentColor" />
                Start Review
            </button>
        </motion.div>
    );
};

export default ImportantNotePopup;
