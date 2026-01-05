import React, { useState, useEffect } from 'react';
import CloseButton from './common/CloseButton';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, ArrowRight, Mic, Trash2, Play, Square } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playTada, playSwoosh, playTing, playCompletion } from '../utils/soundEffects';

const DEMO_CARDS = [
    {
        id: 1,
        question: { text: "Which part of the human body has no blood supply?" },
        answer: { text: "Cornea" }
    },
    {
        id: 2,
        question: { text: "Which planet spins backwards?" },
        answer: { text: "Venus" }
    },
    {
        id: 3,
        question: { text: "How many hearts does an octopus have?" },
        answer: { text: "Three" }
    },
    {
        id: 4,
        question: { text: "Largest mammal?" },
        answer: { text: "Blue whale" }
    },
    {
        id: 5,
        question: { text: "Which everyday food never spoils naturally?" },
        answer: { text: "Honey" }
    }
];

const DemoReviewModal = ({ onClose, onLogin }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [rating, setRating] = useState(0);
    const [studyCards, setStudyCards] = useState(DEMO_CARDS);
    const [cardRatings, setCardRatings] = useState({}); // { cardId: rating }
    const [sessionResult, setSessionResult] = useState(null);
    const [showTooltips, setShowTooltips] = useState(true);

    const currentCard = studyCards[currentIndex];
    const isFirstCard = currentIndex === 0 && studyCards === DEMO_CARDS;

    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
    const recordedAudioRef = React.useRef(null);
    const mediaRecorderRef = React.useRef(null);
    const chunksRef = React.useRef([]);

    useEffect(() => {
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
            alert('Microphone access denied or not available.');
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
        playTada();
    }, []);

    const handleNext = (val) => {
        const newCardRatings = { ...cardRatings, [currentCard.id]: val };

        if (currentIndex === studyCards.length - 1) {
            // End of session
            setCardRatings(newCardRatings);
            calculateResults(newCardRatings);
        } else {
            setCardRatings(newCardRatings);
            setIsFlipped(false);
            setRating(0);
            deleteRecording();
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
            }, 100);
        }
    };

    const calculateResults = (finalRatings) => {
        const ratingValues = Object.values(finalRatings);
        const totalMarks = ratingValues.reduce((a, b) => a + b, 0);
        const maxPossibleMarks = studyCards.length * 2;
        const avg = (totalMarks / studyCards.length).toFixed(1);
        const lowRatedCards = studyCards.filter(card => finalRatings[card.id] < 2);

        setSessionResult({ avg, totalMarks, maxPossibleMarks, lowRatedCards });
        playCompletion();

        if (lowRatedCards.length === 0) {
            confetti({
                particleCount: 200,
                spread: 160,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FF4500', '#00FF7F', '#00BFFF', '#FF1493'],
                zIndex: 3001
            });
        }
    };

    const handleRating = (val) => {
        playTing();
        setRating(val);
        setShowTooltips(false); // Hide tooltips after first interaction
        setTimeout(() => handleNext(val), 500);
    };

    const restartSession = (cardsToUse) => {
        setStudyCards(cardsToUse);
        setCurrentIndex(0);
        setIsFlipped(false);
        setRating(0);
        setSessionResult(null);
        deleteRecording();
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.01)', zIndex: 3000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            {sessionResult ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="neo-flat"
                    style={{
                        width: '100%',
                        maxWidth: '420px',
                        padding: '2rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}
                >
                    <h2 style={{ fontSize: '1.8rem' }}>Study Summary</h2>

                    <div className="neo-flat" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                        <div style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: '0.5rem', fontWeight: 'bold' }}>SESSION MARKS</div>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            {sessionResult.totalMarks} <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>/ {sessionResult.maxPossibleMarks}</span>
                        </div>
                    </div>

                    {sessionResult.lowRatedCards.length > 0 ? (
                        <div className="neo-inset" style={{ padding: '1rem', borderRadius: '12px', textAlign: 'left' }}>
                            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>To Master:</p>
                            <p style={{ opacity: 0.8 }}>"Focus on Difficult Cards" helps you spend more time on what needs practice.</p>
                        </div>
                    ) : (
                        <div className="neo-inset" style={{ padding: '1rem', borderRadius: '12px' }}>
                            <p>That’s spaced repetition. You focus more on what you find difficult.</p>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                        {sessionResult.lowRatedCards.length > 0 && (
                            <button
                                className="neo-button"
                                style={{ justifyContent: 'center', padding: '1rem', background: 'var(--accent-color)', color: 'white', border: 'none' }}
                                onClick={() => restartSession(sessionResult.lowRatedCards)}
                            >
                                Focus on Difficult Cards ({sessionResult.lowRatedCards.length})
                            </button>
                        )}

                        <button className="neo-button" style={{ justifyContent: 'center', padding: '1rem' }} onClick={() => restartSession(DEMO_CARDS)}>
                            Try All Cards Again
                        </button>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                        <p style={{ marginBottom: '1rem', fontWeight: '500' }}>
                            {sessionResult.lowRatedCards.length === 0 && "This app helps you create and use flashcards to learn things by heart, completely free"}
                        </p>
                        <button
                            className="neo-button neo-glow-blue"
                            style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginBottom: '0.8rem' }}
                            onClick={onLogin}
                        >
                            Sign in with Google
                        </button>
                        <button
                            className="neo-button"
                            style={{ width: '100%', justifyContent: 'center', padding: '1rem', opacity: 0.7 }}
                            onClick={onClose}
                        >
                            Done for now
                        </button>
                    </div>
                </motion.div>
            ) : (
                <div className="review-container" style={{
                    width: '100%',
                    maxWidth: '560px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2rem',
                    position: 'relative',
                    padding: 'max(20px, 4vh) 30px',
                    maxHeight: '100%',
                    overflowY: 'auto'
                }}>

                    {/* Top bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div className="neo-button" style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                            {currentIndex + 1} / {studyCards.length}
                        </div>
                        <div className="neo-badge" style={{ padding: '4px 12px', fontSize: '0.75rem', background: 'var(--accent-soft)', color: 'var(--accent-color)', borderRadius: '12px', fontWeight: 'bold' }}>
                            DEMO MODE
                        </div>
                        <CloseButton onClick={onClose} size={18} />
                    </div>

                    {/* Card Flip Content */}
                    <div
                        style={{ perspective: '1000px', height: '380px', cursor: 'pointer', position: 'relative' }}
                        onClick={() => {
                            if (isFlipped) {
                                setIsFlipped(false);
                            }
                        }}
                    >
                        {/* Tooltip for first card front */}
                        <AnimatePresence>
                            {isFirstCard && !isFlipped && showTooltips && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="neo-flat"
                                    style={{
                                        position: 'absolute', top: '-70px', left: '50%', transform: 'translateX(-50%)',
                                        padding: '0.8rem 1.2rem',
                                        borderRadius: '12px',
                                        background: 'var(--bg-color)',
                                        border: '1px solid var(--accent-color)',
                                        zIndex: 10,
                                        pointerEvents: 'none',
                                        width: 'fit-content',
                                        maxWidth: '280px'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '-6px',
                                        left: '50%',
                                        transform: 'translateX(-50%) rotate(45deg)',
                                        width: '10px',
                                        height: '10px',
                                        background: 'var(--bg-color)',
                                        borderRight: '1px solid var(--accent-color)',
                                        borderBottom: '1px solid var(--accent-color)'
                                    }}></div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500', lineHeight: '1.4', color: 'var(--accent-color)', textAlign: 'center' }}>
                                        Try to answer in your head.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

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
                                padding: '2rem', textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.4, marginBottom: '1rem' }}>QUESTION</span>
                                <h2 style={{ fontSize: '1.6rem' }}>{currentCard.question.text}</h2>
                            </div>

                            {/* Back (Answer) */}
                            <div className="neo-flat" style={{
                                position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '2rem', textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.4, marginBottom: '1rem' }}>ANSWER</span>
                                <h2 style={{ fontSize: '1.6rem', color: 'var(--accent-color)' }}>{currentCard.answer.text}</h2>
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
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                className="neo-button neo-glow-blue"
                                style={{ width: '100%', justifyContent: 'center', padding: '1.2rem', fontSize: '1.1rem', background: 'var(--accent-color)', color: 'white', border: 'none' }}
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', position: 'relative' }}>
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

                            <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', zIndex: 20, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                    className="neo-button"
                                    style={{
                                        flex: 1, flexDirection: 'column', padding: '10px 5px',
                                        background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
                                        minWidth: '70px'
                                    }}
                                    onClick={(e) => { e.stopPropagation(); handleRating(-1); }}
                                >
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Wrong</span>
                                </button>

                                <button
                                    className="neo-button"
                                    style={{
                                        flex: 1, flexDirection: 'column', padding: '10px 5px',
                                        background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb',
                                        minWidth: '70px'
                                    }}
                                    onClick={(e) => { e.stopPropagation(); handleRating(0); }}
                                >
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Unsure</span>
                                </button>

                                <button
                                    className="neo-button"
                                    style={{
                                        flex: 1, flexDirection: 'column', padding: '10px 5px',
                                        background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd',
                                        minWidth: '70px'
                                    }}
                                    onClick={(e) => { e.stopPropagation(); handleRating(1); }}
                                >
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Partly</span>
                                </button>

                                <button
                                    className="neo-button"
                                    style={{
                                        flex: 1, flexDirection: 'column', padding: '10px 5px',
                                        background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0',
                                        minWidth: '70px'
                                    }}
                                    onClick={(e) => { e.stopPropagation(); handleRating(2); }}
                                >
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>By heart</span>
                                </button>
                            </div>

                            {/* Tooltip for rating - Only show instruction for first card in demo */}
                            {isFirstCard && (
                                <div className="neo-flat" style={{
                                    padding: '0.8rem 1.2rem',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    gap: '10px',
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--accent-color)',
                                    position: 'relative',
                                    marginTop: '10px'
                                }}>
                                    {/* Up Arrow */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '-6px',
                                        left: '50%',
                                        transform: 'translateX(-50%) rotate(45deg)',
                                        width: '10px',
                                        height: '10px',
                                        background: 'var(--bg-color)',
                                        borderLeft: '1px solid var(--accent-color)',
                                        borderTop: '1px solid var(--accent-color)'
                                    }}></div>

                                    <p style={{ opacity: 0.9, fontSize: '0.9rem', fontWeight: '500', margin: 0, color: 'var(--accent-color)' }}>
                                        Rating tells the app what you found difficult. Be honest. This helps you revise better.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DemoReviewModal;
