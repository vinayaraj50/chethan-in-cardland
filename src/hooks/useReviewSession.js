import { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { playTada, playSwoosh, playTing, playCompletion, playDopamine, playPartial } from '../utils/soundEffects';
import { saveStack } from '../services/googleDrive';
import { getRandomPhrase } from '../constants/phrases';

export const useReviewSession = ({
    stack,
    user,
    onUpdate,
    onClose,
    onDuplicate,
    showAlert,
    isPreviewMode = false,
    onLoginRequired,
    previewProgress = null,
    onReviewStart
}) => {
    // Determine initial state based on stack history or preview
    const hasPreviousRatings = stack.cards?.some(card => card.lastRating !== undefined) || false;

    // State
    const [showModeSelection, setShowModeSelection] = useState(hasPreviousRatings);
    const [currentIndex, setCurrentIndex] = useState(previewProgress?.currentIndex || 0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [rating, setRating] = useState(0);
    const [sessionRatings, setSessionRatings] = useState(previewProgress?.sessionRatings || []);
    const [studyCards, setStudyCards] = useState(hasPreviousRatings ? [] : (stack.cards || []));
    const [sessionResult, setSessionResult] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [masteredCount, setMasteredCount] = useState(0);
    const [firstRatings, setFirstRatings] = useState({});
    const [totalOriginalCards, setTotalOriginalCards] = useState(hasPreviousRatings ? 0 : (stack.cards?.length || 0));
    const [reviewedCountSession, setReviewedCountSession] = useState(0);

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
    const recordedAudioRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Derived State
    const currentCard = studyCards[currentIndex];

    // Effects
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

    useEffect(() => {
        if (!showModeSelection && !hasPreviousRatings && studyCards.length > 0) {
            playTada();
        }
    }, [showModeSelection, hasPreviousRatings, studyCards.length]);

    // Logic Functions
    const handleStartReview = useCallback((mode) => {
        let baseCards = [...(stack.cards || [])];

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
    }, [stack.cards]);

    const getNextInterval = (currentStage) => {
        const stages = [1, 3, 7, 30];
        if (currentStage >= stages.length - 1) return 30;
        return stages[currentStage + 1];
    };

    const handleNextSession = async () => {
        const val = rating;
        const isByHeart = val === 2;

        setFeedback(null);

        const newMasteredCount = isByHeart ? masteredCount + 1 : masteredCount;
        if (isByHeart) setMasteredCount(newMasteredCount);

        const isLast = newMasteredCount === totalOriginalCards;

        if (isLast) {
            // Calculate final results
            const finalRatings = studyCards.slice(0, totalOriginalCards).map((card) => {
                const cardId = card.id || card.question.text;
                return firstRatings[cardId] ?? 0;
            });

            const totalMarks = finalRatings.reduce((a, b) => a + b, 0);
            const maxPossibleMarks = totalOriginalCards * 2;
            const avg = (totalMarks / totalOriginalCards).toFixed(1);
            const fullMarks = totalMarks === maxPossibleMarks;

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
                    zIndex: 2001
                });
            }

            // Demo Mode Check: Don't save to drive if demo
            if (stack.id === 'demo-stack' || isPreviewMode) {
                return;
            }

            if (totalOriginalCards < stack.cards.length) {
                return;
            }

            // Update Progress Logic
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

            if (stack.ownedByMe && user) {
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

        if (firstRatings[cardId] === undefined) {
            setFirstRatings(prev => ({ ...prev, [cardId]: val }));
        }

        if (!isByHeart) {
            setStudyCards(prev => [...prev, currentCard]);
        }

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
                } else if (onUpdate) { // Weak check for showing alert
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

    // Audio Helpers
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

    return {
        // State
        showModeSelection,
        currentIndex,
        currentCard,
        isFlipped,
        rating,
        sessionResult,
        viewingImage,
        feedback,
        masteredCount,
        totalOriginalCards,
        studyCards,

        // Actions
        handleStartReview,
        handleNextSession,
        restartSession,
        handleRating,
        setIsFlipped,
        setViewingImage,

        // Audio
        isRecording,
        recordedAudio,
        isPlayingRecorded,
        startRecording,
        stopRecording,
        deleteRecording,
        toggleRecordedPlayback,

        // Computed
        difficultCardsCount: (stack.cards || []).filter(c => c.lastRating !== undefined && c.lastRating < 2).length
    };
};
