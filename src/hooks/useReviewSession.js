import { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { playTada, playSwoosh, playTing, playCompletion, playDopamine, playPartial } from '../utils/soundEffects';
// 2026 Note: Drive interaction now managed via storageService
import { getRandomPhrase } from '../constants/phrases';
import { userService } from '../services/userService';

export const useReviewSession = ({
    lesson,
    user,
    onUpdate,
    onClose,
    showAlert,
    onReviewStart
}) => {
    // Determine initial state
    const questions = lesson.questions || lesson.cards || [];
    const hasPreviousRatings = questions.some(q => q.lastRating !== undefined) || false;

    // Check if there's an interrupted session (has lastSessionIndex saved)
    const hasInterruptedSession = lesson.lastSessionIndex !== undefined;

    // State - Always show start screen now for options
    const [showStartScreen, setShowStartScreen] = useState(true);
    const [showModeSelection, setShowModeSelection] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [rating, setRating] = useState(0);
    const [sessionRatings, setSessionRatings] = useState([]);
    const [studyQuestions, setStudyQuestions] = useState([]);
    const [sessionResult, setSessionResult] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [masteredCount, setMasteredCount] = useState(0);
    const [firstRatings, setFirstRatings] = useState({});
    const [totalOriginalQuestions, setTotalOriginalQuestions] = useState(0);
    const [reviewedCountSession, setReviewedCountSession] = useState(0);

    // Section Notes Toggle (persisted preference)
    const [showSectionNotes, setShowSectionNotes] = useState(
        lesson.showSectionNotes !== undefined ? lesson.showSectionNotes : !lesson.lastReviewed
    );

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
    const recordedAudioRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Ref to track if progress was saved on this session close
    const progressSavedRef = useRef(false);

    // Refs to hold latest state for unmount saving (Prevent Recursion)
    const latestStateRef = useRef({
        lesson,
        firstRatings,
        reviewedCountSession,
        currentIndex,
        rating,
        showSectionNotes,
        onUpdate
    });

    // Update refs on change
    useEffect(() => {
        latestStateRef.current = {
            lesson,
            firstRatings,
            reviewedCountSession,
            currentIndex,
            rating,
            showSectionNotes,
            onUpdate
        };
    }, [lesson, firstRatings, reviewedCountSession, currentIndex, rating, showSectionNotes, onUpdate]);

    // Derived State
    const currentQuestion = studyQuestions[currentIndex];

    // Difficult questions count for UI
    const lessonQuestions = lesson.questions || lesson.cards || [];
    const difficultQuestionsCount = lessonQuestions.filter(q => q.lastRating !== undefined && q.lastRating < 2).length;

    // Save partial progress function
    const savePartialProgress = useCallback(() => {
        // Only save if at least 1 question was reviewed and lesson is owned (not public)
        if (reviewedCountSession < 1 || lesson.isPublic) {
            return;
        }

        // If current question is flipped/rated, we should resume at the next index
        const resumeIndex = rating !== 0 ? currentIndex + 1 : currentIndex;

        // Update question ratings from this session
        const updatedQuestions = (lesson.questions || lesson.cards || []).map((q) => {
            const qId = q.id || q.question?.text;
            const fRating = firstRatings[qId];
            if (fRating !== undefined) {
                return { ...q, lastRating: fRating };
            }
            return q;
        });

        const updatedLesson = {
            ...lesson,
            questions: updatedQuestions,
            // Save session index for potential resume
            lastSessionIndex: resumeIndex,
            // Mark as partially reviewed
            partialReviewDate: new Date().toISOString(),
            // Persist section notes preference
            showSectionNotes
        };

        onUpdate(updatedLesson);
    }, [lesson, firstRatings, reviewedCountSession, currentIndex, rating, showSectionNotes, onUpdate]);

    // Handle close with progress save
    const handleCloseWithSave = useCallback(() => {
        if (!progressSavedRef.current) {
            savePartialProgress();
            progressSavedRef.current = true;
        }
        onClose();
    }, [savePartialProgress, onClose]);

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

    // Effect for saving on browser/tab close (beforeunload) and component unmount
    // Uses refs to avoid infinite recursion/re-initialization loops
    useEffect(() => {
        const performSave = () => {
            const state = latestStateRef.current;

            // Only save if at least 1 question was reviewed and lesson is owned (not public)
            // And prevent double save if handleCloseWithSave was already called
            if (state.reviewedCountSession >= 1 && !state.lesson.isPublic && !progressSavedRef.current) {
                const resumeIndex = state.rating !== 0 ? state.currentIndex + 1 : state.currentIndex;

                const updatedQuestions = (state.lesson.questions || state.lesson.cards || []).map((q) => {
                    const qId = q.id || q.question?.text;
                    const fRating = state.firstRatings[qId];
                    if (fRating !== undefined) {
                        return { ...q, lastRating: fRating };
                    }
                    return q;
                });

                const updatedLesson = {
                    ...state.lesson,
                    questions: updatedQuestions,
                    // Save session index for potential resume
                    lastSessionIndex: resumeIndex,
                    // Mark as partially reviewed
                    partialReviewDate: new Date().toISOString(),
                    // Persist section notes preference
                    showSectionNotes: state.showSectionNotes
                };

                // Call the updater
                if (state.onUpdate) {
                    state.onUpdate(updatedLesson);
                }
                progressSavedRef.current = true;
            }
        };

        const handleBeforeUnload = (e) => {
            performSave();

            // If we have pending syncs or are in the middle of a session with unrated cards,
            // ask for confirmation to prevent progress loss.
            if (storageService.hasPendingSyncs?.() || (latestStateRef.current.reviewedCountSession > 0 && !progressSavedRef.current)) {
                e.preventDefault();
                e.returnValue = ''; // Modern browser standard for showing close confirmation
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Save on unmount (internal app navigation)
            performSave();
        };
    }, []); // Empty dependency array ensures this effect only runs on mount/unmount

    useEffect(() => {
        if (!showStartScreen && !showModeSelection && studyQuestions.length > 0) {
            playTada();
        }
    }, [showStartScreen, showModeSelection, studyQuestions.length]);

    // Logic Functions
    const handleStartReview = useCallback((mode, options = {}) => {
        const { resumeFromIndex = 0 } = options;
        const baseQuestions = [...(lesson.questions || lesson.cards || [])];

        // Sort by lastRating (difficult first)
        baseQuestions.sort((a, b) => {
            const rA = a.lastRating !== undefined ? a.lastRating : -2;
            const rB = b.lastRating !== undefined ? b.lastRating : -2;
            return rA - rB;
        });

        let selected = [];
        if (mode === 'all' || mode === 'resume') {
            selected = baseQuestions;
        } else if (mode === 'difficult') {
            selected = baseQuestions.filter(q => q.lastRating !== undefined && q.lastRating < 2);
        }

        const startIndex = mode === 'resume' ? Math.min(resumeFromIndex, selected.length - 1) : 0;

        setStudyQuestions(selected);
        setTotalOriginalQuestions(selected.length);
        setShowStartScreen(false);
        setShowModeSelection(false);
        setCurrentIndex(startIndex);
        setSessionRatings([]);
        setSessionResult(null);
        setMasteredCount(mode === 'resume' ? startIndex : 0);
        setFirstRatings({});
        setFeedback(null);
        setReviewedCountSession(0);
        progressSavedRef.current = false;

        // Clear the interrupted session marker
        if (mode === 'all' && lesson.lastSessionIndex !== undefined) {
            const clearedLesson = { ...lesson, lastSessionIndex: undefined };
            onUpdate(clearedLesson);
        }
    }, [lesson, onUpdate]);

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

            setSessionResult({
                avg,
                totalMarks,
                maxPossibleMarks,
                fullMarks,
                lowRatedQuestions,
                nextReviewDate: nextReviewDate.toLocaleDateString()
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

            // Ownership Check
            if (lesson.isPublic) {
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

            const updatedLesson = {
                ...lesson,
                questions: updatedQuestions,
                lastMarks: totalMarks,
                questionCountAtLastReview: totalOriginalQuestions,
                lastReviewed: new Date().toLocaleDateString(),
                nextReview: nextReviewDate.toISOString(),
                reviewStage: nextStage,
                showSectionNotes: false // Reset for next revision to save time
            };

            // 2026 Strategy: Use authoritative onUpdate pipeline.
            // This ensures both Local + Drive stay in sync via storageService.
            onUpdate(updatedLesson);

            // Check and reward referral completion (if applicable)
            // Only for qualified lessons (non-demo, non-user-created)
            if (user?.uid) {
                const isDemo = lesson.id === 'demo-lesson';
                const isUserCreated = !lesson.lessonId && !lesson.storagePath; // User-created lessons don't have these

                try {
                    const result = await userService.checkReferralCompletion(
                        user.uid,
                        lesson.id || lesson.lessonId,
                        isDemo,
                        isUserCreated
                    );

                    if (result.rewarded && showAlert) {
                        showAlert({
                            type: 'success',
                            message: `Congratulations! Your referrer received ${result.bonus} coins for your first lesson completion! 🎉`
                        });
                    }
                } catch (error) {
                    console.error('[ReferralCheck] Error:', error);
                    // Silent fail - don't interrupt user experience
                }
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
        // Reset notes toggle to OFF when restarting for revision
        setShowSectionNotes(false);
    };

    const [streakCount, setStreakCount] = useState(0);

    // ... (rest of state)

    const handleRating = (val, customFeedbackMsg = null) => {
        const isByHeart = val === 2;
        const isPartial = val === 1;

        if (isByHeart) {
            playDopamine();
            setStreakCount(prev => prev + 1);
        } else if (isPartial) {
            playPartial();
            setStreakCount(0);
        } else {
            playTing();
            setStreakCount(0);
        }
        setRating(val);

        const qId = currentQuestion.id || currentQuestion.question.text;

        if (firstRatings[qId] === undefined) {
            setFirstRatings(prev => ({ ...prev, [qId]: val }));
        }

        if (!isByHeart) {
            setStudyQuestions(prev => [...prev, currentQuestion]);
        }

        // Determine context for feedback
        let type = 'retry';
        if (isByHeart) type = 'success';
        else if (isPartial) type = 'partial';

        const context = {
            type,
            isFirstQuestion: currentIndex === 0 && reviewedCountSession === 0,
            streakCount: isByHeart ? streakCount + 1 : 0
        };

        const msg = customFeedbackMsg || getRandomPhrase(context);
        setFeedback({ message: msg, type: isByHeart ? 'success' : 'retry' });

        setReviewedCountSession(prev => prev + 1);

        // 2026 Strategy: Save on every flip (Netflix-style)
        // This is non-blocking due to the SyncQueue in storageService
        savePartialProgress();
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
        showSectionNotes,
        hasInterruptedSession,
        lessonTitle: lesson.title || 'Untitled Lesson',
        lastSessionIndex: lesson.lastSessionIndex,

        // Actions
        handleStartReview,
        handleNextSession,
        restartSession,
        handleRating,
        setIsFlipped,
        setViewingImage,
        handleCloseWithSave,
        setShowSectionNotes,

        // Audio
        isRecording,
        recordedAudio,
        isPlayingRecorded,
        startRecording,
        stopRecording,
        deleteRecording,
        toggleRecordedPlayback,

        // Computed
        difficultQuestionsCount
    };
};
