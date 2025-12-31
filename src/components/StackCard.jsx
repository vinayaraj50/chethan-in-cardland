import React from 'react';
import { Layers, Calendar, Star, Plus, Edit2 } from 'lucide-react';
import { sanitizeStackTitle, validateDataURI } from '../utils/securityUtils';

const StackCard = ({ stack, onReview, onEdit, onImport, user }) => {
    // SECURITY FIX (VULN-005): Sanitize stack title before using in URL
    // SECURITY FIX (VULN-004): Validate titleImage and card images before using
    const safeTitleForUrl = sanitizeStackTitle(stack.title);

    const isAdmin = user?.email === 'chethanincardland@gmail.com';

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
            {isAdmin && (
                <button
                    className="neo-button icon-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(stack);
                    }}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        zIndex: 2,
                        background: 'var(--bg-color)',
                        opacity: 0.8
                    }}
                    title="Edit Stack"
                >
                    <Edit2 size={18} color="var(--accent-color)" />
                </button>
            )}
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
                {stack.isPublic ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className="neo-button neo-glow-blue"
                            onClick={(e) => {
                                e.stopPropagation();
                                onImport(stack);
                            }}
                            title="Add to My Cards"
                            style={{
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                background: 'var(--accent-color)',
                                color: 'white',
                                borderRadius: '12px',
                                fontWeight: '600',
                                border: 'none',
                            }}
                        >
                            <Plus size={14} /> Add to My Cards
                        </button>
                    </div>
                ) : (
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
