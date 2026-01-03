import React from 'react';
import { Play, X, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ImportantNotePopup = ({ stack, user, onStart, onClose, onEdit }) => {
    if (!stack || !stack.importantNote) return null;

    const canEdit = user && (stack.ownedByMe || user.email === 'chethanincardland@gmail.com');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'var(--bg-color)',
                zIndex: 1500,
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem',
                overflowY: 'auto'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.8rem' }}>Important Note</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {canEdit && (
                        <button className="neo-button icon-btn" onClick={onEdit} title="Edit Stack">
                            <Edit2 size={20} />
                        </button>
                    )}
                    <button className="neo-button icon-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="neo-inset" style={{
                flex: 1,
                padding: '2rem',
                whiteSpace: 'pre-wrap',
                fontSize: '1.1rem',
                lineHeight: '1.6',
                color: 'var(--text-color)',
                marginBottom: '5rem' // Space for floating button
            }}>
                {stack.importantNote}
            </div>

            <button
                className="neo-button neo-glow-blue"
                onClick={onStart}
                style={{
                    position: 'fixed',
                    bottom: '3rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '1.2rem 3rem',
                    fontSize: '1.2rem',
                    background: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 1600
                }}
            >
                <Play size={24} fill="currentColor" />
                Start Review
            </button>
        </motion.div>
    );
};

export default ImportantNotePopup;
