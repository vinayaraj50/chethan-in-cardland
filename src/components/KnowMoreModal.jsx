import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Repeat, FileText, BarChart3, ShieldCheck, LogIn } from 'lucide-react';

const KnowMoreModal = ({ isOpen, onClose, onLogin }) => {
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
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="neo-flat"
                        style={{
                            width: '100vw', maxWidth: 'none', height: '100vh',
                            display: 'flex', flexDirection: 'column', position: 'relative',
                            padding: 0, overflow: 'hidden', borderRadius: 0
                        }}
                    >
                        <div style={{
                            padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Know More</h2>
                            <button className="neo-button icon-btn neo-glow-red" onClick={onClose} style={{ color: 'var(--error-color)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{
                            padding: '1.5rem', overflowY: 'auto', flex: 1,
                            display: 'flex', flexDirection: 'column', gap: '2rem'
                        }}>
                            {/* Definition */}
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <div className="neo-inset" style={{
                                    padding: '0.8rem',
                                    borderRadius: '12px',
                                    color: 'var(--accent-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '48px',
                                    height: '48px',
                                    flexShrink: 0
                                }}>
                                    <FileText size={32} />
                                </div>
                                <p style={{ margin: 0, lineHeight: '1.6', fontSize: '1.05rem' }}>
                                    A flashcard is a learning card with a question on the front and the answer on the back, ideal for quick revision.
                                </p>
                            </div>

                            {/* Methods */}
                            <div className="neo-inset" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <p style={{ margin: 0, lineHeight: '1.6' }}>
                                    This is a free flashcard web app that helps students revise faster and remember longer using proven learning methods like:
                                </p>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <Brain size={28} color="var(--accent-color)" style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: '1.05rem' }}>
                                        <strong style={{ color: 'var(--accent-color)' }}>active recall</strong> (trying to answer before seeing the solution)
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <Repeat size={28} color="var(--accent-color)" style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: '1.05rem' }}>
                                        <strong style={{ color: 'var(--accent-color)' }}>spaced repetition</strong> (reviewing at the right time)
                                    </span>
                                </div>
                            </div>

                            {/* Ready-made & Custom */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <p style={{ margin: 0, lineHeight: '1.6' }}>
                                    The Ready-made section contains free flashcards with real questions from
                                    <strong style={{ color: 'var(--accent-color)' }}> previous question papers</strong> for the same chapter.
                                </p>
                                <p style={{ margin: 0, lineHeight: '1.6' }}>
                                    Students can also create their own flashcards for topics they find difficult or often forget.
                                </p>
                            </div>



                            {/* Support & Privacy */}
                            <div className="neo-inset" style={{ padding: '1.2rem', borderRadius: '16px', fontSize: '0.9rem', opacity: 0.9 }}>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', color: 'var(--accent-color)', alignItems: 'center' }}>
                                    <ShieldCheck size={20} />
                                    <strong>Privacy First</strong>
                                </div>
                                <p style={{ margin: 0, lineHeight: '1.5' }}>
                                    This free web app is supported only by student-safe ads.
                                    <strong style={{ color: 'var(--accent-color)' }}> We don’t track</strong> users or sell personal data.
                                </p>
                            </div>
                        </div>

                        <div style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)', opacity: 0.9 }}>
                                Sign in with Google to start and track your learning progress
                            </p>
                            <button
                                className="neo-button neo-glow-blue"
                                onClick={onLogin}
                                style={{ width: '100%', maxWidth: '400px', justifyContent: 'center', padding: '1rem', gap: '12px', background: 'var(--accent-color)', color: 'white' }}
                            >
                                <LogIn size={20} />
                                <span style={{ fontWeight: '600' }}>
                                    Sign in with Google
                                </span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default KnowMoreModal;
