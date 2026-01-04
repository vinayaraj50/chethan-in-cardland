import React from 'react';
import { X } from 'lucide-react';

const CloseButton = ({ onClick, style, size = 20, className = '' }) => {
    return (
        <button
            onClick={onClick}
            className={`neo-button ${className}`}
            style={{
                width: '36px',
                height: '36px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444', // Red color explicitly or var(--error-color)
                background: 'var(--bg-color)',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light), 0 0 4px rgba(239, 68, 68, 0.2)', // Light red glow
                transition: 'all 0.2s ease',
                ...style
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light), 0 0 8px rgba(239, 68, 68, 0.4)';
                e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light), 0 0 4px rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Close"
        >
            <X size={size} />
        </button>
    );
};

export default CloseButton;
