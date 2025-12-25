import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, Share2, Copy, Star, Play, SkipForward, Square, Pause } from 'lucide-react';
import { saveStack, shareStack } from '../services/googleDrive';
import ImageViewer from './ImageViewer';
import confetti from 'canvas-confetti';
import { playTada, playSwoosh, playTing, playCompletion } from '../utils/soundEffects';
import congratulationsImg from '../assets/congratulations.png';

const AudioPlayer = ({ audioData }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef(new Audio(audioData));
    const animationRef = useRef();
    const progressBarRef = useRef();

    useEffect(() => {
        const audio = audioRef.current;
        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
            animationRef.current = requestAnimationFrame(updateProgress);
        };

        audio.onplay = () => {
            setIsPlaying(true);
            animationRef.current = requestAnimationFrame(updateProgress);
        };

        audio.onpause = () => {
            setIsPlaying(false);
            cancelAnimationFrame(animationRef.current);
        };

        audio.onended = () => {
            setIsPlaying(false);
            setProgress(0);
            cancelAnimationFrame(animationRef.current);
        };

        return () => {
            audio.pause();
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    const togglePlay = (e) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
    };

    const stopAudio = (e) => {
        e.stopPropagation();
        const audio = audioRef.current;
        audio.pause();
        audio.currentTime = 0;
        setProgress(0);
    };

    const handleSeek = (e) => {
        e.stopPropagation();
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const audio = audioRef.current;
        if (audio.duration) {
            audio.currentTime = (percentage / 100) * audio.duration;
            setProgress(percentage);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '1.5rem', width: '100%', maxWidth: '280px' }}>
            <button
                className="neo-button icon-btn"
                onClick={togglePlay}
                style={{ width: '36px', height: '36px', background: 'var(--accent-soft)', color: 'var(--accent-color)', borderRadius: '50%', flexShrink: 0 }}
            >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
            <button
                className="neo-button icon-btn"
                onClick={stopAudio}
                style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }}
            >
                <Square size={12} fill="currentColor" />
            </button>
            <div
                ref={progressBarRef}
                className="neo-inset"
                onClick={handleSeek}
                style={{
                    flex: 1, height: '10px', borderRadius: '5px', overflow: 'hidden', position: 'relative', cursor: 'pointer',
                    boxShadow: 'inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light)' // Custom smaller shadow
                }}
            >
                <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    width: `${progress}%`, background: 'var(--accent-color)',
                    transition: 'width 0.1s linear'
                }} />
            </div>
        </div>
    );
};

