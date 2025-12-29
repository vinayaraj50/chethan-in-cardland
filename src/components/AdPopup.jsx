import React, { useState, useEffect } from 'react';
import { X, ExternalLink, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdPopup = ({ isOpen, onClose, adConfig, isInitialAd }) => {
    const [canClose, setCanClose] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3);

    useEffect(() => {
        if (isOpen) {
            if (isInitialAd) {
                setCanClose(false);
                setTimeLeft(3);

                const timer = setInterval(() => {
                    setTimeLeft((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            setCanClose(true);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);

                return () => clearInterval(timer);
            } else {
                setCanClose(true);
            }
        }
    }, [isOpen, isInitialAd]);

    if (!isOpen || !adConfig) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl relative flex flex-col"
                        style={{
                            width: '90%',
                            maxWidth: '450px',
                            maxHeight: '85vh',
                            background: 'transparent',
                            borderRadius: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Header Banner */}
                        {isInitialAd && (
                            <div
                                style={{
                                    padding: '1rem',
                                    background: 'linear-gradient(135deg, var(--accent-color), var(--primary-color))',
                                    color: 'white',
                                    textAlign: 'center',
                                    fontWeight: '600',
                                    fontSize: '1.1rem',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                }}
                            >
                                Loading the stacks from your Google Drive
                            </div>
                        )}

                        {/* Close Button / Timer */}
                        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                            {!canClose ? (
                                <div style={{ width: '30px', height: '30px', position: 'relative' }}>
                                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="rgba(0,0,0,0.2)"
                                            strokeWidth="4"
                                        />
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="white"
                                            strokeWidth="4"
                                            strokeDasharray={`${(100 * (3 - timeLeft)) / 3}, 100`}
                                        />
                                    </svg>
                                </div>
                            ) : (
                                <button
                                    onClick={onClose}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.9)',
                                        color: '#333',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Content Area */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', overflow: 'hidden', background: '#f5f5f5' }}>
                            {adConfig.mediaType === 'video' ? (
                                <video
                                    src={adConfig.mediaData}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    style={{ width: '100%', height: 'auto', maxHeight: '60vh', objectFit: 'contain' }}
                                />
                            ) : (
                                <img
                                    src={adConfig.mediaData}
                                    alt="Promotional Content"
                                    style={{ width: '100%', height: 'auto', maxHeight: '60vh', objectFit: 'contain', display: 'block' }}
                                />
                            )}
                        </div>

                        {/* Footer Action */}
                        {/* Always show if whatsappNumber exists, even for initial ad if desired, but user kept logic !isInitialAd before. 
                        User wants "Show Your Ad Here" (which is initial default fallback) to have the button? 
                        The screenshot showed the button on the second image. 
                        Let's enable it nicely. */}
                        {adConfig.whatsappNumber && (
                            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', background: 'white' }}>
                                <a
                                    href={`https://wa.me/${adConfig.whatsappNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="neo-button"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.8rem',
                                        background: '#25D366',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 24px',
                                        borderRadius: '50px', // Pill shape
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '1rem',
                                        boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        width: '100%',
                                        justifyContent: 'center'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 211, 102, 0.6)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 211, 102, 0.4)';
                                    }}
                                >
                                    <MessageCircle size={20} fill="white" />
                                    Contact via WhatsApp
                                </a>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AdPopup;
