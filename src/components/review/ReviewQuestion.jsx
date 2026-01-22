import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, BookOpen, FileText, ArrowRight } from 'lucide-react';
import AudioPlayer from '../common/AudioPlayer';

// Helper to render section note with basic markdown support
const renderNoteContent = (text) => {
    if (!text) return null;
    // Split by newlines and process each line
    return text.split('\n').map((line, i) => {
        // Handle bold text with **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const processedParts = parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
        return (
            <span key={i}>
                {processedParts}
                {i < text.split('\n').length - 1 && <br />}
            </span>
        );
    });
};

// Standalone Section Note Card - Flashcard Styling
const SectionNoteCard = ({ noteText, onStart }) => {
    if (!noteText) return null;

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }} data-testid="section-note-card">
            <div className="neo-flat" style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                padding: '1.5rem', position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '0.25rem' }} className="custom-scrollbar">
                    <div style={{ padding: '0.5rem 0.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{
                            fontSize: '1.2rem',
                            lineHeight: '1.6',
                            color: 'var(--text-color)',
                            textAlign: 'center',
                        }}>
                            {renderNoteContent(noteText)}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div style={{ width: '100%', marginTop: 'auto', display: 'flex', justifyContent: 'center', paddingTop: '1rem' }}>
                    <button
                        className="neo-button neo-glow-blue"
                        onClick={onStart}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            background: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '1rem'
                        }}
                    >
                        <span>Start Questions</span>
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReviewQuestion = ({
    currentQuestion,
    isFlipped,
    setIsFlipped,
    setViewingImage,
    onRateMCQ,
    feedback,
    showSectionNotes = false // Default to false per 2026 requirements
}) => {
    const [sectionNoteAcknowledged, setSectionNoteAcknowledged] = useState(false);

    useEffect(() => {
        if (currentQuestion && currentQuestion.isFirstInSection) {
            setSectionNoteAcknowledged(false);
        }
    }, [currentQuestion?.id, currentQuestion?.isFirstInSection]);

    if (!currentQuestion) return null;

    // Only show section note if:
    // 1. showSectionNotes setting is enabled
    // 2. This is the first question in a section
    // 3. The section has a note segment
    // 4. User hasn't acknowledged it yet
    const shouldShowSectionNote = showSectionNotes &&
        currentQuestion.isFirstInSection &&
        currentQuestion.sectionNoteSegment &&
        !sectionNoteAcknowledged;

    if (shouldShowSectionNote) {
        return <SectionNoteCard
            noteText={currentQuestion.sectionNoteSegment}
            onStart={() => setSectionNoteAcknowledged(true)}
        />;
    }

    if (currentQuestion.type === 'mcq') {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }} data-testid="question-card-mcq">
                <div className="neo-flat" style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    padding: '1.5rem', position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '0.25rem' }} className="custom-scrollbar">
                        <div style={{ padding: '0.5rem 0.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            {currentQuestion.question.image && (
                                <img
                                    src={currentQuestion.question.image}
                                    style={{ maxWidth: '100%', maxHeight: '12rem', objectFit: 'contain', borderRadius: '0.75rem', marginBottom: '1.5rem', cursor: 'pointer' }}
                                    alt="Q"
                                    onClick={() => setViewingImage(currentQuestion.question.image)}
                                />
                            )}
                            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, textAlign: 'center', lineHeight: '1.4' }}>
                                {currentQuestion.question.text}
                            </h2>
                            {currentQuestion.question.audio && <div style={{ marginTop: '1rem' }}><AudioPlayer audioData={currentQuestion.question.audio} /></div>}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', width: '100%', marginTop: 'auto', paddingTop: '1rem' }}>
                        {currentQuestion.options?.map((opt, i) => {
                            const showCorrect = feedback && opt.isCorrect;

                            return (
                                <button
                                    key={opt.id || i}
                                    disabled={!!feedback}
                                    className="neo-button"
                                    onClick={() => onRateMCQ(opt)}
                                    style={{
                                        padding: '1rem', justifyContent: 'flex-start', textAlign: 'left', minHeight: '3.5rem',
                                        background: 'var(--bg-color)',
                                        borderColor: showCorrect ? '#22c55e' : 'var(--border-color)',
                                        boxShadow: showCorrect ? '0 0 15px rgba(34, 197, 94, 0.4)' : undefined,
                                        color: showCorrect ? '#16a34a' : undefined,
                                        opacity: feedback && !showCorrect ? 0.5 : 1,
                                        fontSize: '0.95rem',
                                        lineHeight: '1.3',
                                        fontWeight: showCorrect ? 'bold' : '500'
                                    }}
                                >
                                    {opt.text}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }} data-testid="question-card-flashcard">
            <div
                style={{ perspective: '62.5rem', flex: 1, minHeight: 0, cursor: 'pointer' }}
                onClick={() => {
                    if (isFlipped) {
                        setIsFlipped(false);
                    }
                }}
            >
                <motion.div
                    style={{
                        width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d',
                    }}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                    {/* Front (Question) */}
                    <div className="neo-flat" style={{
                        position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                        display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden'
                    }}>
                        <div style={{ flex: 1, width: '100%', overflowY: 'auto', paddingRight: '0.25rem', display: 'flex', flexDirection: 'column' }} className="custom-scrollbar">
                            <div style={{ padding: '0.5rem 0.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                {currentQuestion && currentQuestion.question.image && (
                                    <img
                                        src={currentQuestion.question.image}
                                        style={{ maxWidth: '100%', maxHeight: '14rem', objectFit: 'contain', borderRadius: '0.75rem', marginBottom: '1.5rem', cursor: 'pointer' }}
                                        alt="Q"
                                        onClick={(e) => { e.stopPropagation(); setViewingImage(currentQuestion.question.image); }}
                                    />
                                )}
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', textAlign: 'center', lineHeight: '1.4' }}>
                                    {currentQuestion ? currentQuestion.question.text : 'No more questions'}
                                </h2>
                                {currentQuestion && currentQuestion.question.audio && (
                                    <div style={{ marginTop: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
                                        <AudioPlayer audioData={currentQuestion.question.audio} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', opacity: 0.3, fontSize: '0.75rem', marginTop: '1rem', fontWeight: 'bold' }}>
                            TAP "SHOW ANSWER" AT THE BOTTOM
                        </div>
                    </div>

                    {/* Back (Answer) */}
                    <div className="neo-flat" style={{
                        position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                        display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden'
                    }}>
                        <div style={{ flex: 1, width: '100%', overflowY: 'auto', paddingRight: '0.25rem', display: 'flex', flexDirection: 'column' }} className="custom-scrollbar">
                            <div style={{ padding: '0.5rem 0.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                {currentQuestion && currentQuestion.answer.image && (
                                    <img
                                        src={currentQuestion.answer.image}
                                        style={{ maxWidth: '100%', maxHeight: '14rem', objectFit: 'contain', borderRadius: '0.75rem', marginBottom: '1.5rem', cursor: 'pointer' }}
                                        alt="A"
                                        onClick={(e) => { e.stopPropagation(); setViewingImage(currentQuestion.answer.image); }}
                                    />
                                )}
                                <h2 style={{ fontSize: '1.6rem', color: 'var(--accent-color)', fontWeight: '800', textAlign: 'center', lineHeight: '1.4' }}>
                                    {currentQuestion ? currentQuestion.answer.text : ''}
                                </h2>
                                {currentQuestion && currentQuestion.answer.audio && (
                                    <div style={{ marginTop: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
                                        <AudioPlayer audioData={currentQuestion.answer.audio} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', opacity: 0.3, fontSize: '0.75rem', marginTop: '1rem', fontWeight: 'bold' }}>
                            RATE YOURSELF AT THE BOTTOM
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ReviewQuestion;
