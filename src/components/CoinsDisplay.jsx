import React from 'react';
import { Coins } from 'lucide-react';

const CoinsDisplay = ({ coins, isUnlimited }) => {
    return (
        <div
            className="neo-inset"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '20px',
                color: '#FFB800',
                fontWeight: '800',
                marginRight: '8px',
                position: 'relative' // For overlay
            }}
        >
            <Coins size={18} fill="currentColor" />
            <span style={{ opacity: isUnlimited ? 0.5 : 1 }}>{coins}</span>
            {isUnlimited && (
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '10px',
                    padding: '0 4px',
                    color: '#8b5cf6', // Premium purple
                    fontSize: '1.2rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    ∞
                </div>
            )}
        </div>
    );
};

export default CoinsDisplay;
