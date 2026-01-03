import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, Copy, Star, Play, SkipForward, Square, Pause, Download, Mic, Trash2, Layers, AlertCircle } from 'lucide-react';
import { saveStack } from '../services/googleDrive';
import { downloadStackAsZip } from '../utils/zipUtils';
import ImageViewer from './ImageViewer';
import confetti from 'canvas-confetti';
import { playTada, playSwoosh, playTing, playCompletion } from '../utils/soundEffects';
import congratulationsImg from '../assets/congratulations.png';

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

const ReviewModal = ({ stack, user, onClose, onEdit, onUpdate, onDuplicate, showAlert, userCoins, onDeductCoins, isPreviewMode = false, onLoginRequired, previewProgress = null }) => {
    // Check if there are any previous ratings to decide initial mode
    const hasPreviousRatings = stack.cards.some(card => card.lastRating !== undefined);

    const [showModeSelection, setShowModeSelection] = useState(hasPreviousRatings);
    const [currentIndex, setCurrentIndex] = useState(previewProgress?.currentIndex || 0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [rating, setRating] = useState(0);
    const [sessionRatings, setSessionRatings] = useState(previewProgress?.sessionRatings || []);
    const [studyCards, setStudyCards] = useState(hasPreviousRatings ? [] : stack.cards);
    const [sessionResult, setSessionResult] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
    const recordedAudioRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Coin Logic
    const [reviewedCountSession, setReviewedCountSession] = useState(0);

    // Preview Mode Logic
    const previewLimit = isPreviewMode ? Math.floor(stack.cards.length / 2) : stack.cards.length;

    //SRS Intervals (Days): 1, 3, 7, 30, 30...
    const getNextInterval = (currentStage) => {
        const stages = [1, 3, 7, 30]; // Day 1, Day 3, Day 7, Day 30
        if (currentStage >= stages.length - 1) return 30; // Every 30 days after
        return stages[currentStage + 1];
    };


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
        if (mode === 'all') {
            setStudyCards(stack.cards);
        } else if (mode === 'difficult') {
            // Filter cards with rating < 4 (or undefined if we treat unrated as difficult, but usually it's rated ones)
            // Actually, let's treat unrated as something that should be in "All" mostly.
            // "Difficult" implies we struggled with it last time.
            const difficult = stack.cards.filter(c => c.lastRating !== undefined && c.lastRating < 4);
            setStudyCards(difficult);
        }
        setShowModeSelection(false);
        setCurrentIndex(0);
        setSessionRatings([]);
        setSessionResult(null);
    };

    const handleNext = async (val) => {
        const newRatings = [...sessionRatings, val];
        const isLast = currentIndex === studyCards.length - 1;

        if (isLast) {
            // Marks Calculation
            const totalMarks = newRatings.reduce((a, b) => a + b, 0);
            const maxPossibleMarks = studyCards.length * 2;
            const avg = (totalMarks / studyCards.length).toFixed(1); // Keep avg for internal logic mostly, or just use marks

            // Adjust "All Correct" logic to be "Full Marks"
            const fullMarks = totalMarks === maxPossibleMarks;
            const lowRatedCards = studyCards.filter((_, idx) => newRatings[idx] < 2); // < 2 means not "By heart"

            // Show summary immediately
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

            // DO NOT update SRS or Last Reviewed if it's a prompt for weak cards
            // Check if we are reviewing the full stack or just a subset (weak cards)
            // A simple heuristic is: if studyCards.length < stack.cards.length, it's a partial review.
            // Or passing a flag. But "Focus on weak cards" definitely limits the set.
            // Wait, "difficult" mode earlier also limits it.
            // Requirement: "Dont count as another review if user uses ' focus on weak cards' button of the 'study summary' popup."
            // This button calls `restartSession(sessionResult.lowRatedCards)`.
            // So if `studyCards.length !== stack.cards.length`, we skip SRS update? 
            // Validating against `stack.cards.length` is decent, assuming deck isn't 1 card.
            // Alternatively, check if we are in a "re-study" mode.
            // But simpler: if (studyCards.length < stack.cards.length), do not save SRS.

            if (studyCards.length < stack.cards.length) {
                // Partial review (weak cards or difficult mode), do NOT update SRS stats
                return;
            }

            // Update individual card ratings in the original stack
            // We need to map the new ratings back to the original cards in the stack
            // unique ID for cards would be better, but assuming order/reference or simple update here.
            // Since studyCards is a subset or full set, we need to match them back.
            // A safer way is to update 'stack.cards' by finding the cards we just studied.
            // But we don't have stable IDs on cards necessarily.
            // If we assume studyCards hold the *same* object references as stack.cards, we can mutate them or find them.

            const updatedCards = stack.cards.map(card => {
                // Find if this card was in our study session
                const studyIndex = studyCards.findIndex(sc => sc === card); // strict equality check
                if (studyIndex !== -1) {
                    return {
                        ...card,
                        lastRating: newRatings[studyIndex]
                    };
                }
                return card;
            });

            // Calculate SRS for the Stack
            const currentStage = stack.reviewStage || -1;
            let nextReviewDate = new Date();
            let nextStage = currentStage;

            // New Threshold: Avg >= 1.5 (Mostly 'By heart' or 'Partly')
            if (avg >= 1.5) {
                // Success: Advance stage
                nextStage = currentStage + 1;
                const daysToAdd = getNextInterval(nextStage); // Use NEXT stage for interval
                nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
            } else {
                // Fail: Review immediately (Today)
                // "try agin the ltough cards immediately aafter a review"
                // nextReviewDate stays as NOW
                nextStage = -1; // Reset to beginning (-1 assumes first review puts it to 0? Or 0 puts it to 1?)
                // If stages are 0 index based: [1d, 3d, 7d, 30d]
                // First successful review -> stage 0 (1 day wait)
                // Second -> stage 1 (3 days)
                // If fail, reset to -1 so next success goes to 0 (1 day).
            }


            // Save in background only if owned by me
            const updatedStack = {
                ...stack,
                cards: updatedCards,
                lastMarks: totalMarks,
                cardsCountAtLastReview: studyCards.length,
                lastReviewed: new Date().toLocaleDateString(),
                nextReview: nextReviewDate.toISOString(),
                reviewStage: nextStage
            };

            if (stack.ownedByMe) {
                saveStack(user.token, updatedStack, stack.driveFileId)
                    .then(() => {
                        onUpdate(updatedStack);
                    })
                    .catch((error) => {
                        // SECURITY FIX (VULN-006): Don't log error details to user
                        console.warn('Background save failed', error);
                        // showAlert('Save failed, but your session is complete.'); // Suppressed per user request to "fix" the interruption
                    });
            } else {
                onUpdate(updatedStack);
            }
        } else {
            setSessionRatings(newRatings);
            // Reset flip state first, then change card after a brief delay
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
        setCurrentIndex(0);
        setIsFlipped(false);
        setRating(0);
        setSessionRatings([]);
        setSessionResult(null);
        deleteRecording();
    };

    const handleRating = (val) => {
        playTing();
        setRating(val);

        // Preview Limit Logic (10 cards)
        // Applies if user is NOT owner (public/demo) OR user is guest
        // Requirement: "Make the first 10 flashcard preview free in all stacks."
        // "If user is not logged in, ask to login to continue before 11th card."
        // "If user logged in and is previewing the ready-made cards, ask to add to 'my cards' to continue."

        const isPublicOrDemo = stack.isPublic || stack.id === 'demo-stack';
        const isOwnedByMe = stack.ownedByMe;

        // If it's a stack I don't own (public preview), apply limit
        if (isPublicOrDemo && !isOwnedByMe) {
            // Check if next card would exceed limit (index 9 is 10th card, so next index 10 is 11th)
            const nextIndex = currentIndex + 1;
            const limit = 10;

            if (nextIndex >= limit) {
                if (!user) {
                    // Guest -> trigger login
                    if (onLoginRequired) {
                        onLoginRequired({
                            stack,
                            currentIndex: nextIndex,
                            sessionRatings: [...sessionRatings, val]
                        });
                    }
                    return;
                } else {
                    // Logged in -> ask to add to my cards
                    // Trigger a confirm dialog
                    if (onUpdate) { // Re-using onUpdate as a signal or need a new callback? 
                        // App.jsx needs to handle this. Let's use showAlert with confirm logic or a custom callback if available.
                        // Actually, simpler to just use the existing `onDuplicate` logic but forced?
                        // Or pass a new callback `onLimitReached`.
                        // Since I can't easily add a new prop to App.jsx without editing it too (which I will), let's call `onDuplicate` for now?
                        // No, `onDuplicate` copies it. 
                        // I'll emit a special event via existing props or just show a blocking alert that they need to add it.
                        // Better yet, I'll update App.jsx to pass `onAddToLibrary`.
                        // For now, assume a prop `onAddToLibrary` exists or I'll implement it.
                        showAlert({
                            type: 'confirm',
                            message: "You've reached the preview limit. Add this stack to 'My Cards' to continue?",
                            onConfirm: () => {
                                if (onDuplicate) onDuplicate(stack); // This handles the import/copy
                                onClose(); // Close this modal so they can open the new one or it auto-opens?
                                // Ideally, onDuplicate handles the flow.
                            }
                        });
                        return;
                    }
                }
            }
        }

        /* 
        Original logic replaced with simpler checked limits above.
        // Check if we've reached preview limit BEFORE processing the rating
        if (isPreviewMode && sessionRatings.length + 1 >= previewLimit) {
            // User has reached the preview limit, trigger login
            if (onLoginRequired) {
                onLoginRequired({
                    stack,
                    currentIndex: currentIndex + 1, // Next card index
                    sessionRatings: [...sessionRatings, val]
                });
            }
            return;
        }
        */

        // Coin Deduction Logic: Deduct 5 coins every 3 cards
        // But NOT for Demo stack (id: 'demo-stack') or public/ready-made stacks
        if (!isPreviewMode && stack.id !== 'demo-stack' && !stack.isPublic) {
            setReviewedCountSession(prev => {
                const newCount = prev + 1;
                if (newCount % 3 === 0 && onDeductCoins) {
                    onDeductCoins(5);
                }
                return newCount;
            });
        }

        setTimeout(() => handleNext(val), 500);
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

    const difficultCardsCount = stack.cards.filter(c => c.lastRating !== undefined && c.lastRating < 2).length;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.01)', zIndex: 2000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem'
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
                                    <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Go through the entire stack ({stack.cards.length} cards)</div>
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
                    <div className="review-container" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>

                        {/* Top bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div className="neo-button" style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                                {currentIndex + 1} / {studyCards.length}
                            </div>
                            <div style={{ flex: 1 }} />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {user?.email === 'chethanincardland@gmail.com' && (
                                    <button className="neo-button icon-btn" title="Download Stack" onClick={handleDownload}><Download size={18} /></button>
                                )}
                                {!isPreviewMode && (!stack.isPublic || user?.email === 'chethanincardland@gmail.com') && stack.id !== 'demo-stack' && (
                                    <button className="neo-button icon-btn" title="Duplicate" onClick={() => onDuplicate(stack)}><Copy size={18} /></button>
                                )}
                                <button className="neo-button icon-btn" onClick={onClose}><X size={18} /></button>
                            </div>
                        </div>

                        {/* Card Flip Content */}
                        <div
                            style={{ perspective: '1000px', height: '380px', cursor: 'pointer' }}
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

                        {!isFlipped ? (
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
