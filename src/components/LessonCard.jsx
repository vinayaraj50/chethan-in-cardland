import React from 'react';
import { Layers, Calendar, Star, Plus, Edit2, Coins, Trash2, Sparkles } from 'lucide-react';
import { sanitizeLessonTitle, validateDataURI } from '../utils/securityUtils';
import { ADMIN_EMAIL } from '../constants/config';
import { getRelativeTimeStatus } from '../utils/dateUtils';

const LessonCard = ({ lesson, onReview, onEdit, onImport, user, onDelete, showConfirm }) => {
    // SECURITY FIX (VULN-005): Sanitize lesson title before using in URL
    // SECURITY FIX (VULN-004): Validate titleImage and question images before using
    const safeTitleForUrl = sanitizeLessonTitle(lesson.title);

    const isAdmin = user?.email === ADMIN_EMAIL;
    const canEdit = isAdmin || !lesson.isPublic;

    // Validate titleImage if it exists
    let titleImage = null;
    if (lesson.titleImage && validateDataURI(lesson.titleImage, ['image/'])) {
        titleImage = lesson.titleImage;
    } else if (lesson.questions?.[0]?.question?.image && validateDataURI(lesson.questions[0].question.image, ['image/'])) {
        titleImage = lesson.questions[0].question.image;
    } else {
        // Use external avatar service as fallback with sanitized title
        titleImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(safeTitleForUrl)}&background=random&color=fff&size=128`;
    }

    // Loading Skeleton
    if (lesson.loading) {
        return (
            <div className="neo-flat lesson-card" style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                <div className="shimmer-wrapper">
                    <div className="shimmer" style={{ width: '40px', height: '20px', borderRadius: '12px', marginBottom: '1rem' }}></div>
                    <div className="shimmer" style={{ width: '100%', height: '140px', borderRadius: '12px', marginBottom: '1rem' }}></div>
                    {lesson.title && lesson.title !== 'Loading...' ? (
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
                            {lesson.title}
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
            className="neo-flat lesson-card"
            id={lesson.id === 'demo-lesson' ? 'lesson-card-demo-lesson' : undefined}
            onClick={() => onReview(lesson)}
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            {canEdit && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 2, display: 'flex', gap: '8px' }}>
                    <button
                        className="neo-button icon-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(lesson);
                        }}
                        style={{ background: 'var(--bg-color)', opacity: 0.8 }}
                        title="Edit Lesson"
                    >
                        <Edit2 size={18} color="var(--accent-color)" />
                    </button>
                    <button
                        className="neo-button icon-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(lesson);
                        }}
                        style={{ background: 'var(--bg-color)', opacity: 0.8, color: '#ef4444' }}
                        title="Delete Lesson"
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
                {lesson.questionCount !== undefined ? lesson.questionCount : (lesson.questions?.length || lesson.cards?.length || 0)}
            </div>
            <img
                src={titleImage}
                alt={lesson.title}
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
                }} title={lesson.title}>{lesson.title}</h3>
            </div>


            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '1rem', paddingTop: '1rem' }}>
                {lesson.isPublic && (
                    <button
                        className={`neo-button ${lesson.isOwned ? 'owned-btn' : ''}`}
                        style={{
                            flex: 1,
                            padding: '0.6rem',
                            background: lesson.isOwned ? '#16a34a' : (lesson.cost > 0 ? '#f59e0b' : 'var(--accent-color)'),
                            color: 'white',
                            border: 'none',
                            fontSize: '0.85rem',
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px',
                            cursor: lesson.isOwned ? 'default' : 'pointer',
                            opacity: lesson.isOwned ? 0.9 : 1
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (lesson.isOwned) return;
                            if (user) {
                                onImport(lesson);
                            } else {
                                onReview(lesson);
                            }
                        }}
                    >
                        {lesson.isOwned ? <Layers size={14} /> : (user ? (lesson.cost > 0 ? <Coins size={14} /> : <Plus size={14} />) : null)}
                        {lesson.isOwned ? 'Owned' : (user ? (
                            lesson.cost > 0 ? `Buy for ${lesson.cost}` : 'Free - Add to My Lessons'
                        ) : (
                            'Login with Google to Open'
                        ))}
                    </button>
                )}
                {!lesson.isPublic && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        flex: 1,
                        minWidth: 0
                    }}>
                        {lesson.lastMarks !== undefined ? (
                            <div className="neo-flat" style={{
                                padding: '6px 10px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                fontSize: '0.8rem',
                                color: 'var(--accent-color)',
                                fontWeight: '700'
                            }}>
                                Marks: {lesson.lastMarks}/{(lesson.questionCountAtLastReview || (lesson.questions?.length || lesson.cards?.length || 0)) * 2}
                            </div>
                        ) : lesson.lastSessionIndex !== undefined ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div className="neo-inset" style={{ height: '6px', width: '100%', borderRadius: '3px', overflow: 'hidden', padding: '0' }}>
                                    <div style={{ height: '100%', width: `${(lesson.lastSessionIndex / (lesson.questions?.length || lesson.cards?.length || 1)) * 100}%`, background: 'var(--accent-color)' }}></div>
                                </div>
                                <button
                                    className="neo-button"
                                    style={{
                                        width: '100%',
                                        padding: '0.4rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '800',
                                        background: 'var(--accent-color)',
                                        color: 'white',
                                        border: 'none',
                                        justifyContent: 'center'
                                    }}
                                >
                                    RESUME
                                </button>
                            </div>
                        ) : (
                            <div className="neo-flat" style={{ padding: '6px 10px', borderRadius: '12px', textAlign: 'center', fontSize: '0.8rem', opacity: 0.5, fontWeight: '700' }}>
                                New
                            </div>
                        )}
                    </div>
                )}
                {!lesson.isPublic && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        gap: '0.1rem',
                        fontSize: '0.7rem',
                        opacity: 0.8,
                        flexShrink: 0, // Don't let it shrink to nothing
                        textAlign: 'right'
                    }}>
                        {lesson.nextReview && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', opacity: 0.7 }}>
                                <Calendar size={10} />
                            </div>
                        )}
                        <div id={lesson.id === 'demo-lesson' ? 'next-review-indicator-demo-lesson' : undefined} style={{ whiteSpace: 'nowrap' }}>
                            <NextReviewDisplay nextReview={lesson.nextReview} />
                        </div>
                    </div>
                )}

            </div>

            <style>{`
        .lesson-card:hover { transform: translateY(-5px); }
      `}</style>
        </div >
    );
};

const NextReviewDisplay = ({ nextReview }) => {
    const { text, isOverdue, color } = getRelativeTimeStatus(nextReview);

    return (
        <span style={{
            color: color,
            fontWeight: isOverdue ? '700' : '600',
            fontSize: isOverdue ? '0.85rem' : '0.9rem'
        }}>
            {text}
        </span>
    );
};

export default LessonCard;
