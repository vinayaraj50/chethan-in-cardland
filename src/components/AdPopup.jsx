import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdPopup = ({ isOpen, onClose, adConfig, isInitialAd, authIssue, user }) => {
    const [canClose, setCanClose] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3);
    const [aspectRatio, setAspectRatio] = useState(1);
    const mediaRef = useRef(null);

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

    const handleMediaLoad = (e) => {
        const target = e.target;
        const width = target.naturalWidth || target.videoWidth;
        const height = target.naturalHeight || target.videoHeight;
        if (width && height) {
            setAspectRatio(width / height);
        }
    };

    if (!isOpen || !adConfig) return null;

    const isVertical = aspectRatio < 0.8;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 20000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay for better contrast
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        padding: '20px'
                    }}
                    onClick={(e) => canClose && e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="neo-flat"
                        style={{
                            width: '100%',
                            maxWidth: isVertical ? '400px' : '520px',
                            maxHeight: '90vh',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)', // Sharp outer edge, no white shadow
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '24px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button / Timer Overlay - Top Right Corner */}
                        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 100 }}>
                            {!canClose ? (
                                <div
                                    className="neo-inset"
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%',
                                        background: 'var(--bg-color)',
                                    }}
                                >
                                    <svg viewBox="0 0 36 36" style={{ width: '32px', height: '32px', transform: 'rotate(-90deg)' }}>
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="var(--shadow-dark)"
                                            strokeWidth="4"
                                        />
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="var(--accent-color)"
                                            strokeWidth="4"
                                            strokeDasharray={`${(100 * (3 - timeLeft)) / 3}, 100`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span style={{ position: 'absolute', fontSize: '13px', fontWeight: '800', color: 'var(--text-color)' }}>
                                        {timeLeft}
                                    </span>
                                </div>
                            ) : (
                                <button
                                    onClick={onClose}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        background: '#333', // High contrast background
                                        color: '#fff',      // White icon for visibility
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <X size={20} strokeWidth={3} />
                                </button>
                            )}
                        </div>

                        {/* Status/Header Banner */}
                        {isInitialAd && (
                            <div
                                className="neo-inset"
                                style={{
                                    padding: '0.8rem 1rem',
                                    textAlign: 'center',
                                    fontWeight: '700',
                                    fontSize: '1rem',
                                    color: 'var(--accent-color)',
                                    borderRadius: '16px',
                                    marginTop: '8px' // Space for close button if needed
                                }}
                            >
                                {user ? `Welcome back, ${user.name?.split(' ')[0] || 'Student'}!` : "Welcome to Cardland!"}
                            </div>
                        )}

                        {/* Media Content */}
                        <div
                            className="neo-inset"
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                minHeight: '320px',
                                background: 'var(--bg-color)',
                                padding: '12px',
                                borderRadius: '20px'
                            }}
                        >
                            {adConfig.mediaType === 'video' ? (
                                <video
                                    ref={mediaRef}
                                    src={adConfig.mediaData}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    onLoadedMetadata={handleMediaLoad}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        borderRadius: '12px'
                                    }}
                                />
                            ) : (
                                <img
                                    ref={mediaRef}
                                    src={adConfig.mediaData}
                                    alt="Promotional Content"
                                    onLoad={handleMediaLoad}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        borderRadius: '12px',
                                        display: 'block'
                                    }}
                                />
                            )}
                        </div>

                        {/* Authentication/Storage Warnings */}
                        <AnimatePresence>
                            {authIssue && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                >
                                    <div
                                        className="neo-inset"
                                        style={{
                                            padding: '1rem',
                                            background: authIssue.type === 'permission' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                                            color: authIssue.type === 'permission' ? 'var(--error-color)' : '#d97706',
                                            fontSize: '0.9rem',
                                            borderRadius: '16px',
                                            display: 'flex',
                                            gap: '1rem',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                                            {authIssue.type === 'permission' ? '⚠️' : '💾'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '800', marginBottom: '2px' }}>
                                                {authIssue.type === 'permission' ? 'Permission Required' : 'Storage Warning'}
                                            </div>
                                            <div style={{ lineHeight: '1.4', opacity: 0.9 }}>
                                                {authIssue.message}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer Action */}
                        {adConfig.whatsappNumber && (
                            <a
                                href={`https://wa.me/${adConfig.whatsappNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="neo-button"
                                style={{
                                    gap: '1rem',
                                    background: 'var(--bg-color)',
                                    color: '#25D366',
                                    border: '1px solid rgba(37, 211, 102, 0.2)',
                                    width: '100%',
                                    justifyContent: 'center',
                                    padding: '18px',
                                    fontSize: '1.1rem',
                                    borderRadius: '18px',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                                }}
                            >
                                <MessageCircle size={26} fill="currentColor" stroke="none" />
                                <span style={{ fontWeight: '800' }}>Contact on WhatsApp</span>
                            </a>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AdPopup;
