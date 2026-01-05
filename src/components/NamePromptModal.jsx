import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Check } from 'lucide-react';

const NamePromptModal = ({ onSave }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.01)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="neo-flat"
                style={{
                    width: '100%', maxWidth: '400px', padding: '2.5rem',
                    textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2rem'
                }}
            >
                <div>
                    <div className="neo-inset" style={{
                        width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 1.5rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)'
                    }}>
                        <User size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Welcome, Friend!</h2>
                    <p style={{ opacity: 0.6 }}>I want to be your well-wisher on this learning journey. What should I call you?</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="neo-inset" style={{ padding: '4px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name..."
                            style={{
                                width: '100%', padding: '12px 5px', background: 'transparent',
                                border: 'none', fontSize: '1.1rem', color: 'inherit', outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="neo-button neo-glow-blue"
                        style={{
                            padding: '1.2rem', justifyContent: 'center', gap: '0.8rem',
                            background: 'var(--accent-color)', color: 'white', opacity: name.trim() ? 1 : 0.5
                        }}
                    >
                        <Check size={20} />
                        Get Started
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default NamePromptModal;