const ReviewModal = ({ stack, user, onClose, onEdit, onUpdate, onDuplicate, showAlert }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [rating, setRating] = useState(0);
    const [sessionRatings, setSessionRatings] = useState([]);
    const [studyCards, setStudyCards] = useState(stack.cards);
    const [sessionResult, setSessionResult] = useState(null);

    // Share state
    const [showShare, setShowShare] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [shareRole, setShareRole] = useState('reader');
    const [viewingImage, setViewingImage] = useState(null);

    useEffect(() => {
        playTada();
    }, []);

    const currentCard = studyCards[currentIndex];

    const handleNext = async (val) => {
        const newRatings = [...sessionRatings, val];
        const isLast = currentIndex === studyCards.length - 1;

        if (isLast) {
            const sum = newRatings.reduce((a, b) => a + b, 0);
            const avg = (sum / newRatings.length).toFixed(1);
            const allFiveStars = newRatings.every(r => r === 5);
            const lowRatedCards = studyCards.filter((_, idx) => newRatings[idx] < 5);

            // Show summary immediately
            setSessionResult({ avg, allFiveStars, lowRatedCards });
            playCompletion();
            if (allFiveStars) {
                confetti({
                    particleCount: 200,
                    spread: 160,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FF4500', '#00FF7F', '#00BFFF', '#FF1493'], // Richer vibrant colors
                    zIndex: 2001, // Ensure it's on top of the modal (modal is 2000)
                    scalar: 1.2, // Slightly larger
                    drift: 0.5,
                    gravity: 1.1,
                    decay: 0.92
                });
            }

            // Save in background
            const updatedStack = {
                ...stack,
                avgRating: avg,
                lastReviewed: new Date().toLocaleDateString()
            };

            saveStack(user.token, updatedStack, stack.driveFileId)
                .then(() => {
                    onUpdate();
                })
                .catch((error) => {
                    console.error('Failed to update stack rating:', error);
                    showAlert('Save failed, but your session is complete.');
                });
        } else {
            setSessionRatings(newRatings);
            // Reset flip state first, then change card after a brief delay
            setIsFlipped(false);
            setRating(0);
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
            }, 100);
        }
    };

    const restartSession = (cardsToUse) => {
        setStudyCards(cardsToUse);
        setCurrentIndex(0);
        setIsFlipped(false);
        setRating(0);
        setSessionRatings([]);
        setSessionResult(null);
    };

    const handleRating = (val) => {
        playTing();
        setRating(val);
        setTimeout(() => handleNext(val), 500);
    };

    const executeShare = async () => {
        if (!shareEmail) return;
        try {
            await shareStack(user.token, stack.driveFileId, shareEmail, shareRole);
            showAlert('Shared successfully!');
            setShowShare(false);
        } catch (error) {
            showAlert('Failed to share.');
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.01)', zIndex: 2000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }}>
            {sessionResult ? (
                <motion.div
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

                    <div className="neo-flat neo-glow-blue" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                        <div style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: '0.5rem', fontWeight: 'bold' }}>SESSION SCORE</div>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <Star size={40} fill="var(--star-color)" color="var(--star-color)" /> {sessionResult.avg}
                        </div>
                    </div>

                    {sessionResult.allFiveStars ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
                            <motion.img
                                src={congratulationsImg}
                                alt="Congratulations"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', damping: 12 }}
                                style={{ maxWidth: '80%', height: 'auto', borderRadius: '12px' }}
                            />
                            <div className="neo-inset" style={{ padding: '1.5rem', color: 'var(--accent-color)', borderRadius: '16px', width: '100%', textAlign: 'center' }}>
                                <p style={{ fontWeight: 'bold', fontSize: '1.2rem', lineHeight: '1.6' }}>
                                    Congratulations. <br />
                                    By royal decree, I name you Master of <br />
                                    <span style={{ color: 'var(--accent-color)', fontSize: '1.4rem' }}>{stack.title}</span>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p style={{ opacity: 0.7, fontWeight: '500' }}>Great progress! Regular practice is the key to mastery.</p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                        <button className="neo-button" style={{ justifyContent: 'center', background: 'var(--accent-color)', color: 'white', border: 'none', padding: '1rem' }} onClick={() => restartSession(stack.cards)}>
                            Try All Cards Again
                        </button>

                        {!sessionResult.allFiveStars && (
                            <button className="neo-button" style={{ justifyContent: 'center', padding: '1rem' }} onClick={() => restartSession(sessionResult.lowRatedCards)}>
                                Focus on Difficult Cards ({sessionResult.lowRatedCards.length})
                            </button>
                        )}

                        <button className="neo-button" style={{ justifyContent: 'center', padding: '1rem', opacity: 0.7 }} onClick={onClose}>
                            Done for now
                        </button>
                    </div>
                </motion.div>
            ) : (
                <div className="review-container" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>

                    {/* Top bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div className="neo-button" style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                            {currentIndex + 1} / {studyCards.length}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="neo-button icon-btn" onClick={onEdit}><Edit2 size={18} /></button>
                            <button className="neo-button icon-btn" title="Share" onClick={() => setShowShare(true)}><Share2 size={18} /></button>
                            <button className="neo-button icon-btn" title="Duplicate" onClick={() => onDuplicate(stack)}><Copy size={18} /></button>
                            <button className="neo-button icon-btn" onClick={onClose}><X size={18} /></button>
                        </div>
                    </div>

                    {/* Card Flip Content */}
                    <div
                        style={{ perspective: '1000px', height: '400px', cursor: 'pointer' }}
                        onClick={() => setIsFlipped(!isFlipped)}
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
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '2rem', textAlign: 'center', overflow: 'hidden'
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.4, marginBottom: '1rem' }}>QUESTION</span>
                                {currentCard && currentCard.question.image && (
                                    <img
                                        src={currentCard.question.image}
                                        style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '12px', marginBottom: '1rem', cursor: 'pointer' }}
                                        alt="Q"
                                        onClick={(e) => { e.stopPropagation(); setViewingImage(currentCard.question.image); }}
                                    />
                                )}
                                <h2 style={{ fontSize: '1.4rem' }}>{currentCard ? currentCard.question.text : 'No more cards'}</h2>
                                {currentCard && currentCard.question.audio && (
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                                        <AudioPlayer audioData={currentCard.question.audio} />
                                    </div>
                                )}
                            </div>

                            {/* Back (Answer) */}
                            <div className="neo-flat" style={{
                                position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '2rem', textAlign: 'center', overflow: 'hidden'
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.4, marginBottom: '1rem' }}>ANSWER</span>
                                {currentCard && currentCard.answer.image && (
                                    <img
                                        src={currentCard.answer.image}
                                        style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '12px', marginBottom: '1rem', cursor: 'pointer' }}
                                        alt="A"
                                        onClick={(e) => { e.stopPropagation(); setViewingImage(currentCard.answer.image); }}
                                    />
                                )}
                                <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-color)' }}>{currentCard ? currentCard.answer.text : ''}</h2>
                                {currentCard && currentCard.answer.audio && (
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                                        <AudioPlayer audioData={currentCard.answer.audio} />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {!isFlipped ? (
                        <button
                            className="neo-button neo-glow-blue"
                            style={{ width: '100%', justifyContent: 'center', padding: '1.2rem', fontSize: '1.1rem', background: 'var(--accent-color)', color: 'white' }}
                            onClick={() => { playSwoosh(); setIsFlipped(true); }}
                        >
                            Show Answer
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <p style={{ opacity: 0.6 }}>Rate your answer to show next.</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        className={`neo-button icon-btn ${star <= rating ? 'neo-glow-blue' : ''}`}
                                        style={{ width: '50px', height: '50px' }}
                                        onClick={(e) => { e.stopPropagation(); handleRating(star); }}
                                    >
                                        <Star size={24} fill={star <= rating ? 'var(--star-color)' : 'none'} color={star <= rating ? 'var(--star-color)' : 'currentColor'} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Share Modal */}
                    <AnimatePresence>
                        {showShare && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="neo-flat"
                                style={{
                                    position: 'absolute', top: '20%', left: '5%', right: '5%',
                                    padding: '2rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '1.5rem'
                                }}
                            >
                                <h3 style={{ textAlign: 'center' }}>Share this Stack</h3>
                                <input
                                    className="neo-input"
                                    placeholder="Enter Gmail ID"
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                />
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                        <input type="radio" name="review_role" checked={shareRole === 'reader'} onChange={() => setShareRole('reader')} /> View Only
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                        <input type="radio" name="review_role" checked={shareRole === 'writer'} onChange={() => setShareRole('writer')} /> Edit
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="neo-button" style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-color)', color: 'white', border: 'none' }} onClick={executeShare}>Send Invite</button>
                                    <button className="neo-button" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowShare(false)}>Cancel</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Image Viewer */}
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
