
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, X, Check } from 'lucide-react';
import { playCoinSound, playCelebrationSound } from '../utils/soundUtils';

// Simple geometric shapes for particles
const Circle = ({ color }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full fill-current" style={{ color }}>
        <circle cx="50" cy="50" r="40" />
    </svg>
);

const Triangle = ({ color }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full fill-current" style={{ color }}>
        <path d="M50 15 L90 85 L10 85 Z" />
    </svg>
);

const Cross = ({ color }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full fill-current" style={{ color }}>
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
        if (start === end) return;

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
    }, []); // Empty dependency array ensures this runs strictly ONCE

    // Particle Configuration
    const particleCount = 12;
    const colors = ['#FBBF24', '#3B82F6', '#EF4444', '#10B981']; // Yellow, Blue, Red, Green
    const particleDistance = 180;

    return (
        // "Invisible" full-screen container to capture clicks outside, but NO background color
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
            onClick={onClose}
        >
            <div className="relative" onClick={(e) => e.stopPropagation()}>

                {/* Geometric Particles Burst */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 pointer-events-none">
                    {[...Array(particleCount)].map((_, i) => {
                        const angle = (i / particleCount) * 360;
                        const Component = [Circle, Triangle, Cross][i % 3];

                        return (
                            <motion.div
                                key={i}
                                className="absolute w-8 h-8"
                                initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
                                animate={{
                                    x: Math.cos(angle * Math.PI / 180) * particleDistance,
                                    y: Math.sin(angle * Math.PI / 180) * particleDistance,
                                    scale: [0, 1.2, 0],
                                    rotate: [0, 180, 360],
                                    opacity: [1, 1, 0]
                                }}
                                transition={{
                                    duration: 1.2,
                                    ease: "easeOut",
                                    delay: 0.1
                                }}
                            >
                                <Component color={colors[i % colors.length]} />
                            </motion.div>
                        );
                    })}
                </div>

                {/* Floating Content Container */}
                <motion.div
                    initial={{ scale: 0, y: 50, rotate: -10 }}
                    animate={{ scale: 1, y: 0, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25
                    }}
                    className="flex flex-col items-center"
                >
                    {/* Floating Coin */}
                    <div className="relative mb-4">
                        <motion.div
                            animate={{
                                y: [-10, 10, -10],
                                rotateY: [0, 180, 360]
                            }}
                            transition={{
                                y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                                rotateY: { duration: 5, repeat: Infinity, ease: "linear" }
                            }}
                        >
                            {/* Glow behind coin */}
                            <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-30 rounded-full scale-125"></div>

                            {/* Coin Icon */}
                            <div className="relative bg-gradient-to-b from-yellow-300 to-yellow-600 rounded-full p-6 border-4 border-yellow-100 shadow-2xl">
                                <Coins size={80} className="text-white drop-shadow-md" />
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-5xl text-yellow-700 opacity-20">$</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Text & Count */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] tracking-wide uppercase mb-1 stroke-black">
                            {type}
                        </h2>
                        <div className="flex items-center gap-2 justify-center">
                            <span className="text-6xl font-black text-yellow-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
                                style={{ textShadow: '2px 2px 0 #b45309, -1px -1px 0 #b45309, 1px -1px 0 #b45309, -1px 1px 0 #b45309, 1px 1px 0 #b45309' }}>
                                +{count}
                            </span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-white text-yellow-600 font-extrabold text-lg py-3 px-8 rounded-full shadow-lg border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 active:shadow-none flex items-center gap-2"
                        onClick={onClose}
                    >
                        <Check size={24} strokeWidth={3} />
                        CONTINUE
                    </motion.button>
                </motion.div>

                {/* Close Button (Floating) */}
                <button
                    className="absolute -top-12 right-0 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full transition-colors"
                    onClick={onClose}
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default CoinRewardAnimation;
