import React from 'react';
import { Layers, Calendar, Star, Download } from 'lucide-react';
import { sanitizeStackTitle, validateDataURI } from '../utils/securityUtils';

const StackCard = ({ stack, onReview, onEdit, onImport }) => {
    // SECURITY FIX (VULN-005): Sanitize stack title before using in URL
    // SECURITY FIX (VULN-004): Validate titleImage and card images before using
    const safeTitleForUrl = sanitizeStackTitle(stack.title);

    // Validate titleImage if it exists
    let titleImage = null;
    if (stack.titleImage && validateDataURI(stack.titleImage, ['image/'])) {
        titleImage = stack.titleImage;
    } else if (stack.cards?.[0]?.question?.image && validateDataURI(stack.cards[0].question.image, ['image/'])) {
        titleImage = stack.cards[0].question.image;
    } else {
        // Use external avatar service as fallback with sanitized title
        titleImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(safeTitleForUrl)}&background=random&color=fff&size=128`;
    }

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
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '1rem' }}>
                {!stack.isPublic && (
                    <div className="neo-flat" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', color: 'var(--accent-color)', padding: '6px 12px', borderRadius: '20px' }}>
                        <Star size={16} fill="var(--star-color)" color="var(--star-color)" />
                        <span style={{ fontWeight: '600' }}>{stack.avgRating || '—'}</span>
                    </div>
                )}

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
