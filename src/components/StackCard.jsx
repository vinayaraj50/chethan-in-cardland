import React from 'react';
import { Layers, Calendar, Star, Plus, Edit2, Coins } from 'lucide-react';
import { sanitizeStackTitle, validateDataURI } from '../utils/securityUtils';
import { ADMIN_EMAIL } from '../constants/config';

const StackCard = ({ stack, onReview, onEdit, onImport, user, onDelete, showConfirm }) => {
    // SECURITY FIX (VULN-005): Sanitize stack title before using in URL
    // SECURITY FIX (VULN-004): Validate titleImage and card images before using
    const safeTitleForUrl = sanitizeStackTitle(stack.title);

    const isAdmin = user?.email === ADMIN_EMAIL;

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
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}
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

            <div className="neo-flat" style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                fontWeight: '600',
                padding: '4px 8px',
                borderRadius: '12px',
                opacity: 0.9
            }}>
                <Layers size={14} />
                {stack.cardsCount !== undefined ? stack.cardsCount : (stack.cards?.length || 0)}
            </div>
            <img
                src={titleImage}
                alt={stack.title}
                style={{ width: '100%', height: '140px', objectFit: 'contain', borderRadius: '12px', background: 'var(--bg-color)' }}
            />

            <div style={{ marginTop: '0.8rem' }}>
                <h3 style={{
                    fontSize: '1.1rem',
                    marginBottom: '0.2rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.4',
                    height: '4.2em',
                    textAlign: 'center'
                }} title={stack.title}>{stack.title}</h3>
            </div>


            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '1rem', paddingTop: '1rem' }}>
                {stack.isPublic && (
                    <button
                        className="neo-button icon-btn"
                        style={{ flex: 1, padding: '0.5rem', background: stack.cost > 0 ? '#f59e0b' : 'var(--accent-color)', color: 'white', border: 'none', fontSize: '0.85rem', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (user) {
                                onImport(stack);
                            } else {
                                onReview(stack);
                            }
                        }}
                    >
                        {stack.cost > 0 ? <Coins size={14} /> : <Plus size={14} />}
                        {user ? (stack.cost > 0 ? `Buy for ${stack.cost}` : 'Add to My Cards') : 'Preview'}
                    </button>
                )}
                {!stack.isPublic && (
                    <div className="neo-flat" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        fontSize: '0.85rem',
                        color: 'var(--accent-color)',
                        padding: '6px 8px',
                        borderRadius: '12px',
                        minWidth: '110px',
                        whiteSpace: 'nowrap'
                    }}>
                        <span style={{ fontWeight: '700' }}>Marks : {stack.lastMarks !== undefined ? stack.lastMarks : '—'}/{stack.cards ? stack.cards.length * 2 : 0}</span>
                    </div>
                )}
                {!stack.isPublic && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.1rem',
                        fontSize: '0.75rem',
                        opacity: 0.8,
                        minWidth: '100px',
                        textAlign: 'right'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.7 }}>
                            <Calendar size={12} />
                            <span>Review in</span>
                        </div>
                        <NextReviewDisplay nextReview={stack.nextReview} />
                    </div>
                )}

            </div>

            <style>{`
        .stack-card:hover { transform: translateY(-5px); }
      `}</style>
        </div >
    );
};

const NextReviewDisplay = ({ nextReview }) => {
    if (!nextReview) return <span>New</span>;

    const calculateTimeLeft = () => {
        const diff = new Date(nextReview) - new Date();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days < 0 || (days === 0 && hours < 0)) {
            const absDays = Math.abs(days);
            return { text: `Due: ${absDays} days ago`, isDue: true };
        }

        if (days === 0) return { text: `${hours} hours`, isDue: false };
        return { text: `${days} days`, isDue: false };
    };

    const { text, isDue } = calculateTimeLeft();

    return (
        <span style={{ color: isDue ? '#ef4444' : 'inherit', fontWeight: isDue ? '700' : '600', fontSize: isDue ? '0.85rem' : '0.9rem' }}>
            {text}
        </span>
    );
};

export default StackCard;
