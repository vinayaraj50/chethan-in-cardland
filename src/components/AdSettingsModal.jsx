import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Trash2 } from 'lucide-react';

const AdSettingsModal = ({ onClose, onSave, settings }) => {
    const [mediaType, setMediaType] = useState(settings?.mediaType || 'image');
    const [mediaData, setMediaData] = useState(settings?.mediaData || '');
    const [whatsappNumber, setWhatsappNumber] = useState(settings?.whatsappNumber || '');
    const [maxViews, setMaxViews] = useState(settings?.maxViews || 1);
    const [error, setError] = useState('');

    const [isDefault, setIsDefault] = useState(settings?.isDefault || false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit check
            setError('File size too large. Max 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setMediaData(reader.result);
            setMediaType(file.type.startsWith('video') ? 'video' : 'image');
            setError('');
        };
        reader.readAsDataURL(file);
    };

    const handleSave = (isGlobal = false) => {
        if (!mediaData) {
            setError('Please upload an image or video.');
            return;
        }
        onSave({
            mediaType,
            mediaData,
            whatsappNumber,
            maxViews: parseInt(maxViews),
            isDefault
        }, isGlobal);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>Ad Configuration</h2>
                    <button className="neo-button icon-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {error && <div style={{ color: 'var(--error-color)', fontSize: '0.9rem' }}>{error}</div>}

                    {/* Media Upload */}
                    <div className="neo-card" style={{ padding: '1rem', textAlign: 'center' }}>
                        {mediaData ? (
                            <div style={{ position: 'relative' }}>
                                {mediaType === 'video' ? (
                                    <video src={mediaData} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} controls />
                                ) : (
                                    <img src={mediaData} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                                )}
                                <button
                                    onClick={() => setMediaData('')}
                                    style={{
                                        position: 'absolute', top: -10, right: -10,
                                        background: 'var(--error-color)', color: 'white',
                                        border: 'none', borderRadius: '50%', width: '24px', height: '24px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <label style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                                padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: '12px',
                                cursor: 'pointer'
                            }}>
                                <Upload size={32} style={{ color: 'var(--text-secondary)' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>Click to upload Image or Video</span>
                                <input type="file" accept="image/*,video/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            </label>
                        )}
                    </div>

                    {/* WhatsApp Number */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>WhatsApp Number (Optional)</label>
                        <input
                            className="neo-input"
                            type="text"
                            placeholder="e.g. 919876543210"
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value)}
                            style={{ width: '100%' }}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Include country code without '+'</span>
                    </div>

                    {/* Frequency */}
                    <div style={{ opacity: isDefault ? 0.5 : 1, pointerEvents: isDefault ? 'none' : 'auto' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Show Frequency (Times per user)</label>
                        <input
                            className="neo-input"
                            type="number"
                            min="1"
                            value={maxViews}
                            onChange={(e) => setMaxViews(e.target.value)}
                            style={{ width: '100%' }}
                            disabled={isDefault}
                        />
                    </div>

                    {/* Default Ad Checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input
                            type="checkbox"
                            id="isDefault"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)' }}
                        />
                        <label htmlFor="isDefault" style={{ cursor: 'pointer', userSelect: 'none' }}>Set as Default Ad (Show when no other ad is pending)</label>
                    </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="neo-button" onClick={onClose} style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                    <button className="neo-button neo-glow-blue" onClick={() => handleSave(false)} style={{ color: 'var(--primary-color)' }}>
                        <Upload size={18} style={{ marginRight: '8px' }} /> Upload
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdSettingsModal;
