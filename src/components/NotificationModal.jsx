import React from 'react';
import CloseButton from './common/CloseButton';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, HelpCircle, X } from 'lucide-react';

const NotificationModal = ({ type = 'alert', message, onConfirm, onCancel, onClose }) => {
    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.01)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="neo-flat"
                style={{
                    width: '100%', maxWidth: '400px', padding: '2rem',
                    display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center',
                    position: 'relative'
                }}
            >
                <CloseButton
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem' }}
                    size={16}
                />

                <div className="neo-inset" style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: type === 'confirm' ? 'var(--accent-color)' : 'var(--error-color)'
                }}>
                    {type === 'confirm' ? <HelpCircle size={32} /> : <AlertCircle size={32} />}
                </div>

                <p style={{ fontSize: '1.1rem', fontWeight: '500', lineHeight: '1.5' }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                    {type === 'confirm' ? (
                        <>
                            <button
                                className="neo-button"
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={onCancel || onClose}
                            >
                                Cancel
                            </button>
                            <button
                                className="neo-button"
                                style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-color)', color: 'white', border: 'none' }}
                                onClick={() => {
                                    const cb = onConfirm;
                                    onClose();
                                    cb?.();
                                }}
                            >
                                Confirm
                            </button>
                        </>
                    ) : (
                        <button
                            className="neo-button"
                            style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-color)', color: 'white', border: 'none' }}
                            onClick={onClose}
                        >
                            Got it
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default NotificationModal;
