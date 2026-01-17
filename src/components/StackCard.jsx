import React from 'react';
import { Layers, Calendar, Star, Plus, Edit2, Coins, Trash2 } from 'lucide-react';
import { sanitizeStackTitle, validateDataURI } from '../utils/securityUtils';
import { ADMIN_EMAIL } from '../constants/config';

const StackCard = ({ stack, onReview, onEdit, onImport, user, onDelete, showConfirm }) => {
    // SECURITY FIX (VULN-005): Sanitize stack title before using in URL
    // SECURITY FIX (VULN-004): Validate titleImage and card images before using
    const safeTitleForUrl = sanitizeStackTitle(stack.title);

    const isAdmin = user?.email === ADMIN_EMAIL;
    const canEdit = isAdmin || !stack.isPublic;

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

    // Loading Skeleton
    if (stack.loading) {
        return (
            <div className="neo-flat stack-card" style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                <div className="shimmer-wrapper">
                    <div className="shimmer" style={{ width: '40px', height: '20px', borderRadius: '12px', marginBottom: '1rem' }}></div>
                    <div className="shimmer" style={{ width: '100%', height: '140px', borderRadius: '12px', marginBottom: '1rem' }}></div>
                    {stack.title && stack.title !== 'Loading...' ? (
                        <div style={{
                            marginBottom: '0.5rem',
                            height: '40px', // Approximate height of 2 lines
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}>
                            {stack.title}
                        </div>
                    ) : (
                        <>
                            <div className="shimmer" style={{ width: '80%', height: '20px', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
                            <div className="shimmer" style={{ width: '60%', height: '20px', borderRadius: '4px' }}></div>
                        </>
                    )}
                </div>
                <style>{`
                    .shimmer-wrapper { padding: 0.5rem; width: 100%; height: 100%; }
                    .shimmer {
                        background: linear-gradient(90deg, var(--bg-color) 0%, var(--neo-shadow-light) 50%, var(--bg-color) 100%);
                        background-size: 200% 100%;
                        animation: shimmer 1.5s infinite;
                    }
                    @keyframes shimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div
            className="neo-flat stack-card"
            id={stack.id === 'demo-stack' ? 'stack-card-demo-stack' : undefined}
            onClick={() => onReview(stack)}
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            {canEdit && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 2, display: 'flex', gap: '8px' }}>
                    <button
                        className="neo-button icon-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(stack);
                        }}
                        style={{ background: 'var(--bg-color)', opacity: 0.8 }}
                        title="Edit Stack"
                    >
                        <Edit2 size={18} color="var(--accent-color)" />
                    </button>
                    <button
                        className="neo-button icon-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (showConfirm) {
                                showConfirm(`Delete "${stack.title}"?`, () => onDelete(stack));
                            } else {
                                if (window.confirm(`Delete "${stack.title}"?`)) onDelete(stack);
                            }
                        }}
                        style={{ background: 'var(--bg-color)', opacity: 0.8, color: '#ef4444' }}
                        title="Delete Stack"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
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
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    marginBottom: '0.2rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.35',
                    minHeight: '2.7em',
                    textAlign: 'left',
                    color: 'var(--text-color)',
                    opacity: 0.9,
                    padding: '0 2px'
                }} title={stack.title}>{stack.title}</h3>
            </div>


            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '1rem', paddingTop: '1rem' }}>
                {stack.isPublic && (
                    <button
                        className="neo-button"
                        style={{ flex: 1, padding: '0.6rem', background: stack.cost > 0 ? '#f59e0b' : 'var(--accent-color)', color: 'white', border: 'none', fontSize: '0.85rem', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}
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
                        {user ? (
                            stack.cost > 0 ? `Buy for ${stack.cost}` : 'Free - Add to My Cards'
                        ) : (
                            `Preview (${stack.cost > 0 ? `Price: ${stack.cost}` : 'Free'})`
                        )}
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
                        <div id={stack.id === 'demo-stack' ? 'next-review-indicator-demo-stack' : undefined}>
                            <NextReviewDisplay nextReview={stack.nextReview} />
                        </div>
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
