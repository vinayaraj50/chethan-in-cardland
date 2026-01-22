import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

const GrantCoinsModal = ({ user, isOpen, onClose, onGrant }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('Manual Grant');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !user) return null;

    const quickOptions = [50, 200, 500];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || amount <= 0) return;

        setSubmitting(true);
        try {
            await onGrant(user, parseInt(amount));
            onClose();
        } catch (error) {
            console.error('Grant failed:', error);
            // Error handling usually in parent via toast
        } finally {
            setSubmitting(false);
            setAmount('');
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.header}>
                    <h3 style={styles.title}>Grant Coins</h3>
                    <button onClick={onClose} style={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div style={styles.body}>
                    <p style={styles.userText}>
                        To: <strong>{user.email}</strong>
                    </p>

                    {/* Quick Options */}
                    <div style={styles.quickGrid}>
                        {quickOptions.map(opt => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => setAmount(opt)}
                                style={{
                                    ...styles.optionBtn,
                                    background: amount === opt ? '#e3f1df' : 'white',
                                    borderColor: amount === opt ? '#008060' : '#e1e3e5',
                                    color: amount === opt ? '#008060' : '#202223'
                                }}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <label style={styles.label}>
                            Custom Amount
                            <input
                                type="number"
                                min="1"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                style={styles.input}
                                placeholder="Enter coin amount..."
                            />
                        </label>

                        <div style={styles.actions}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={styles.cancelBtn}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!amount || submitting}
                                style={{
                                    ...styles.submitBtn,
                                    opacity: (!amount || submitting) ? 0.5 : 1,
                                    cursor: (!amount || submitting) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {submitting ? 'Granting...' : `Grant ${amount || '...'} Coins`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem'
    },
    modal: {
        background: 'white',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    header: {
        padding: '1rem',
        borderBottom: '1px solid #e1e3e5',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    title: { margin: 0, fontSize: '1rem', fontWeight: 600 },
    closeBtn: {
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
        color: '#5c5f62', display: 'flex'
    },
    body: { padding: '1.5rem' },
    userText: { marginTop: 0, marginBottom: '1.5rem', color: '#5c5f62' },
    quickGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem'
    },
    optionBtn: {
        padding: '0.75rem',
        border: '1px solid #e1e3e5',
        borderRadius: '4px',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'all 0.2s'
    },
    form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    label: { display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 },
    input: {
        padding: '0.75rem',
        border: '1px solid #e1e3e5',
        borderRadius: '4px',
        fontSize: '1rem'
    },
    actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
    cancelBtn: {
        padding: '0.75rem 1rem',
        background: 'white',
        border: '1px solid #e1e3e5',
        borderRadius: '4px',
        fontWeight: 600,
        cursor: 'pointer'
    },
    submitBtn: {
        padding: '0.75rem 1rem',
        background: '#008060', // Shopify Green
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontWeight: 600,
        boxShadow: '0 1px 0 rgba(0,0,0,0.05)'
    }
};

export default GrantCoinsModal;
