import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles, X } from 'lucide-react';
import { playCoinSound, playCelebrationSound } from '../utils/soundUtils';

const CoinRewardAnimation = ({ amount, onClose, type = 'Daily Login' }) => {
    useEffect(() => {
        // Play sound on mount
        playCelebrationSound();

        // Play a coin sound slightly after for effect
        const timer = setTimeout(() => {
            playCoinSound();
        }, 300);

        return () => clearTimeout(timer);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.5, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.5, y: 50, opacity: 0 }}
                transition={{ type: "spring", damping: 15 }}
                className="relative bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background Glow Effect */}
                <div className="absolute inset-0 bg-yellow-500/5 blur-3xl pointer-events-none" />

                {/* Floating Particles (Decorational) */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute text-yellow-400/40 pointer-events-none"
                        initial={{
                            x: Math.random() * 200 - 100,
                            y: Math.random() * 200 - 100,
                            opacity: 0,
                            scale: 0
                        }}
                        animate={{
                            y: [0, -100],
                            opacity: [0, 1, 0],
                            rotate: Math.random() * 360
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeOut"
                        }}
                    >
                        <Sparkles size={16 + Math.random() * 10} />
                    </motion.div>
                ))}

                <motion.div
                    animate={{
                        rotateY: [0, 360],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="mb-6 inline-flex justify-center items-center bg-yellow-500/20 p-6 rounded-full ring-4 ring-yellow-500/20 shadow-lg shadow-yellow-500/20"
                >
                    <Coins size={64} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-bold bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2"
                >
                    +{amount} Coins!
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-yellow-200/80 mb-8 font-medium"
                >
                    {type} Bonus
                </motion.p>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-3 px-6 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all border border-yellow-400/50"
                    onClick={onClose}
                >
                    Awesome!
                </motion.button>

                {/* Close "X" at top right */}
                <button
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                    onClick={onClose}
                >
                    <X size={20} />
                </button>

            </motion.div>
        </motion.div>
    );
};

export default CoinRewardAnimation;
