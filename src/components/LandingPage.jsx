import React, { useState } from 'react';
import { Play } from 'lucide-react';
import logo from '../assets/logo.png';
import DemoReviewModal from './DemoReviewModal';

const LandingPage = ({ onLogin }) => {
    const [showDemo, setShowDemo] = useState(false);

    return (
        <div className="landing-page" style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--bg-color)',
            color: 'var(--text-color)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <header style={{
                width: '100%',
                padding: '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                maxWidth: '1200px'
            }}>
                <img src={logo} alt="Chethan in Cardland" style={{ height: '50px', objectFit: 'contain' }} />
                <button
                    className="neo-button"
                    onClick={onLogin}
                    style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                >
                    Sign in with Google
                </button>
            </header>

            {/* Hero Section */}

            <main className="landing-hero">
                <h1 className="landing-title">
                    Study smarter. Remember longer.
                </h1>

                <p className="landing-subtitle">
                    Flashcards train your brain to recall—so exams feel easier.
                </p>

                <div className="landing-features">
                    <div className="landing-feature-line">
                        <span className="landing-feature-item">Make your own flashcards.</span>
                    </div>
                    <div className="landing-feature-line">
                        <span className="landing-feature-item">Review in minutes.</span>
                    </div>
                    <div className="landing-feature-line">
                        <span className="landing-feature-item">Save hours of revision.</span>
                    </div>
                </div>

                <div className="landing-cta-container">
                    <p className="landing-cta-text">
                        Free flashcard maker. Begin studying.
                    </p>

                    <button
                        className="landing-demo-btn neo-glow-blue"
                        onClick={() => setShowDemo(true)}
                    >
                        <Play size={24} fill="white" />
                        Try a sample flashcard
                    </button>
                </div>
            </main>

            {/* Footer decoration */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '150px',
                background: 'linear-gradient(to top, var(--accent-soft) 0%, transparent 100%)',
                opacity: 0.2,
                pointerEvents: 'none',
                zIndex: 0
            }} />

            {showDemo && (
                <DemoReviewModal
                    onClose={() => setShowDemo(false)}
                    onLogin={onLogin}
                />
            )}
        </div>
    );
};

export default LandingPage;
