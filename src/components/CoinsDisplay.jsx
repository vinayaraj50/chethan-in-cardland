import React from 'react';
import { Coins } from 'lucide-react';

const CoinsDisplay = ({ coins }) => {
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
                marginRight: '8px'
            }}
        >
            <Coins size={18} fill="currentColor" />
            <span>{coins}</span>
        </div>
    );
};

export default CoinsDisplay;
