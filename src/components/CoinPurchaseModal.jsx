import React from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import qrCode from '../assets/logo.png'; // Placeholder if we don't have a real QR, or handled via text instructions

const CoinPurchaseModal = ({ onClose, userCoins, onShare }) => {

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.4)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="neo-flat"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '90%', maxWidth: '400px', padding: '0',
                    borderRadius: '24px', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1.5rem', background: 'var(--accent-color)', color: 'white',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Coin Store</h2>
                        <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Balance: {userCoins} Coins</p>
                    </div>
                    <button className="neo-button icon-btn" onClick={onClose} style={{ color: 'white', background: 'rgba(255,255,255,0.2)' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Special Offer */}
                    <div className="neo-flat" style={{ padding: '1rem', borderRadius: '16px', border: '2px solid #fbbf24', background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(255,255,255,0) 100%)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ background: '#fbbf24', color: 'black', padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 'bold' }}>INTRODUCTORY OFFER</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', margin: 0, color: '#d97706' }}>3000 Coins</h3>
                                <p style={{ margin: 0, opacity: 0.6, textDecoration: 'line-through', fontSize: '0.9rem' }}>₹99</p>
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--accent-color)' }}>₹79</div>
                        </div>
                    </div>

                    {/* Regular Options - Just visual for now based on request */}

                    {/* Payment Instructions */}
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.5' }}>
                        <p style={{ margin: '0 0 10px 0' }}>To purchase, please GPay the amount to:</p>
                        <div className="neo-inset" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>9497449115</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>WhatsApp Screenshot</span>
                        </div>
                        <p style={{ marginTop: '10px', fontSize: '0.8rem' }}>Send the payment screenshot to the same number on WhatsApp to receive your coins.</p>
                    </div>

                    <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', opacity: 0.1 }}></div>

                    {/* Free Coins */}
                    <div>
                        <h4 style={{ margin: '0 0 10px 0' }}>Get Free Coins</h4>
                        <button className="neo-button" onClick={onShare} style={{ width: '100%', justifyContent: 'space-between', padding: '1rem' }}>
                            <span>Sharing Bonus</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>+300 Coins</span>
                        </button>
                        <div style={{ display: 'flex', gap: '5px', marginTop: '10px', fontSize: '0.8rem', opacity: 0.6 }}>
                            <Check size={14} /> <span>Daily Login Bonus (+20)</span>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

export default CoinPurchaseModal;
