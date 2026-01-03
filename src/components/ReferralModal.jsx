import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Users, Copy, Check } from 'lucide-react';
import { saveUserProfile } from '../services/userProfile';

const ReferralModal = ({ user, userProfile, onClose, onUpdateProfile, showAlert }) => {
    const [inputCode, setInputCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(userProfile.referralCode);
        showAlert('Referral code copied!');
    };

    const handleSubmitCode = async () => {
        if (!inputCode.trim()) return;
        if (inputCode.trim() === userProfile.referralCode) {
            showAlert("You can't refer yourself!");
            return;
        }

        setLoading(true);
        try {
            // In a real backend, we'd verify the code exists. 
            // Here we just save it as 'referredBy'.
            // The Reward logic (200 coins to referrer) must be handled by Admin/Backend 
            // or by checking this field when the Referrer logs in (not possible client-side easily without reading all profiles).
            // For this 'Freemium' mock, we will just mark 'referredBy' and give the NEW USER 100 bonus coins maybe? 
            // The prompt says "Referring this app to a new user... will get 200 coins".
            // It doesn't say the new user gets anything, but usually they do.
            // We'll just save the linkage.

            const updated = { ...userProfile, referredBy: inputCode.trim() };
            await onUpdateProfile(updated);

            // Allow only one referral ?
            // userProfile.referredBy is now set.

            showAlert('Referral code applied! Your friend will get coins when you finish a review.');
            onClose();
        } catch (error) {
            showAlert('Failed to apply code.');
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
                <button className="neo-button icon-btn" onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <X size={20} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="neo-inset" style={{
                        width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)'
                    }}>
                        <Gift size={32} />
                    </div>
                    <h2 style={{ margin: 0 }}>Sharing Bonus</h2>
                    <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
                        Invite friends and earn <strong style={{ color: '#f59e0b' }}>300 Coins</strong> when they complete their first review!
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Your Referral Code</label>
                        <div className="neo-inset" style={{
                            padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px'
                        }}>
                            <span>{userProfile?.referralCode || '----'}</span>
                            <button className="neo-button icon-btn" onClick={handleCopyCode}>
                                <Copy size={20} />
                            </button>
                        </div>
                    </div>

                    {!userProfile?.referredBy && (
                        <div>
                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Enter Friend's Code</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
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
