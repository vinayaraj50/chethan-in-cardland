import React from 'react';
import { Layers, Calendar, Star, MoreVertical } from 'lucide-react';

const StackCard = ({ stack, onReview, onEdit }) => {
    // Use user-uploaded title image or first card's image or colorful placeholder
    const titleImage = stack.titleImage || stack.cards?.[0]?.question?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(stack.title)}&background=random&color=fff&size=128`;

    return (
        <div
            className="neo-flat stack-card"
            onClick={() => onReview(stack)}
            style={{
                padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer',
                transition: 'transform 0.2s ease', position: 'relative'
            }}
        >
            <img
                src={titleImage}
                alt={stack.title}
                style={{ width: '100%', height: '140px', objectFit: 'contain', borderRadius: '12px', background: 'var(--bg-color)' }}
            />

            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{stack.title}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6, fontSize: '0.85rem' }}>
                        <Layers size={14} /> {stack.cards?.length || 0} Flashcards
                    </div>
                    {!stack.ownedByMe && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 'bold', color: 'var(--accent-color)' }}>
                            Shared By: {stack.ownerName || stack.sharingUser?.displayName || 'Partner'}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div className="neo-flat neo-glow-blue" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', color: 'var(--accent-color)', padding: '6px 12px', borderRadius: '20px' }}>
                    <Star size={16} fill="var(--star-color)" color="var(--star-color)" />
                    <span style={{ fontWeight: '600' }}>{stack.avgRating || '—'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', opacity: 0.5 }}>
                    <Calendar size={14} />
                    <span>{stack.lastReviewed || 'Never'}</span>
                </div>
            </div>


            <style>{`
        .stack-card:hover { transform: translateY(-5px); }
      `}</style>
        </div>
    );
};

export default StackCard;
