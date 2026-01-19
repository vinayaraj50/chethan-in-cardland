import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';

const Toast = ({ message, type = 'info', onUndo, onClose, duration = 5000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
            className="neo-flat toast-container"
            style={{
                position: 'fixed',
                bottom: '1.5rem',
                left: '0.5rem',
                right: '0.5rem',
                margin: '0 auto',
                width: 'fit-content',
                maxWidth: 'calc(100% - 2rem)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '0.6rem 1rem',
                borderRadius: '50px', // More pill-like
                background: 'var(--bg-color)',
                color: 'var(--text-color)',
                boxShadow: '8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)',
                border: '1px solid var(--shadow-light)',
            }}
        >
            <span style={{
                flex: 1,
                fontSize: '0.85rem',
                fontWeight: '600',
                paddingLeft: '0.5rem',
                wordBreak: 'break-word',
                lineHeight: '1.2',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
            }}>
                {message}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {type === 'undo' && onUndo && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUndo();
                            onClose();
                        }}
                        className="neo-button"
                        style={{
                            padding: '0.3rem 0.7rem',
                            fontSize: '0.7rem',
                            background: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
                            cursor: 'pointer',
                            fontWeight: '700'
                        }}
                    >
                        <RotateCcw size={12} />
                        Undo
                    </button>
                )}

                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-color)',
                        opacity: 0.3,
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%'
                    }}
                >
                    <X size={16} />
                </button>
            </div>
        </motion.div>
    );
};

export default Toast;
