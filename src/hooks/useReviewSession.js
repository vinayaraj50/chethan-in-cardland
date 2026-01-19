import { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { playTada, playSwoosh, playTing, playCompletion, playDopamine, playPartial } from '../utils/soundEffects';
// 2026 Note: Drive interaction now managed via storageService
import { getRandomPhrase } from '../constants/phrases';

export const useReviewSession = ({
    lesson,
    user,
    onUpdate,
    onClose,
    showAlert,
    isPreviewMode = false,
    onLoginRequired,
    previewProgress = null,
    onReviewStart
}) => {
    // Determine initial state
    const questions = lesson.questions || lesson.cards || [];
    const hasPreviousRatings = questions.some(q => q.lastRating !== undefined) || false;

    // State
    const [showModeSelection, setShowModeSelection] = useState(hasPreviousRatings);
    const [currentIndex, setCurrentIndex] = useState(previewProgress?.currentIndex || 0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [rating, setRating] = useState(0);
    const [sessionRatings, setSessionRatings] = useState(previewProgress?.sessionRatings || []);
    const [studyQuestions, setStudyQuestions] = useState(hasPreviousRatings ? [] : questions);
    const [sessionResult, setSessionResult] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [masteredCount, setMasteredCount] = useState(0);
    const [firstRatings, setFirstRatings] = useState({});
    const [totalOriginalQuestions, setTotalOriginalQuestions] = useState(hasPreviousRatings ? 0 : questions.length);
    const [reviewedCountSession, setReviewedCountSession] = useState(0);

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
    const recordedAudioRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Derived State
    const currentQuestion = studyQuestions[currentIndex];

    // Effects
    useEffect(() => {
        if (sessionRatings.length > 0 && onReviewStart) {
            onReviewStart();
        }
    }, [sessionRatings, onReviewStart]);

    useEffect(() => {
        return () => {
            if (recordedAudioRef.current) {
                recordedAudioRef.current.pause();
                recordedAudioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!showModeSelection && !hasPreviousRatings && studyQuestions.length > 0) {
            playTada();
        }
    }, [showModeSelection, hasPreviousRatings, studyQuestions.length]);

    // Logic Functions
    const handleStartReview = useCallback((mode) => {
        const baseQuestions = [...(lesson.questions || lesson.cards || [])];

        baseQuestions.sort((a, b) => {
            const rA = a.lastRating !== undefined ? a.lastRating : -2;
            const rB = b.lastRating !== undefined ? b.lastRating : -2;
            return rA - rB;
        });

        let selected = [];
        if (mode === 'all') {
            selected = baseQuestions;
        } else if (mode === 'difficult') {
            selected = baseQuestions.filter(q => q.lastRating !== undefined && q.lastRating < 2);
        }

        setStudyQuestions(selected);
        setTotalOriginalQuestions(selected.length);
        setShowModeSelection(false);
        setCurrentIndex(0);
        setSessionRatings([]);
        setSessionResult(null);
        setMasteredCount(0);
        setFirstRatings({});
        setFeedback(null);
    }, [lesson.questions, lesson.cards]);

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

        const isLast = newMasteredCount === totalOriginalQuestions;

        if (isLast) {
            // Calculate final results
            const activeQuestions = studyQuestions.slice(0, totalOriginalQuestions);
            const finalRatings = activeQuestions.map((q) => {
                const qId = q.id || q.question.text;
                return firstRatings[qId] ?? 0;
            });

            const totalMarks = finalRatings.reduce((a, b) => a + b, 0);
            const maxPossibleMarks = totalOriginalQuestions * 2;
            const avg = totalOriginalQuestions > 0 ? (totalMarks / totalOriginalQuestions).toFixed(1) : 0;
            const fullMarks = totalMarks === maxPossibleMarks;

            const lessonQuestions = lesson.questions || lesson.cards || [];
            const lowRatedQuestions = lessonQuestions.filter((q) => {
                const qId = q.id || q.question.text;
                const r = firstRatings[qId];
                return r !== undefined && r < 2;
            });

            setSessionResult({
                avg,
                totalMarks,
                maxPossibleMarks,
                fullMarks,
                lowRatedQuestions
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

            // Demo Mode Check
            if (lesson.id === 'demo-lesson' || isPreviewMode) {
                return;
            }

            if (totalOriginalQuestions < lessonQuestions.length) {
                return;
            }

            // Update Progress Logic
            const updatedQuestions = lessonQuestions.map((q) => {
                const qId = q.id || q.question.text;
                const fRating = firstRatings[qId];
                if (fRating !== undefined) {
                    return { ...q, lastRating: fRating };
                }
                return q;
            });

            const currentStage = lesson.reviewStage || -1;
            let nextReviewDate = new Date();
            let nextStage = currentStage;

            if (avg >= 1.5) {
                nextStage = currentStage + 1;
                const daysToAdd = getNextInterval(nextStage);
                nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
            } else {
                nextStage = -1;
            }

            const updatedLesson = {
                ...lesson,
                questions: updatedQuestions,
                lastMarks: totalMarks,
                questionCountAtLastReview: totalOriginalQuestions,
                lastReviewed: new Date().toLocaleDateString(),
                nextReview: nextReviewDate.toISOString(),
                reviewStage: nextStage
            };

            // 2026 Strategy: Use authoritative onUpdate pipeline.
            // This ensures both Local + Drive stay in sync via storageService.
            onUpdate(updatedLesson);
        } else {
            setIsFlipped(false);
            setRating(0);
            deleteRecording();
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
            }, 100);
        }
    };

    const restartSession = (questionsToUse) => {
        setStudyQuestions(questionsToUse);
        setTotalOriginalQuestions(questionsToUse.length);
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

        const qId = currentQuestion.id || currentQuestion.question.text;

        if (firstRatings[qId] === undefined) {
            setFirstRatings(prev => ({ ...prev, [qId]: val }));
        }

        if (!isByHeart) {
            setStudyQuestions(prev => [...prev, currentQuestion]);
        }

        const msg = customFeedbackMsg || getRandomPhrase(isByHeart ? 'mastered' : 'retry');
        setFeedback({ message: msg, type: isByHeart ? 'success' : 'retry' });

        // Preview Limit Logic
        const isPublicOrDemo = lesson.isPublic || lesson.id === 'demo-lesson';
        const isOwnedByMe = lesson.ownedByMe;

        if (isPublicOrDemo && !isOwnedByMe) {
            const nextIndex = currentIndex + 1;
            const limit = 10;
            if (nextIndex >= limit) {
                if (!user) {
                    if (onLoginRequired) {
                        onLoginRequired({
                            lesson,
                            currentIndex: nextIndex,
                            sessionRatings: [...sessionRatings, val]
                        });
                    }
                } else if (onUpdate) {
                    showAlert({
                        type: 'confirm',
                        message: "You've reached the preview limit. Add this lesson to 'My Lessons' to continue?",
                        onConfirm: () => {
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

    const lessonQuestions = lesson.questions || lesson.cards || [];

    return {
        // State
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
        difficultQuestionsCount: lessonQuestions.filter(q => q.lastRating !== undefined && q.lastRating < 2).length
    };
};
