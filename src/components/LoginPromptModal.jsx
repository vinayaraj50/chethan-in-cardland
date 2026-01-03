import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, X, Star, Calendar, TrendingUp } from 'lucide-react';

const LoginPromptModal = ({ onLogin, onCancel, cardsReviewed, totalCards }) => {
    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(255,255,255,0.01)', zIndex: 2001,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            overflowY: 'auto' // Allow overlay to scroll if needed on very small screens? Actually modal keeps center.
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="neo-flat"
                style={{
                    width: '100%', maxWidth: '420px', padding: '2rem',
                    display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center',
                    position: 'relative', maxHeight: '95vh', overflowY: 'auto'
                }}
            >
                <button
                    className="neo-button icon-btn"
                    onClick={onCancel}
                    style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}
                >
                    <X size={18} />
                </button>

                <div>
                    <div className="neo-inset" style={{
                        width: '60px', height: '60px', borderRadius: '50%',
                        margin: '0 auto 1rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'var(--accent-color)'
                    }}>
                        <LogIn size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>Great Progress!</h2>
                    <p style={{ opacity: 0.7, fontSize: '0.95rem' }}>
                        You've reviewed {cardsReviewed} of {totalCards} cards in preview mode.
                    </p>
                </div>

                <div className="neo-inset" style={{
                    padding: '1.2rem', borderRadius: '16px', textAlign: 'left',
                    display: 'flex', flexDirection: 'column', gap: '0.8rem'
                }}>
                    <p style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.2rem' }}>
                        Sign in to unlock:
                    </p>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                        <div className="neo-flat" style={{
                            padding: '6px', borderRadius: '8px', flexShrink: 0,
                            color: 'var(--accent-color)'
                        }}>
                            <TrendingUp size={16} />
                        </div>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Spaced Repetition</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                Remember longer with smart review scheduling
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                        <div className="neo-flat" style={{
                            padding: '6px', borderRadius: '8px', flexShrink: 0,
                            color: 'var(--accent-color)'
                        }}>
                            <Star size={16} />
                        </div>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Progress Tracking</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                Track your marks and review history
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                        <div className="neo-flat" style={{
                            padding: '6px', borderRadius: '8px', flexShrink: 0,
                            color: 'var(--accent-color)'
                        }}>
                            <Calendar size={16} />
                        </div>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Continue Reviewing</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                Complete all {totalCards} cards and save to your collection
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: 'auto' }}>
                    <button
                        className="neo-button neo-glow-blue"
                        onClick={onLogin}
                        style={{
                            width: '100%', justifyContent: 'center', padding: '1rem',
                            background: 'var(--accent-color)', color: 'white', border: 'none',
                            fontSize: '1rem', fontWeight: 'bold', gap: '0.5rem', minHeight: '50px'
                        }}
                    >
                        <LogIn size={18} />
                        Sign in with Google
                    </button>
                    <button
                        className="neo-button"
                        onClick={onCancel}
                        style={{
                            width: '100%', justifyContent: 'center', padding: '0.8rem',
                            opacity: 0.7
                        }}
                    >
                        Exit Preview
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPromptModal;
