import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { sanitizeFeedbackText, isValidEmail } from '../utils/securityUtils';

const FeedbackModal = ({ user, onClose, showAlert }) => {
    const [text, setText] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim()) {
            return showAlert('Please provide some feedback text.');
        }

        setIsSending(true);
        try {
            // SECURITY FIX (VULN-009): Sanitize feedback text to prevent markdown injection
            const sanitizedText = sanitizeFeedbackText(text);

            // SECURITY FIX (VULN-009): Validate email before including in message
            const userEmail = isValidEmail(user.email) ? user.email : 'Unknown';
            const userName = user.name || 'Anonymous';

            let waText = `*New Feedback for Chethan in Cardland*\n\n*From:* ${userName} (${userEmail})\n\n*Feedback:* ${sanitizedText}`;

            const waUrl = `https://wa.me/919497449115?text=${encodeURIComponent(waText)}`;
            window.open(waUrl, '_blank');

            showAlert('Thank you! Redirecting to WhatsApp to send your feedback.');
            onClose();
        } catch (error) {
            // SECURITY FIX (VULN-006): Don't log error details
            showAlert('Failed to open WhatsApp. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.01)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div className="modal-content neo-flat" style={{
                width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem',
                display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative'
            }}>
                <button className="neo-button icon-btn" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }} onClick={onClose}><X size={18} /></button>

                <h2 style={{ fontSize: '1.5rem' }}>Send Feedback</h2>
                <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Help us improve Chethan in Cardland! Your feedback will be sent via WhatsApp.</p>

                <div className="neo-inset" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ fontWeight: '600', opacity: 0.7, fontSize: '0.9rem' }}>Feedback</label>
                    <div style={{ position: 'relative' }}>
                        <textarea
                            className="neo-input"
                            rows="6"
                            placeholder="What's on your mind? "
                            style={{ width: '100%', resize: 'none', paddingRight: '30px' }}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <span style={{
                            position: 'absolute',
                            right: '12px',
                            top: '12px',
                            color: 'red',
                            pointerEvents: 'none',
                            visibility: text ? 'hidden' : 'visible'
                        }}>*</span>
                    </div>
                </div>

                <button
                    className="neo-button neo-glow-blue"
                    style={{
                        justifyContent: 'center',
                        background: 'var(--accent-color)',
                        color: 'white',
                        border: 'none',
                        padding: '1rem',
                        opacity: isSending ? 0.7 : 1,
                        cursor: isSending ? 'not-allowed' : 'pointer',
                        gap: '10px'
                    }}
                    onClick={handleSubmit}
                    disabled={isSending}
                >
                    {isSending ? 'Redirecting...' : <><Send size={18} /> Send via WhatsApp</>}
                </button>
            </div>
        </div>
    );
};

export default FeedbackModal;
