import React, { useState } from 'react';
import CloseButton from '../common/CloseButton';
import { Coins, CheckCircle, AlertTriangle } from 'lucide-react';

const GrantCoinsModal = ({ user, isOpen, onClose, onGrant }) => {
    const [amount, setAmount] = useState('50');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const coins = parseInt(amount, 10);

        if (isNaN(coins) || coins <= 0) {
            setError("Please enter a valid positive number.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await onGrant(user, coins);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setAmount('50');
            }, 1500);
        } catch (err) {
            setError(err.message || "Failed to grant coins.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div className="neo-flat" style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '400px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Grant Coins</h2>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                            to <span style={{ fontWeight: '600', color: '#0f172a' }}>{user.displayName || user.email}</span>
                        </p>
                    </div>
                    {!loading && <CloseButton onClick={onClose} />}
                </div>

                {success ? (
                    <div style={{
                        padding: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        color: '#008060',
                        gap: '1rem'
                    }}>
                        <CheckCircle size={48} />
                        <div>
                            <h3 style={{ margin: 0 }}>Success!</h3>
                            <p style={{ margin: 0, opacity: 0.8 }}>Granted {amount} coins.</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Coin Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Amount</label>
                            <div style={{ position: 'relative' }}>
                                <Coins size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b' }} />
                                <input
                                    type="number"
                                    className="neo-input"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        fontSize: '1.1rem',
                                        fontWeight: '600',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        outline: 'none'
                                    }}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                padding: '0.75rem',
                                background: '#fef2f2',
                                color: '#ef4444',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <AlertTriangle size={16} />
                                {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#64748b',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !amount}
                                className="primary-btn"
                                style={{
                                    padding: '0.75rem 2rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#008060',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: loading ? 'wait' : 'pointer',
                                    opacity: loading ? 0.7 : 1,
                                    boxShadow: '0 4px 6px -1px rgba(0, 128, 96, 0.4)'
                                }}
                            >
                                {loading ? 'Granting...' : 'Grant Coins'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default GrantCoinsModal;
