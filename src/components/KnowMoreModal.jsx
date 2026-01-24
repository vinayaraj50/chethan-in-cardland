import React from 'react';
import CloseButton from './common/CloseButton';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Mic, Camera, BookOpen, TrendingUp, Sparkles, LogIn, Target, PenTool, Keyboard } from 'lucide-react';
import avatar from '../assets/avatar_guide_new.png';

const KnowMoreModal = ({ isOpen, onClose, onLogin }) => {
    const sections = [
        {
            icon: <img src={avatar} alt="Chethan" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />,
            title: "Built for how you learn",
            text: "Science-based learning, designed to keep you focused and motivated."
        },
        {
            icon: <Zap size={28} />,
            title: "Learns how you remember",
            text: "A smart algorithm understands your memory, tracks progress, and adapts automatically."
        },
        {
            icon: <Target size={28} />,
            title: "Learns. Adapts. Guides.",
            text: "The app creates a personalised learning path that adapts to your memory and progress."
        },
        {
            icon: <PenTool size={28} />,
            title: "Create lessons your way",
            content: (
                <div>
                    <p style={{ margin: '0 0 1rem 0', lineHeight: '1.5', fontSize: '0.95rem', opacity: 0.8 }}>Make lessons using one or more options:</p>
                    <div style={{ display: 'flex', gap: '2.5rem', justifyContent: 'flex-start', marginBottom: '0.5rem', marginTop: '1rem' }}>
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
                                <Keyboard size={22} />
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
            icon: <BookOpen size={28} />,
            title: "Expert Lesson Content",
            text: "Study curated lessons built from real previous question papers and exam patterns."
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
                        className="neo-flat neo-popup"
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
                            <CloseButton onClick={onClose} />
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
                                        {section.title && (
                                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-color)' }}>
                                                {section.title}
                                            </h3>
                                        )}
                                        {section.text && <p style={{ margin: 0, lineHeight: '1.5', fontSize: '0.95rem', opacity: 0.8 }}>
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
