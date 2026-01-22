import { X, Gift, Users, Copy, Check, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import React, { useState } from 'react';
import CloseButton from './common/CloseButton';
import { saveUserProfile } from '../services/userProfile';
import { userService } from '../services/userService';

const ReferralModal = ({ user, userProfile, onClose, onUpdateProfile, showAlert, onShowFeedback }) => {
    const [inputCode, setInputCode] = useState('');
    const [loading, setLoading] = useState(false);

    const referralLink = `${window.location.origin}/?ref=${userProfile?.referralCode || ''}`;

    // Exact requested message format
    const shareMessage = `Study smarter.
Remember longer.

${user.name} invites you to join Cardland to start easy, efficient and personalised learning journey.

${referralLink}`;

    const handleCopyCode = () => {
        navigator.clipboard.writeText(userProfile.referralCode);
        showAlert('Referral code copied!');
    };

    const handleShareWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        window.open(url, '_blank');
    };

    const handleSubmitCode = async () => {
        if (!inputCode.trim()) return;
        if (inputCode.trim() === userProfile.referralCode) {
            showAlert("You can't refer yourself!");
            return;
        }

        setLoading(true);
        try {
            const result = await userService.applyReferral(user.uid, inputCode.trim());
            showAlert(result.message || 'Referral code applied successfully!');
            onClose();
            // Refresh profile to get updated referral status
            window.location.reload();
        } catch (error) {
            const errorMsg = error.message || 'Failed to apply referral code.';
            showAlert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.5)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="neo-flat"
                style={{ padding: '2rem', maxWidth: '400px', width: '90%', position: 'relative' }}
            >
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' }}>
                    {onShowFeedback && (
                        <button className="neo-button" onClick={onShowFeedback} style={{
                            padding: '0 12px',
                            height: '36px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            fontSize: '0.85rem', fontWeight: '600',
                            borderRadius: '12px',
                            color: 'var(--accent-color)',
                            border: 'none',
                            cursor: 'pointer'
                        }} title="Help & Feedback">
                            <MessageSquare size={16} />
                            <span>Help</span>
                        </button>
                    )}
                    <CloseButton onClick={onClose} size={20} />
                </div>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="neo-inset" style={{
                        width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)'
                    }}>
                        <Gift size={32} />
                    </div>
                    <h2 style={{ margin: 0 }}>Refer a Friend</h2>
                    <p style={{ opacity: 0.7, marginTop: '0.5rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        Invite a <strong>first-time user</strong> and earn <strong style={{ color: '#f59e0b' }}>50 Coins</strong> when they complete their first lesson!
                    </p>
                    <p style={{ opacity: 0.6, marginTop: '0.75rem', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        Note: The referred user must be new to the app and complete a published lesson (demo and user-created lessons don't count).
                    </p>

                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <button
                        className="neo-button"
                        onClick={handleShareWhatsApp}
                        style={{
                            background: '#25D366', color: 'white', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            padding: '12px', fontSize: '1.1rem'
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        Share Invite via WhatsApp
                    </button>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                            <div style={{ height: '1px', flex: 1, background: 'var(--border-color)' }}></div>
                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>OR USE CODE</span>
                            <div style={{ height: '1px', flex: 1, background: 'var(--border-color)' }}></div>
                        </div>

                        <div className="neo-inset" style={{
                            marginTop: '15px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px'
                        }}>
                            <span>{userProfile?.referralCode || '----'}</span>
                            <button className="neo-button icon-btn" onClick={handleCopyCode} title="Copy Code">
                                <Copy size={20} />
                            </button>
                        </div>
                    </div>

                    {!userProfile?.referredBy && (
                        <div style={{ marginTop: '10px' }}>
                            <details>
                                <summary style={{ cursor: 'pointer', fontSize: '0.9rem', opacity: 0.7, listStyle: 'none', textAlign: 'center' }}>
                                    Have a referral code? Enter it here
                                </summary>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <input
                                        className="neo-input"
                                        style={{ flex: 1 }}
                                        placeholder="Enter code"
                                        value={inputCode}
                                        onChange={(e) => setInputCode(e.target.value)}
                                    />
                                    <button
                                        className="neo-button neo-glow-blue"
                                        onClick={handleSubmitCode}
                                        disabled={loading || !inputCode}
                                        style={{ background: 'var(--accent-color)', color: 'white' }}
                                    >
                                        {loading ? '...' : <Check size={20} />}
                                    </button>
                                </div>
                            </details>
                        </div>
                    )}

                    {userProfile?.referredBy && (
                        <div className="neo-inset" style={{ padding: '0.8rem', textAlign: 'center', fontSize: '0.9rem', color: 'green' }}>
                            Referred by: {userProfile.referredBy}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ReferralModal;


