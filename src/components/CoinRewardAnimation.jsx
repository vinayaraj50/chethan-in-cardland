
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, X, Check } from 'lucide-react';
import { playCoinSound, playCelebrationSound } from '../utils/soundUtils';

// Simple geometric shapes for particles
const Circle = ({ color }) => (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', fill: color }}>
        <circle cx="50" cy="50" r="40" />
    </svg>
);

const Triangle = ({ color }) => (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', fill: color }}>
        <path d="M50 15 L90 85 L10 85 Z" />
    </svg>
);

const Cross = ({ color }) => (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', fill: color }}>
        <rect x="35" y="10" width="30" height="80" rx="5" />
        <rect x="10" y="35" width="80" height="30" rx="5" />
    </svg>
);

const CoinRewardAnimation = ({ amount, onClose, type = 'Daily Login' }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        // Play sounds only on mount
        playCelebrationSound();
        const timer = setTimeout(() => {
            playCoinSound();
        }, 200);

        // Counter animation
        let start = 0;
        const end = parseInt(amount, 10) || 0;
        if (start === end) {
            setCount(end);
            return;
        }

        const duration = 1000;
        const startTime = performance.now();

        const animateCount = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4);

            setCount(Math.floor(start + (end - start) * ease));

            if (progress < 1) {
                requestAnimationFrame(animateCount);
            }
        };

        requestAnimationFrame(animateCount);

        return () => clearTimeout(timer);
    }, [amount]);

    // Particle Configuration
    const particleCount = 12;
    const colors = ['#FBBF24', '#3B82F6', '#EF4444', '#10B981']; // Yellow, Blue, Red, Green
    const particleDistance = 180;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto',
                backdropFilter: 'blur(4px)',
                background: 'rgba(0,0,0,0.3)'
            }}
            onClick={onClose}
        >
            <div
                style={{ position: 'relative' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Geometric Particles Burst */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 0,
                    height: 0,
                    pointerEvents: 'none'
                }}>
                    {[...Array(particleCount)].map((_, i) => {
                        const angle = (i / particleCount) * 360;
                        const Component = [Circle, Triangle, Cross][i % 3];

                        return (
                            <motion.div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: '32px',
                                    height: '32px'
                                }}
                                initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
                                animate={{
                                    x: Math.cos(angle * Math.PI / 180) * particleDistance,
                                    y: Math.sin(angle * Math.PI / 180) * particleDistance,
                                    scale: [0, 1.2, 0],
                                    rotate: [0, 180, 360],
                                    opacity: [1, 1, 0]
                                }}
                                transition={{
                                    duration: 1.5,
                                    ease: "easeOut",
                                    delay: 0.1
                                }}
                            >
                                <Component color={colors[i % colors.length]} />
                            </motion.div>
                        );
                    })}
                </div>

                {/* Main Content */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", damping: 15 }}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem',
                        textAlign: 'center'
                    }}
                >
                    {/* Coin Group */}
                    <div style={{ position: 'relative' }}>
                        <motion.div
                            animate={{
                                y: [-10, 10, -10],
                                rotateY: [0, 180, 360]
                            }}
                            transition={{
                                y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                                rotateY: { duration: 4, repeat: Infinity, ease: "linear" }
                            }}
                            style={{
                                width: '120px',
                                height: '120px',
                                background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '4px solid #fef3c7',
                                boxShadow: '0 10px 25px rgba(217, 119, 6, 0.4), inset 0 2px 5px rgba(255, 255, 255, 0.5)',
                                position: 'relative',
                                zIndex: 2
                            }}
                        >
                            <Coins size={60} color="white" />
                        </motion.div>
                        {/* Glow */}
                        <div style={{
                            position: 'absolute',
                            inset: '-20px',
                            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 70%)',
                            borderRadius: '50%',
                            zIndex: 1
                        }} />
                    </div>

                    {/* Text Container */}
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            style={{
                                color: 'white',
                                fontSize: '1.5rem',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                                marginBottom: '0.5rem'
                            }}
                        >
                            {type}
                        </motion.h2>
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, type: 'spring' }}
                            style={{
                                color: '#fbbf24',
                                fontSize: '4rem',
                                fontWeight: '900',
                                textShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            +{count}
                        </motion.div>
                    </div>

                    {/* Neumorphic Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onClose}
                        style={{
                            background: 'white',
                            border: 'none',
                            borderRadius: '50px',
                            padding: '1rem 3rem',
                            fontSize: '1.2rem',
                            fontWeight: '800',
                            color: '#d97706',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.2), 0 5px 0 #e5e7eb',
                            marginTop: '1rem'
                        }}
                    >
                        <Check size={24} strokeWidth={3} />
                        CONTINUE
                    </motion.button>
                </motion.div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '-4rem',
                        right: '0',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: 'white',
                        padding: '0.5rem',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(5px)',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                    <X size={24} />
                </button>
            </div>
        </div>
    );
};

export default CoinRewardAnimation;
