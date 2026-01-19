import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, SkipForward, Layers, AlertCircle, Brain, BookOpen, Sparkles, Play, RotateCcw, Eye, EyeOff } from 'lucide-react';
import avatar from '../assets/avatar_guide_new.png';

import CloseButton from './common/CloseButton';
import ImageViewer from './ImageViewer';
import congratulationsImg from '../assets/congratulations.png';
import ReviewHeader from './review/ReviewHeader';
import ReviewQuestion from './review/ReviewQuestion';
import ReviewControls from './review/ReviewControls';
import { useReviewSession } from '../hooks/useReviewSession';

const ReviewModal = ({ lesson, user, onClose, onEdit, onUpdate, showAlert, userCoins, onDeductCoins, onReviewStart, displayName }) => {

    const {
        showStartScreen,
        showModeSelection,
        currentIndex,
        currentQuestion,
        isFlipped,
        rating,
        sessionResult,
        viewingImage,
        feedback,
        masteredCount,
        totalOriginalQuestions,
        studyQuestions,
        difficultQuestionsCount,
        handleStartReview,
        handleNextSession,
        restartSession,
        handleRating,
        setIsFlipped,
        setViewingImage,
        isRecording,
        recordedAudio,
        isPlayingRecorded,
        startRecording,
        stopRecording,
        deleteRecording,
        toggleRecordedPlayback,
        handleCloseWithSave,
        showSectionNotes,
        setShowSectionNotes,
        hasInterruptedSession,
        lessonTitle,
        lastSessionIndex
    } = useReviewSession({
        lesson, user, onUpdate, onClose, showAlert, onReviewStart
    });

    const totalQuestions = (lesson.questions || lesson.cards || []).length;

    // New Start Screen - Always shown first
    if (showStartScreen) {
        return (
            <div className="modal-overlay" style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.01)', zIndex: 2000,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 'max(1rem, 2vh)'
            }}>
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                        className="neo-flat"
                        style={{
                            width: '100%', maxWidth: '420px',
                            padding: '2rem', position: 'relative'
                        }}
                    >
                        <CloseButton onClose={handleCloseWithSave} theme="light" />

                        {/* Lesson Title Section */}
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{
                                width: '5rem', height: '5rem', background: 'linear-gradient(135deg, var(--accent-color), var(--primary-color))',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.25rem', color: 'white',
                                boxShadow: '0 8px 20px rgba(var(--accent-rgb), 0.3)'
                            }}>
                                <BookOpen size={36} />
                            </div>
                            <h2 style={{
                                fontSize: '1.6rem',
                                fontWeight: 'bold',
                                marginBottom: '0.5rem',
                                background: 'linear-gradient(135deg, var(--text-color), var(--accent-color))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                                {lessonTitle}
                            </h2>
                            <p style={{ opacity: 0.6, fontSize: '0.95rem' }}>{totalQuestions} questions</p>
                        </div>

                        {/* Review Options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                            {/* Resume Option - Only shown if there's an interrupted session */}
                            {hasInterruptedSession && lastSessionIndex > 0 && (
                                <button
                                    className="neo-button neo-glow-blue"
                                    onClick={() => handleStartReview('resume', { resumeFromIndex: lastSessionIndex })}
                                    style={{
                                        padding: '1.1rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                        justifyContent: 'flex-start', background: 'var(--accent-color)', color: 'white',
                                        border: 'none'
                                    }}
                                >
                                    <div style={{
                                        padding: '0.6rem', background: 'rgba(255,255,255,0.2)',
                                        borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Play size={22} fill="white" />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>Continue Where You Left</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Resume from question {lastSessionIndex + 1}</div>
                                    </div>
                                </button>
                            )}

                            {/* Start Fresh Option */}
                            <button
                                className="neo-button"
                                onClick={() => handleStartReview('all')}
                                style={{
                                    padding: '1.1rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                    border: '2px solid var(--border-color)', justifyContent: 'flex-start'
                                }}
                            >
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden',
                                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--accent-soft)'
                                }}>
                                    <RotateCcw size={22} color="var(--accent-color)" />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                                        {hasInterruptedSession ? 'Start From Beginning' : 'Start Review'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Go through all {totalQuestions} questions</div>
                                </div>
                            </button>

                            {/* Tough Cards Only Option */}
                            <button
                                className="neo-button"
                                disabled={difficultQuestionsCount === 0}
                                onClick={() => handleStartReview('difficult')}
                                style={{
                                    padding: '1.1rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                    border: '2px solid var(--border-color)', justifyContent: 'flex-start',
                                    opacity: difficultQuestionsCount === 0 ? 0.5 : 1
                                }}
                            >
                                <div style={{ padding: '0.6rem', background: '#fee2e2', borderRadius: '12px', color: '#dc2626' }}>
                                    <AlertCircle size={22} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>Tough Cards Only</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                        {difficultQuestionsCount > 0
                                            ? `Focus on ${difficultQuestionsCount} challenging question${difficultQuestionsCount > 1 ? 's' : ''}`
                                            : 'No tough cards yet'}
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Section Notes Toggle */}
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'var(--bg-color)',
                            borderRadius: '1rem',
                            boxShadow: 'inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {showSectionNotes ? <Eye size={20} color="var(--accent-color)" /> : <EyeOff size={20} style={{ opacity: 0.5 }} />}
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>Show Important Notes</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Display section notes before questions</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSectionNotes(!showSectionNotes)}
                                    style={{
                                        width: '52px',
                                        height: '28px',
                                        borderRadius: '14px',
                                        border: 'none',
                                        background: showSectionNotes ? 'var(--accent-color)' : 'var(--shadow-dark)',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'background 0.3s ease',
                                        boxShadow: showSectionNotes
                                            ? '0 0 12px rgba(var(--accent-rgb), 0.5)'
                                            : 'inset 2px 2px 4px var(--shadow-dark)'
                                    }}
                                >
                                    <motion.div
                                        animate={{ x: showSectionNotes ? 24 : 2 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        style={{
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '50%',
                                            background: 'white',
                                            position: 'absolute',
                                            top: '3px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }}
                                    />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        );
    }


    if ((!studyQuestions || studyQuestions.length === 0) && !sessionResult) {
        return (
            <div className="modal-overlay" style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.01)', zIndex: 2000,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 'max(1rem, 2vh)'
            }}>
                <motion.div
                    key="empty-lesson"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="neo-flat"
                    style={{
                        width: '100%', maxWidth: '400px', padding: '2.5rem',
                        display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center'
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                        <div className="neo-inset" style={{ padding: '20px', borderRadius: '50%', color: '#94a3b8' }}>
                            <Layers size={48} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem' }}>No Questions Found</h2>
                        <p style={{ opacity: 0.6 }}>This lesson appears to be empty. Would you like to add some questions?</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button className="neo-button neo-glow-blue" style={{ justifyContent: 'center', padding: '1rem' }} onClick={onEdit}>
                            <Edit2 size={18} style={{ marginRight: '8px' }} /> Add Questions Now
                        </button>
                        <button className="neo-button" style={{ justifyContent: 'center', opacity: 0.6 }} onClick={onClose}>
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (sessionResult) {
        return (
            <div className="modal-overlay" style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.01)', zIndex: 2000,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 'max(1rem, 2vh)'
            }}>
                <motion.div
                    key="session-result"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="neo-flat"
                    style={{
                        width: '100%',
                        maxWidth: '420px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '2rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem'
                    }}
                >
                    <h2 style={{ fontSize: '1.8rem' }}>Study Summary</h2>

                    <div className="neo-flat" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                        <div style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: '0.5rem', fontWeight: 'bold' }}>SESSION MARKS</div>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            {sessionResult.totalMarks} <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>/ {sessionResult.maxPossibleMarks}</span>
                        </div>
                    </div>

                    {sessionResult.fullMarks ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
                            <div style={{ position: 'relative' }}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.2, 1], rotate: [0, -10, 10, 0] }}
                                    transition={{ duration: 0.8, ease: "backOut" }}
                                >
                                    <BookOpen size={64} color="var(--accent-color)" />
                                </motion.div>
                                {[...Array(8)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                                        animate={{
                                            opacity: [0, 1, 0],
                                            x: (Math.random() - 0.5) * 100,
                                            y: (Math.random() - 0.5) * 100 - 50,
                                            scale: [0, 1, 0]
                                        }}
                                        transition={{
                                            duration: 1.5,
                                            delay: 0.5 + Math.random() * 0.5,
                                            repeat: Infinity,
                                            repeatDelay: 1
                                        }}
                                        style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 0, pointerEvents: 'none' }}
                                    >
                                        <Sparkles size={20} color={['#FFD700', '#FF4500', '#00FF7F'][Math.floor(Math.random() * 3)]} />
                                    </motion.div>
                                ))}
                            </div>
                            <motion.img
                                src={congratulationsImg}
                                alt="Congratulations"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', damping: 12, delay: 0.3 }}
                                style={{ maxWidth: '80%', height: 'auto', borderRadius: '12px' }}
                            />
                            <div className="neo-inset" style={{ padding: '1.5rem', color: 'var(--accent-color)', borderRadius: '16px', width: '100%', textAlign: 'center' }}>
                                <p style={{ fontWeight: 'bold', fontSize: '1.2rem', lineHeight: '1.6' }}>
                                    Congratulations. <br />
                                    By royal decree, I name you Master of <br />
                                    <span style={{ color: 'var(--accent-color)', fontSize: '1.4rem' }}>{lesson.title}</span>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', border: '1px solid #3b82f6' }}>
                            <p style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Don't give up!</p>
                            <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>Mastery takes patience. <br />Why not try the tough questions again right now?</p>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                        {!sessionResult.fullMarks && (
                            <button className="neo-button"
                                style={{ justifyContent: 'center', background: 'var(--accent-color)', color: 'white', border: 'none', padding: '1rem' }}
                                onClick={() => restartSession(sessionResult.lowRatedQuestions)}>
                                Focus on Weak Questions ({sessionResult.lowRatedQuestions.length})
                            </button>
                        )}

                        <button className="neo-button"
                            style={{ justifyContent: 'center', padding: '1rem', background: sessionResult.fullMarks ? 'var(--accent-color)' : 'transparent', color: sessionResult.fullMarks ? 'white' : 'inherit', border: sessionResult.fullMarks ? 'none' : '1px solid var(--border-color)' }}
                            onClick={() => restartSession(lesson.questions || lesson.cards || [])}>
                            Try All Questions Again
                        </button>

                        <button className="neo-button" style={{ justifyContent: 'center', padding: '1rem', opacity: 0.7 }} onClick={onClose}>
                            Done for now
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(1.2rem)', WebkitBackdropFilter: 'blur(1.2rem)', background: 'rgba(255,255,255,0.01)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, // No padding on overlay for full screen feel on mobile
            height: '100vh',
            overflow: 'hidden'
        }}>
            <AnimatePresence mode="wait">
                <div className="review-container" style={{
                    width: '100%', maxWidth: '35rem',
                    height: '100%',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                    padding: '10px 1rem',
                    background: 'var(--bg-color)'
                }}>

                    <ReviewHeader
                        currentIndex={currentIndex}
                        totalQuestions={studyQuestions.length}
                        masteredCount={masteredCount}
                        totalOriginalQuestions={totalOriginalQuestions}
                        rating={rating}
                        onClose={handleCloseWithSave}
                        user={user}
                        lesson={lesson}
                    />

                    {/* Fixed Size Question Area */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '10px 0',
                        position: 'relative',
                        minHeight: 0 // Crucial for flex child with overflow
                    }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentQuestion ? (currentQuestion.id || currentQuestion.question?.text) : 'end'}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
                            >
                                <ReviewQuestion
                                    currentQuestion={currentQuestion}
                                    isFlipped={isFlipped}
                                    setIsFlipped={setIsFlipped}
                                    setViewingImage={setViewingImage}
                                    showSectionNotes={showSectionNotes}
                                    onRateMCQ={(opt) => {
                                        if (opt?.isCorrect) {
                                            handleRating(2);
                                        } else {
                                            const rightAnswer = currentQuestion.options.find(o => o.isCorrect)?.text || 'Unknown';
                                            handleRating(0, `Incorrect. The right answer is "${rightAnswer}". I shall ask this again.`);
                                        }
                                    }}
                                    feedback={feedback}
                                />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Fixed Navigation Area at Bottom */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        width: '100%',
                        paddingBottom: '0'
                    }}>
                        <AnimatePresence mode="wait">
                            {feedback ? (
                                <motion.div
                                    key="feedback-actions"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="neo-flat"
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        borderRadius: '1.5rem',
                                        background: 'var(--bg-color)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        border: '1px solid var(--border-color)',
                                        boxShadow: 'var(--neo-box-shadow)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                                        <img src={avatar} alt="Guide" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0, border: '1.5px solid var(--accent-color)' }} />
                                        <h3 style={{ fontSize: '0.9rem', color: feedback.type === 'success' ? '#16a34a' : '#dc2626', margin: 0, flex: 1, fontWeight: '800' }}>
                                            {feedback.message}
                                        </h3>
                                    </div>
                                    <button
                                        className="neo-button neo-glow-blue"
                                        onClick={handleNextSession}
                                        style={{
                                            width: '100%',
                                            justifyContent: 'center',
                                            padding: '1rem',
                                            fontSize: '1.1rem',
                                            background: feedback.type === 'success' ? '#16a34a' : 'var(--accent-color)',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            borderRadius: '1rem',
                                            minHeight: '3.5rem'
                                        }}
                                    >
                                        Next Question
                                    </button>
                                </motion.div>
                            ) : (
                                <ReviewControls
                                    isFlipped={isFlipped}
                                    currentQuestion={currentQuestion}
                                    isRecording={isRecording}
                                    recordedAudio={recordedAudio}
                                    isPlayingRecorded={isPlayingRecorded}
                                    startRecording={startRecording}
                                    stopRecording={stopRecording}
                                    deleteRecording={deleteRecording}
                                    toggleRecordedPlayback={toggleRecordedPlayback}
                                    setIsFlipped={setIsFlipped}
                                    handleRating={(rating, msg) => handleRating(rating, msg)}
                                    feedback={feedback}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </AnimatePresence>

            <AnimatePresence>
                {viewingImage && (
                    <ImageViewer
                        imageUrl={viewingImage}
                        onClose={() => setViewingImage(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReviewModal;
