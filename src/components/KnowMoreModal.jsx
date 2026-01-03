import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Zap, Mic, Camera, BookOpen, TrendingUp, Sparkles, LogIn } from 'lucide-react';

const KnowMoreModal = ({ isOpen, onClose, onLogin }) => {
    const sections = [
        {
            icon: <Brain size={28} />,
            text: "This is a science-based learning app designed around how the brain learns and stays motivated."
        },
        {
            icon: <TrendingUp size={28} />,
            text: "Instead of passive reading, the app adapts to your memory strength by tracking how well you answer and guiding you to focus more on what you find difficult. This helps you improve faster and retain information longer."
        },
        {
            icon: <Sparkles size={28} />,
            content: (
                <div>
                    <p style={{ margin: '0 0 1rem 0' }}>You can quickly create your own flashcards using your own questions and answers by:</p>
                    <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '1rem', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div className="neo-inset" style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent-color)'
                            }}>
                                <Zap size={22} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '500', opacity: 0.8 }}>Typing</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div className="neo-inset" style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent-color)'
                            }}>
                                <Mic size={22} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '500', opacity: 0.8 }}>Voice</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div className="neo-inset" style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent-color)'
                            }}>
                                <Camera size={22} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '500', opacity: 0.8 }}>Photo</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            icon: <Zap size={28} />,
            text: "The app then leads you through an optimal learning flow, helping you spend less time revising while getting better results."
        },
        {
            icon: <BookOpen size={28} />,
            text: "Prefer expert-prepared material? Explore the Ready-made section to study flashcard stacks built from real previous question papers and common exam patterns, curated by subject experts."
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    background: 'rgba(255,255,255,0.01)', zIndex: 4000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="neo-flat"
                        style={{
                            width: '95vw', maxWidth: '600px', maxHeight: '90vh',
                            display: 'flex', flexDirection: 'column', position: 'relative',
                            padding: 0, overflow: 'hidden', borderRadius: '32px'
                        }}
                    >
                        <div style={{
                            padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-color)' }}>How it Works</h2>
                            <button className="neo-button icon-btn neo-glow-red" onClick={onClose} style={{ color: 'var(--error-color)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{
                            padding: '2rem 1.5rem', overflowY: 'auto', flex: 1,
                            display: 'flex', flexDirection: 'column', gap: '2rem'
                        }}>
                            {sections.map((section, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                    <div className="neo-flat" style={{
                                        padding: '0.8rem',
                                        borderRadius: '16px',
                                        color: 'var(--accent-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {section.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        {section.text && <p style={{ margin: 0, lineHeight: '1.6', fontSize: '1rem', fontWeight: '500', opacity: 0.9 }}>
                                            {section.text}
                                        </p>}
                                        {section.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '1.5rem', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                            <button
                                className="neo-button neo-glow-blue"
                                onClick={onLogin}
                                style={{ width: '100%', justifyContent: 'center', padding: '1rem', gap: '12px', background: 'var(--accent-color)', color: 'white' }}
                            >
                                <LogIn size={20} />
                                <span style={{ fontWeight: '600' }}>Get Started with Google</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default KnowMoreModal;

