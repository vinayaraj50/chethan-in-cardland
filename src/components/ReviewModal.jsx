import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, Star, Play, SkipForward, Square, Pause, Download, Mic, Trash2, Layers, AlertCircle, Brain, BookOpen, Sparkles } from 'lucide-react';
import { saveStack } from '../services/googleDrive';
import { downloadStackAsZip } from '../utils/zipUtils';
import CloseButton from './common/CloseButton';
import ImageViewer from './ImageViewer';
import confetti from 'canvas-confetti';
import { playTada, playSwoosh, playTing, playCompletion, playDopamine, playPartial } from '../utils/soundEffects';
import congratulationsImg from '../assets/congratulations.png';
import { ADMIN_EMAIL } from '../constants/config';
import { getRandomPhrase } from '../constants/phrases';

const AudioPlayer = ({ audioData }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef(null);
    const animationRef = useRef();
    const progressBarRef = useRef();

    if (!audioRef.current) {
        audioRef.current = new Audio(audioData);
    }

    useEffect(() => {
        const audio = audioRef.current;
        if (audio.src !== audioData) {
            audio.pause();
            audio.src = audioData;
            audio.load();
            setProgress(0);
            setIsPlaying(false);
        }
    }, [audioData]);

    useEffect(() => {
        const audio = audioRef.current;
        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
            animationRef.current = requestAnimationFrame(updateProgress);
        };

        const onPlay = () => {
            setIsPlaying(true);
            animationRef.current = requestAnimationFrame(updateProgress);
        };

        const onPause = () => {
            setIsPlaying(false);
            cancelAnimationFrame(animationRef.current);
        };

        const onEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            cancelAnimationFrame(animationRef.current);
        };

        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.pause();
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
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

const ReviewModal = ({ stack, user, onClose, onEdit, onUpdate, onDuplicate, showAlert, userCoins, onDeductCoins, isPreviewMode = false, onLoginRequired, previewProgress = null, onReviewStart, displayName }) => {
    // Check if there are any previous ratings to decide initial mode
    const hasPreviousRatings = stack.cards?.some(card => card.lastRating !== undefined) || false;

    const [showModeSelection, setShowModeSelection] = useState(hasPreviousRatings);
    const [currentIndex, setCurrentIndex] = useState(previewProgress?.currentIndex || 0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [rating, setRating] = useState(0);
    const [sessionRatings, setSessionRatings] = useState(previewProgress?.sessionRatings || []);
    const [studyCards, setStudyCards] = useState(hasPreviousRatings ? [] : (stack.cards || []));
    const [sessionResult, setSessionResult] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
    const recordedAudioRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const [feedback, setFeedback] = useState(null);
    const [masteredCount, setMasteredCount] = useState(0);
    const [firstRatings, setFirstRatings] = useState({}); // Tracking first rating for SRS
    const [totalOriginalCards, setTotalOriginalCards] = useState(hasPreviousRatings ? 0 : (stack.cards?.length || 0));

    // Coin Logic
    const [reviewedCountSession, setReviewedCountSession] = useState(0);

    // Preview Mode Logic
    const previewLimit = isPreviewMode ? Math.floor((stack.cards?.length || 0) / 2) : (stack.cards?.length || 0);

    //SRS Intervals (Days): 1, 3, 7, 30, 30...
    const getNextInterval = (currentStage) => {
        const stages = [1, 3, 7, 30]; // Day 1, Day 3, Day 7, Day 30
        if (currentStage >= stages.length - 1) return 30; // Every 30 days after
        return stages[currentStage + 1];
    };

    useEffect(() => {
        if (sessionRatings.length > 0 && onReviewStart) {
            onReviewStart();
        }
    }, [sessionRatings, onReviewStart]);


    useEffect(() => {
        // Cleanup recorded audio on unmount
        return () => {
            if (recordedAudioRef.current) {
                recordedAudioRef.current.pause();
                recordedAudioRef.current = null;
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setRecordedAudio(url);
                recordedAudioRef.current = new Audio(url);
                recordedAudioRef.current.onended = () => setIsPlayingRecorded(false);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            // SECURITY FIX (VULN-006): Don't log error details
            showAlert('Microphone access denied or not available.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const deleteRecording = () => {
        if (recordedAudio) {
            if (recordedAudioRef.current) {
                recordedAudioRef.current.pause();
                recordedAudioRef.current = null;
            }
            URL.revokeObjectURL(recordedAudio);
            setRecordedAudio(null);
            setIsPlayingRecorded(false);
        }
    };

    const toggleRecordedPlayback = (e) => {
        if (e) e.stopPropagation();
        if (!recordedAudioRef.current) return;

        if (isPlayingRecorded) {
            recordedAudioRef.current.pause();
            setIsPlayingRecorded(false);
        } else {
            recordedAudioRef.current.play();
            setIsPlayingRecorded(true);
        }
    };

    useEffect(() => {
        if (!showModeSelection) {
            playTada();
        }
    }, [showModeSelection]);

    const currentCard = studyCards[currentIndex];

    const handleStartReview = (mode) => {
        let baseCards = [...(stack.cards || [])];

        // Sort by difficulty: cards with lower/missing ratings first
        baseCards.sort((a, b) => {
            const rA = a.lastRating !== undefined ? a.lastRating : -2;
            const rB = b.lastRating !== undefined ? b.lastRating : -2;
            return rA - rB;
        });

        let selected = [];
        if (mode === 'all') {
            selected = baseCards;
        } else if (mode === 'difficult') {
            selected = baseCards.filter(c => c.lastRating !== undefined && c.lastRating < 2);
        }

        setStudyCards(selected);
        setTotalOriginalCards(selected.length);
        setShowModeSelection(false);
        setCurrentIndex(0);
        setSessionRatings([]);
        setSessionResult(null);
        setMasteredCount(0);
        setFirstRatings({});
        setFeedback(null);
    };

    const handleNextSession = async () => {
        const val = rating;
        const isByHeart = val === 2;

        // Reset feedback and proceed
        setFeedback(null);

        const newMasteredCount = isByHeart ? masteredCount + 1 : masteredCount;
        if (isByHeart) setMasteredCount(newMasteredCount);

        const isLast = newMasteredCount === totalOriginalCards;

        if (isLast) {
            // Marks Calculation using firstRatings
            const finalRatings = studyCards.slice(0, totalOriginalCards).map((card) => {
                const cardId = card.id || card.question.text;
                return firstRatings[cardId] ?? 0;
            });

            const totalMarks = finalRatings.reduce((a, b) => a + b, 0);
            const maxPossibleMarks = totalOriginalCards * 2;
            const avg = (totalMarks / totalOriginalCards).toFixed(1);

            const fullMarks = totalMarks === maxPossibleMarks;

            // For the summary, "low rated" are those that were tough *initially*
            const lowRatedCards = stack.cards.filter((card) => {
                const cardId = card.id || card.question.text;
                const r = firstRatings[cardId];
                return r !== undefined && r < 2;
            });

            setSessionResult({
                avg,
                totalMarks,
                maxPossibleMarks,
                fullMarks,
                lowRatedCards
            });
            playCompletion();

            if (fullMarks) {
                confetti({
                    particleCount: 200,
                    spread: 160,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FF4500', '#00FF7F', '#00BFFF', '#FF1493'],
                    zIndex: 2001,
                    scalar: 1.2,
                    drift: 0.5,
                    gravity: 1.1,
                    decay: 0.92
                });
            }

            if (totalOriginalCards < stack.cards.length) {
                return;
            }

            const updatedCards = stack.cards.map((card) => {
                const cardId = card.id || card.question.text;
                const fRating = firstRatings[cardId];
                if (fRating !== undefined) {
                    return { ...card, lastRating: fRating };
                }
                return card;
            });

            const currentStage = stack.reviewStage || -1;
            let nextReviewDate = new Date();
            let nextStage = currentStage;

            if (avg >= 1.5) {
                nextStage = currentStage + 1;
                const daysToAdd = getNextInterval(nextStage);
                nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
            } else {
                nextStage = -1;
            }

            const updatedStack = {
                ...stack,
                cards: updatedCards,
                lastMarks: totalMarks,
                cardsCountAtLastReview: totalOriginalCards,
                lastReviewed: new Date().toLocaleDateString(),
                nextReview: nextReviewDate.toISOString(),
                reviewStage: nextStage
            };

            if (stack.ownedByMe) {
                saveStack(user.token, updatedStack, stack.driveFileId)
                    .then(() => onUpdate(updatedStack))
                    .catch((error) => console.warn('Background save failed', error));
            } else {
                onUpdate(updatedStack);
            }
        } else {
            setIsFlipped(false);
            setRating(0);
            deleteRecording();
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
            }, 100);
        }
    };

    const restartSession = (cardsToUse) => {
        setStudyCards(cardsToUse);
        setTotalOriginalCards(cardsToUse.length);
        setCurrentIndex(0);
        setIsFlipped(false);
        setRating(0);
        setSessionRatings([]);
        setSessionResult(null);
        setMasteredCount(0);
        setFirstRatings({});
        setFeedback(null);
        deleteRecording();
    };

    const handleRating = (val, customFeedbackMsg = null) => {
        const isByHeart = val === 2;
        const isPartial = val === 1;

        if (isByHeart) {
            playDopamine();
        } else if (isPartial) {
            playPartial();
        } else {
            playTing();
        }
        setRating(val);

        const cardId = currentCard.id || currentCard.question.text;

        // Track first rating for SRS
        if (firstRatings[cardId] === undefined) {
            setFirstRatings(prev => ({ ...prev, [cardId]: val }));
        }

        if (!isByHeart) {
            // Add back to queue
            setStudyCards(prev => [...prev, currentCard]);
        }

        // Set feedback
        const msg = customFeedbackMsg || getRandomPhrase(isByHeart ? 'mastered' : 'retry');
        setFeedback({ message: msg, type: isByHeart ? 'success' : 'retry' });

        // Preview Limit Logic
        const isPublicOrDemo = stack.isPublic || stack.id === 'demo-stack';
        const isOwnedByMe = stack.ownedByMe;

        if (isPublicOrDemo && !isOwnedByMe) {
            const nextIndex = currentIndex + 1;
            const limit = 10;
            if (nextIndex >= limit) {
                if (!user) {
                    if (onLoginRequired) {
                        onLoginRequired({
                            stack,
                            currentIndex: nextIndex,
                            sessionRatings: [...sessionRatings, val]
                        });
                    }
                } else if (onUpdate) {
                    showAlert({
                        type: 'confirm',
                        message: "You've reached the preview limit. Add this stack to 'My Cards' to continue?",
                        onConfirm: () => {
                            if (onDuplicate) onDuplicate(stack);
                            onClose();
                        }
                    });
                }
                return;
            }
        }

        setReviewedCountSession(prev => prev + 1);
    };

    const handleDownload = async () => {
        try {
            await downloadStackAsZip(stack);
            showAlert('Stack downloaded successfully!');
        } catch (error) {
            // SECURITY FIX (VULN-006): Don't log error details
            showAlert('Failed to download stack.');
        }
    };

    const difficultCardsCount = (stack.cards || []).filter(c => c.lastRating !== undefined && c.lastRating < 2).length;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.01)', zIndex: 2000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 'max(1rem, 2vh)'
        }}>
            <AnimatePresence mode="wait">
                {showModeSelection ? (
                    <motion.div
                        key="mode-selection"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="neo-flat"
                        style={{
                            width: '100%', maxWidth: '400px', padding: '2.5rem',
                            display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center'
                        }}
                    >
                        <div>
                            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Start Review</h2>
                            <p style={{ opacity: 0.6 }}>Choose how you want to study today.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                className="neo-button"
                                style={{ padding: '1.5rem', justifyContent: 'flex-start', gap: '1rem' }}
                                onClick={() => handleStartReview('all')}
                            >
                                <div className="neo-inset" style={{ padding: '10px', borderRadius: '50%', color: 'var(--accent-color)' }}>
                                    <Layers size={24} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Review All Cards</div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Go through the entire stack ({stack.cards?.length || 0} cards)</div>
                                </div>
                            </button>

                            <button
                                className="neo-button"
                                style={{
                                    padding: '1.5rem', justifyContent: 'flex-start', gap: '1rem',
                                    opacity: difficultCardsCount > 0 ? 1 : 0.5,
                                    cursor: difficultCardsCount > 0 ? 'pointer' : 'not-allowed'
                                }}
                                disabled={difficultCardsCount === 0}
                                onClick={() => difficultCardsCount > 0 && handleStartReview('difficult')}
                            >
                                <div className="neo-inset" style={{ padding: '10px', borderRadius: '50%', color: difficultCardsCount > 0 ? '#ff9800' : 'gray' }}>
                                    <AlertCircle size={24} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Review Difficult Only</div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                                        {difficultCardsCount > 0
                                            ? `Focus on the ${difficultCardsCount} cards you didn't know by heart`
                                            : "No difficult cards found"}
                                    </div>
                                </div>
                            </button>
                        </div>

                        <button className="neo-button" style={{ justifyContent: 'center', opacity: 0.6, marginTop: '1rem' }} onClick={onClose}>
                            Cancel
                        </button>
                    </motion.div>
                ) : (!studyCards || studyCards.length === 0) && !sessionResult ? (
                    <motion.div
                        key="empty-stack"
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
                            <h2 style={{ fontSize: '1.5rem' }}>No Cards Found</h2>
                            <p style={{ opacity: 0.6 }}>This stack appears to be empty. Would you like to add some cards?</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button className="neo-button neo-glow-blue" style={{ justifyContent: 'center', padding: '1rem' }} onClick={onEdit}>
                                <Edit2 size={18} style={{ marginRight: '8px' }} /> Add Cards Now
                            </button>
                            <button className="neo-button" style={{ justifyContent: 'center', opacity: 0.6 }} onClick={onClose}>
                                Close
                            </button>
                        </div>
                    </motion.div>
                ) : sessionResult ? (
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
                                {/* <Star size={40} fill="#3b82f6" color="#3b82f6" /> {sessionResult.avg} */}
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
                                        <span style={{ color: 'var(--accent-color)', fontSize: '1.4rem' }}>{stack.title}</span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', border: '1px solid #3b82f6' }}>
                                <p style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Don't give up!</p>
                                <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>Mastery takes patience. <br />Why not try the tough cards again right now?</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                            {!sessionResult.fullMarks && (
                                <button className="neo-button"
                                    style={{ justifyContent: 'center', background: 'var(--accent-color)', color: 'white', border: 'none', padding: '1rem' }}
                                    onClick={() => restartSession(sessionResult.lowRatedCards)}>
                                    Focus on Weak Cards ({sessionResult.lowRatedCards.length})
                                </button>
                            )}

                            <button className="neo-button"
                                style={{ justifyContent: 'center', padding: '1rem', background: sessionResult.fullMarks ? 'var(--accent-color)' : 'transparent', color: sessionResult.fullMarks ? 'white' : 'inherit', border: sessionResult.fullMarks ? 'none' : '1px solid var(--border-color)' }}
                                onClick={() => restartSession(stack.cards)}>
                                Try All Cards Again
                            </button>

                            <button className="neo-button" style={{ justifyContent: 'center', padding: '1rem', opacity: 0.7 }} onClick={onClose}>
                                Done for now
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="review-container" style={{
                        width: '100%', maxWidth: '560px',
                        display: 'flex', flexDirection: 'column',
                        gap: 'clamp(1rem, 3vh, 1.5rem)',
                        position: 'relative',
                        maxHeight: '100%',
                        overflowY: 'auto',
                        padding: 'max(20px, 4vh) 30px'
                    }}>

                        {/* Top bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div className="neo-button" style={{ height: '36px', padding: '0 15px', fontSize: '1rem', justifyContent: 'center', minWidth: '80px' }}>
                                {currentIndex + 1} / {studyCards.length}
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
                                {/* Progress Bar */}
                                <div style={{
                                    width: '100%', maxWidth: '220px', height: '16px', background: 'rgba(0,0,0,0.05)',
                                    borderRadius: '10px', position: 'relative', display: 'flex', alignItems: 'center',
                                    boxShadow: 'inset 2px 2px 4px var(--shadow-dark), inset -1px -1px 2px var(--shadow-light)'
                                }}>

                                    <motion.div
                                        animate={{
                                            left: `${totalOriginalCards > 0 ? (masteredCount / totalOriginalCards) * 100 : 0}%`,
                                            y: rating === 2 ? [0, -15, 0] : rating === 1 ? [0, -5, 0] : 0
                                        }}
                                        transition={{
                                            left: { type: "spring", stiffness: 50, damping: 15 },
                                            y: { duration: 0.4, ease: "easeOut" }
                                        }}
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: -4, // (16 - 24) / 2 = -4 to center 24px icon on 16px bar
                                            zIndex: 10,
                                            x: '-50%' // Center the icon on the point
                                        }}
                                    >
                                        <Brain size={24} color={rating === 2 ? '#22c55e' : 'var(--accent-color)'} fill={rating === 2 ? '#dcfce7' : 'none'} />
                                    </motion.div>

                                    <div style={{
                                        width: `${totalOriginalCards > 0 ? (masteredCount / totalOriginalCards) * 100 : 0}%`,
                                        height: '100%',
                                        background: rating === 2 ? 'linear-gradient(90deg, var(--accent-color), #22c55e)' : 'var(--accent-color)',
                                        borderRadius: '10px',
                                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }} />

                                    <div style={{ position: 'absolute', right: -12, top: -4, opacity: 0.7 }}>
                                        <BookOpen size={24} color="var(--text-color)" />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {user?.email === ADMIN_EMAIL && (
                                    <button className="neo-button icon-btn" style={{ width: '36px', height: '36px' }} title="Download Stack" onClick={handleDownload}><Download size={18} /></button>
                                )}
                                <CloseButton onClick={onClose} size={18} />
                            </div>
                        </div>

                        {/* Card Content based on Type */}
                        {currentCard && currentCard.type === 'mcq' ? (
                            <div className="neo-flat" style={{
                                width: '100%', minHeight: 'clamp(320px, 45vh, 400px)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                                padding: '1.25rem', textAlign: 'center', overflowY: 'auto'
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.4, marginBottom: '1rem' }}>MULTIPLE CHOICE</span>
                                {currentCard.question.image && (
                                    <img
                                        src={currentCard.question.image}
                                        style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '12px', marginBottom: '1rem', cursor: 'pointer' }}
                                        alt="Q"
                                        onClick={() => setViewingImage(currentCard.question.image)}
                                    />
                                )}
                                <h2 style={{ fontSize: '1.4rem', marginBottom: '2rem' }}>{currentCard.question.text}</h2>
                                {currentCard.question.audio && <AudioPlayer audioData={currentCard.question.audio} />}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', marginTop: 'auto' }}>
                                    {currentCard.options?.map((opt, i) => {
                                        const isSelected = false; // Could track selection state if needed
                                        const showCorrect = feedback && opt.isCorrect;
                                        const showWrong = feedback && !opt.isCorrect && feedback.type === 'retry'; // Only if we tracked selection

                                        return (
                                            <button
                                                key={opt.id || i}
                                                disabled={!!feedback}
                                                className="neo-button"
                                                onClick={() => {
                                                    if (opt.isCorrect) {
                                                        const brainImg = new Image();
                                                        brainImg.src = 'https://cdn-icons-png.flaticon.com/512/2920/2920326.png'; // Fallback or use local asset if available? keeping it simple with internal resources
                                                        handleRating(2);
                                                    } else {
                                                        const rightAnswer = currentCard.options.find(o => o.isCorrect)?.text || 'Unknown';
                                                        handleRating(0, `Incorrect. The right answer is "${rightAnswer}". I shall ask this again.`);
                                                    }
                                                }}
                                                style={{
                                                    padding: '1rem', justifyContent: 'center', textAlign: 'center', minHeight: '60px',
                                                    background: showCorrect ? '#dcfce7' : 'var(--bg-color)',
                                                    borderColor: showCorrect ? '#22c55e' : 'var(--border-color)',
                                                    opacity: feedback && !showCorrect ? 0.5 : 1
                                                }}
                                            >
                                                {opt.text}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    className="neo-button"
                                    disabled={!!feedback}
                                    onClick={() => {
                                        const rightAnswer = currentCard.options.find(o => o.isCorrect)?.text || 'Unknown';
                                        handleRating(0, `The right answer is "${rightAnswer}". I shall ask this again.`);
                                    }}
                                    style={{ marginTop: '1.5rem', opacity: 0.7, width: '100%', justifyContent: 'center' }}
                                >
                                    I don't know
                                </button>
                            </div>
                        ) : currentCard ? (
                            /* Existing Flashcard Flip Logic */
                            <div
                                style={{ perspective: '1000px', height: 'clamp(320px, 45vh, 400px)', cursor: 'pointer' }}
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
                                        padding: '1.5rem', textAlign: 'center', overflowY: 'auto', overflowX: 'hidden'
                                    }}>
                                        <div style={{ margin: 'auto 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.4, marginBottom: '1rem', display: 'block' }}>QUESTION</span>
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
                                    </div>

                                    {/* Back (Answer) */}
                                    <div className="neo-flat" style={{
                                        position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                                        padding: '1.5rem', textAlign: 'center', overflowY: 'auto', overflowX: 'hidden'
                                    }}>
                                        <div style={{ margin: 'auto 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.4, marginBottom: '1rem', display: 'block' }}>ANSWER</span>
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
                                    </div>
                                </motion.div>
                            </div>
                        ) : null}

                        {!isFlipped && currentCard && currentCard.type !== 'mcq' ? (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Record Answer UI */}
                                <div className="neo-flat" style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        <div style={{
                                            width: '10px', height: '10px', borderRadius: '50%',
                                            background: isRecording ? '#ff4444' : '#ccc',
                                            boxShadow: isRecording ? '0 0 8px #ff4444' : 'none',
                                            animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                                        }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.7 }}>
                                            {isRecording ? 'RECORDING ANSWER...' : recordedAudio ? 'ANSWER RECORDED' : 'RECORD YOUR ANSWER'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                                        {!isRecording && !recordedAudio ? (
                                            <button className="neo-button icon-btn" onClick={startRecording} style={{ color: 'var(--accent-color)' }}>
                                                <Mic size={18} />
                                            </button>
                                        ) : isRecording ? (
                                            <button className="neo-button icon-btn" onClick={stopRecording} style={{ color: '#ff4444' }}>
                                                <Square size={18} fill="currentColor" />
                                            </button>
                                        ) : (
                                            <>
                                                <button className="neo-button icon-btn" onClick={deleteRecording} style={{ color: '#ff4444' }}>
                                                    <Trash2 size={18} />
                                                </button>
                                                <div style={{ display: 'none' }}>
                                                    {/* Hidden player to handle the object URL lifecycle if needed, 
                                                        but AudioPlayer will handle it visually on the flip side */}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <button
                                    className="neo-button neo-glow-blue"
                                    style={{ width: '100%', justifyContent: 'center', padding: '1.2rem', fontSize: '1.1rem', background: 'var(--accent-color)', color: 'white', minHeight: '60px' }}
                                    onClick={() => {
                                        playSwoosh();
                                        setIsFlipped(true);
                                        if (recordedAudio) {
                                            setTimeout(() => toggleRecordedPlayback(), 300);
                                        }
                                    }}
                                >
                                    Show Answer
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', minHeight: '80px', justifyContent: 'center' }}>
                                <AnimatePresence mode="wait">
                                    {feedback ? (
                                        <motion.div
                                            key="feedback-box"
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="neo-flat"
                                            style={{
                                                width: '100%', padding: '1.75rem', borderRadius: '28px',
                                                display: 'flex', flexDirection: 'column', gap: '1.25rem',
                                                background: feedback.type === 'success' ? 'rgba(255, 255, 255, 0.92)' : 'rgba(242, 247, 255, 0.92)',
                                                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                                                border: feedback.type === 'success' ? '2px solid rgba(34, 197, 94, 0.4)' : '2px solid rgba(59, 130, 246, 0.4)',
                                                textAlign: 'center',
                                                boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                                                margin: '0.5rem 0'
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                                {feedback.type === 'success' && <Brain size={40} className="bounce" color="#16a34a" fill="#dcfce7" />}
                                                <span style={{
                                                    fontSize: '0.9rem',
                                                    fontWeight: '800',
                                                    color: 'var(--accent-color)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <span style={{ opacity: 0.6 }}>Hey</span> {displayName || 'there'}! 👋
                                                </span>
                                                <h3 style={{
                                                    fontSize: '1.2rem', lineHeight: '1.5',
                                                    color: feedback.type === 'success' ? '#16a34a' : 'var(--accent-color)'
                                                }}>
                                                    "{feedback.message}"
                                                </h3>
                                            </div>
                                            <button
                                                className="neo-button neo-glow-blue"
                                                style={{
                                                    justifyContent: 'center', padding: '1rem',
                                                    background: feedback.type === 'success' ? '#16a34a' : 'var(--accent-color)',
                                                    color: 'white', border: 'none'
                                                }}
                                                onClick={handleNextSession}
                                            >
                                                Next Question
                                            </button>
                                        </motion.div>
                                    ) : (
                                        currentCard.type !== 'mcq' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                                                <div className="neo-flat" style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderRadius: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-color)', opacity: 0.6 }} />
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.7 }}>
                                                            SELECT WHAT MATCHES YOUR ANSWER
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                                                        {recordedAudio && (
                                                            <button
                                                                className="neo-button icon-btn"
                                                                onClick={toggleRecordedPlayback}
                                                                style={{ color: 'var(--accent-color)', width: '32px', height: '32px' }}
                                                            >
                                                                {isPlayingRecorded ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', width: '100%', justifyContent: 'center' }}>
                                                    <button
                                                        className="neo-button"
                                                        style={{
                                                            flex: 1, flexDirection: 'column', padding: '12px 5px',
                                                            background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
                                                            minWidth: '60px'
                                                        }}
                                                        onClick={(e) => { e.stopPropagation(); handleRating(-1); }}
                                                    >
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Wrong</span>
                                                    </button>

                                                    <button
                                                        className="neo-button"
                                                        style={{
                                                            flex: 1, flexDirection: 'column', padding: '12px 5px',
                                                            background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb',
                                                            minWidth: '60px'
                                                        }}
                                                        onClick={(e) => { e.stopPropagation(); handleRating(0); }}
                                                    >
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Unsure</span>
                                                    </button>

                                                    <button
                                                        className="neo-button"
                                                        style={{
                                                            flex: 1, flexDirection: 'column', padding: '12px 5px',
                                                            background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd',
                                                            minWidth: '60px'
                                                        }}
                                                        onClick={(e) => { e.stopPropagation(); handleRating(1); }}
                                                    >
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Partly</span>
                                                    </button>

                                                    <button
                                                        className="neo-button"
                                                        style={{
                                                            flex: 1, flexDirection: 'column', padding: '12px 5px',
                                                            background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0',
                                                            minWidth: '60px'
                                                        }}
                                                        onClick={(e) => { e.stopPropagation(); handleRating(2); }}
                                                    >
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>By heart</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null
                                    )}
                                </AnimatePresence>

                            </div>
                        )}
                    </div>
                )}
            </AnimatePresence>

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
