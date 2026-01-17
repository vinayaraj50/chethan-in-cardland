import React from 'react';
import { motion } from 'framer-motion';
import { Brain, BookOpen } from 'lucide-react';
import AudioPlayer from '../common/AudioPlayer';

const ReviewCard = ({
    currentCard,
    isFlipped,
    setIsFlipped,
    setViewingImage,
    onRateMCQ,
    feedback
}) => {
    if (!currentCard) return null;

    if (currentCard.type === 'mcq') {
        return (
            <div className="neo-flat" style={{
                width: '100%', height: 'calc(100% - 2rem)', minHeight: '18rem', maxHeight: '24rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '1.25rem', textAlign: 'center', position: 'relative'
            }}>
                {/* Question Section - Centered */}
                <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', marginBottom: '1rem' }} className="custom-scrollbar">
                    {currentCard.question.image && (
                        <img
                            src={currentCard.question.image}
                            style={{ maxWidth: '100%', maxHeight: '10rem', objectFit: 'contain', borderRadius: '0.75rem', marginBottom: '1rem', cursor: 'pointer' }}
                            alt="Q"
                            onClick={() => setViewingImage(currentCard.question.image)}
                        />
                    )}
                    <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>{currentCard.question.text}</h2>
                    {currentCard.question.audio && <AudioPlayer audioData={currentCard.question.audio} />}
                </div>

                {/* Options Section - Fixed at bottom */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%', marginTop: 'auto' }}>
                    {currentCard.options?.map((opt, i) => {
                        const showCorrect = feedback && opt.isCorrect;

                        return (
                            <button
                                key={opt.id || i}
                                disabled={!!feedback}
                                className="neo-button"
                                onClick={() => onRateMCQ(opt)}
                                style={{
                                    padding: '0.6rem', justifyContent: 'center', textAlign: 'center', minHeight: '3.5rem',
                                    background: showCorrect ? '#dcfce7' : 'var(--bg-color)',
                                    borderColor: showCorrect ? '#22c55e' : 'var(--border-color)',
                                    opacity: feedback && !showCorrect ? 0.5 : 1,
                                    fontSize: '0.9rem',
                                    lineHeight: '1.2'
                                }}
                            >
                                {opt.text}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div
            style={{ perspective: '62.5rem', height: '100%', minHeight: '18rem', maxHeight: '24rem', cursor: 'pointer' }}
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
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                    padding: '1.5rem', textAlign: 'center'
                }}>
                    <div style={{ flex: 1, width: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="custom-scrollbar">
                        <div style={{ margin: 'auto 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.4, marginBottom: '1rem', display: 'block' }}>QUESTION</span>
                            {currentCard && currentCard.question.image && (
                                <img
                                    src={currentCard.question.image}
                                    style={{ maxWidth: '100%', maxHeight: '10rem', objectFit: 'contain', borderRadius: '0.75rem', marginBottom: '1rem', cursor: 'pointer' }}
                                    alt="Q"
                                    onClick={(e) => { e.stopPropagation(); setViewingImage(currentCard.question.image); }}
                                />
                            )}
                            <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>{currentCard ? currentCard.question.text : 'No more cards'}</h2>
                            {currentCard && currentCard.question.audio && (
                                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                    <AudioPlayer audioData={currentCard.question.audio} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Back (Answer) */}
                <div className="neo-flat" style={{
                    position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                    padding: '1.5rem', textAlign: 'center'
                }}>
                    <div style={{ flex: 1, width: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="custom-scrollbar">
                        <div style={{ margin: 'auto 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.4, marginBottom: '1rem', display: 'block' }}>ANSWER</span>
                            {currentCard && currentCard.answer.image && (
                                <img
                                    src={currentCard.answer.image}
                                    style={{ maxWidth: '100%', maxHeight: '10rem', objectFit: 'contain', borderRadius: '0.75rem', marginBottom: '1rem', cursor: 'pointer' }}
                                    alt="A"
                                    onClick={(e) => { e.stopPropagation(); setViewingImage(currentCard.answer.image); }}
                                />
                            )}
                            <h2 style={{ fontSize: '1.6rem', color: 'var(--accent-color)', fontWeight: '800' }}>{currentCard ? currentCard.answer.text : ''}</h2>
                            {currentCard && currentCard.answer.audio && (
                                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                    <AudioPlayer audioData={currentCard.answer.audio} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ReviewCard;
