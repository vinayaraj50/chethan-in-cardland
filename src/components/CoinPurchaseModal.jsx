import React, { useState } from 'react';
import CloseButton from './common/CloseButton';
import { X, Check, Share2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { UPI_ID, UPI_NAME, SUPPORT_PHONE } from '../constants/config';

const CoinPurchaseModal = ({ user, onClose, userCoins, onShare, onShowFeedback }) => {
    const [qrData, setQrData] = useState(null); // { amount, link }

    const getGPayLink = (amount) => {
        const note = user?.email || 'UserPayment';
        return `upi://pay?pa=${UPI_ID}&pn=${UPI_NAME}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    };

    const handleGPayClick = (amount) => {
        const link = getGPayLink(amount);
        // Check if device is desktop/laptop (width > 768px treated as such here)
        if (window.innerWidth > 768) {
            setQrData({ amount, link });
        } else {
            window.location.href = link;
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.4)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            {/* Main Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="neo-flat"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '90%', maxWidth: '420px', padding: '0',
                    borderRadius: '24px', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    maxHeight: '90vh', margin: '20px 0',
                    background: 'var(--bg-color)',
                    position: 'relative'
                }}
            >
                {/* QR Code Overlay */}
                <AnimatePresence>
                    {qrData && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'var(--bg-color)', zIndex: 10,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '2rem'
                            }}
                        >
                            <button
                                onClick={() => setQrData(null)}
                                className="neo-button icon-btn"
                                style={{ position: 'absolute', top: '15px', right: '15px' }}
                            >
                                <X size={24} />
                            </button>

                            <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>Scan to Pay ₹{qrData.amount}</h3>

                            <div style={{ background: 'white', padding: '16px', borderRadius: '16px' }}>
                                <QRCode value={qrData.link} size={200} />
                            </div>

                            <p style={{ marginTop: '1.5rem', textAlign: 'center', opacity: 0.7, fontSize: '0.9rem' }}>
                                Scan this QR code using GPay, PhonePe, or Paytm on your mobile.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.5rem', background: 'var(--bg-color)', // Changed to standard bg to make buttons look good
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: '700', color: 'var(--text-color)' }}>Coin Store</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Balance:</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: '800', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '8px', color: 'var(--accent-color)' }}>
                                {userCoins} 🪙
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {onShowFeedback && (
                            <button className="neo-button" onClick={onShowFeedback} style={{
                                padding: '0 16px',
                                height: '36px',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                fontSize: '0.9rem', fontWeight: '600',
                                borderRadius: '12px',
                                color: 'var(--accent-color)',
                                border: 'none',
                                cursor: 'pointer'
                            }} title="Help & Feedback">
                                <MessageSquare size={18} />
                                <span>Help</span>
                            </button>
                        )}
                        <CloseButton onClick={onClose} />
                    </div>
                </div>

                <div style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    overflowY: 'auto',
                    flex: 1
                }}>

                    {/* SECTION 1: FREE COINS (Primary Action) */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>Ways to Earn</h4>
                        </div>

                        {/* INVITE - HERO CARD */}
                        <div className="neo-flat" style={{
                            padding: '1.5rem',
                            borderRadius: '20px',
                            border: 'none',
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(255,255,255,0.05) 100%)',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 0 15px rgba(59, 130, 246, 0.5), 0 10px 25px -5px rgba(59, 130, 246, 0.15)'
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, right: 0,
                                background: '#3b82f6', color: 'white',
                                padding: '4px 12px', borderRadius: '0 0 0 16px',
                                fontWeight: '700', fontSize: '0.75rem', letterSpacing: '0.5px'
                            }}>
                                LAUNCH OFFER
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', marginTop: '0.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.4rem', margin: '0 0 4px 0', color: '#1d4ed8', fontWeight: '800' }}>Invite a Friend</h3>
                                    <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}>Grow our community</p>
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f59e0b', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>+50</div>
                            </div>

                            <button
                                className="neo-button"
                                onClick={onShare}
                                style={{
                                    width: '100%',
                                    justifyContent: 'center',
                                    padding: '1rem',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    borderRadius: '14px',
                                    gap: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)'
                                }}
                            >
                                <Share2 size={18} /> Invite Now
                            </button>
                        </div>

                        {/* DAILY LOGIN - SECONDARY */}
                        <div className="neo-flat" style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            borderRadius: '16px',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(16, 185, 129, 0.05)',
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#10b981', color: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(16, 185, 129, 0.3)' }}>
                                    <Check size={20} strokeWidth={3} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '1rem' }}>Daily Login</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Streak bonus active</div>
                                </div>
                            </div>
                            <div style={{ fontWeight: '800', color: '#10b981', fontSize: '1.2rem' }}>+5</div>
                        </div>

                        {/* FIND MISTAKES - REWARD */}
                        <div className="neo-flat" style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            borderRadius: '16px',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(236, 72, 153, 0.05)',
                            boxShadow: '0 0 10px rgba(236, 72, 153, 0.2)',
                            cursor: 'pointer'
                        }} onClick={onShowFeedback}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#ec4899', color: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(236, 72, 153, 0.3)' }}>
                                    <MessageSquare size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '1rem' }}>Find Mistakes</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Report errors to get free coins</div>
                                </div>
                            </div>
                            <div style={{ fontWeight: '800', color: '#ec4899', fontSize: '0.9rem' }}>Bonus</div>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', opacity: 0.3 }}></div>

                    {/* SECTION 2: PAID OFFERS */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>Store</h4>
                        </div>

                        {/* 50 COINS */}
                        <div className="neo-flat" style={{
                            padding: '1.2rem',
                            borderRadius: '18px',
                            border: 'none',
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(255,255,255,0) 100%)',
                            marginBottom: '1rem',
                            position: 'relative',
                            cursor: 'pointer',
                            boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)'
                        }} onClick={() => handleGPayClick(79)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', margin: '0 0 4px 0', color: '#1d4ed8', fontWeight: '700' }}>50 Coins</h3>
                                    <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem' }}>Basic Pack</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#3b82f6' }}>₹79</div>
                                </div>
                            </div>
                            <div style={{
                                marginTop: '1rem',
                                paddingTop: '0.8rem',
                                borderTop: '1px dashed rgba(59,130,246,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                color: '#1d4ed8', fontWeight: '600', fontSize: '0.9rem'
                            }}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" style={{ height: '16px' }} />
                                <span>Tap to Pay</span>
                            </div>
                        </div>

                        {/* 200 COINS */}
                        <div className="neo-flat" style={{
                            padding: '1.2rem',
                            borderRadius: '18px',
                            border: 'none',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(255,255,255,0) 100%)',
                            marginBottom: '1rem',
                            position: 'relative',
                            cursor: 'pointer',
                            boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
                        }} onClick={() => handleGPayClick(299)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', margin: '0 0 4px 0', color: '#059669', fontWeight: '700' }}>200 Coins</h3>
                                    <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem' }}>Popular Choice</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>₹299</div>
                                </div>
                            </div>
                            <div style={{
                                marginTop: '1rem',
                                paddingTop: '0.8rem',
                                borderTop: '1px dashed rgba(16, 185, 129, 0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                color: '#059669', fontWeight: '600', fontSize: '0.9rem'
                            }}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" style={{ height: '16px' }} />
                                <span>Tap to Pay</span>
                            </div>
                        </div>

                        {/* 500 COINS */}
                        <div className="neo-flat" style={{
                            padding: '1.2rem',
                            borderRadius: '18px',
                            border: 'none',
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(255,255,255,0) 100%)',
                            position: 'relative',
                            cursor: 'pointer',
                            boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)'
                        }} onClick={() => handleGPayClick(479)}>
                            <div style={{
                                position: 'absolute', top: -10, left: 20,
                                background: '#f59e0b', color: 'white',
                                padding: '4px 10px', borderRadius: '8px',
                                fontSize: '0.7rem', fontWeight: '700'
                            }}>
                                BEST VALUE
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', margin: '0 0 4px 0', color: '#b45309', fontWeight: '700' }}>500 Coins</h3>
                                    <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem' }}>Master Study Pack</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f59e0b' }}>₹479</div>
                                </div>
                            </div>
                            <div style={{
                                marginTop: '1rem',
                                paddingTop: '0.8rem',
                                borderTop: '1px dashed rgba(245,158,11,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                color: '#b45309', fontWeight: '600', fontSize: '0.9rem'
                            }}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" style={{ height: '16px' }} />
                                <span>Tap to Pay</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Instructions (Manual Fallback) */}
                    <div style={{
                        background: 'rgba(0,0,0,0.03)',
                        padding: '1rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        opacity: 0.8,
                        marginTop: '0.5rem'
                    }}>
                        <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Alternative Payment Method:</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span>GPay to:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem' }}>{SUPPORT_PHONE.replace('91', '')}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>
                            After payment, send the screenshot to the same number on WhatsApp to receive your coins.
                        </p>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

export default CoinPurchaseModal;
