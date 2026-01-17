import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Trash2, Play } from 'lucide-react';
import { playSwoosh } from '../../utils/soundEffects';

const ReviewControls = ({
    isFlipped,
    currentCard,
    isRecording,
    recordedAudio,
    isPlayingRecorded,
    startRecording,
    stopRecording,
    deleteRecording,
    toggleRecordedPlayback,
    setIsFlipped,
    handleRating,
    feedback
}) => {
    if (isFlipped || !currentCard || currentCard.type === 'mcq') {
        // Show Rating Controls or Feedback
        if (feedback) return null; // Feedback is handled by parent overlay or separate component?
        // Parent handles feedback overlay replacement.

        if (isFlipped) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', minHeight: '5rem', justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                        {currentCard.type !== 'mcq' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                                <div className="neo-flat" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderRadius: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '0.6rem', height: '0.6rem', borderRadius: '50%', background: 'var(--accent-color)', opacity: 0.6 }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.7 }}>
                                            SELECT MATCHING ANSWER
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        {recordedAudio && (
                                            <button
                                                className="neo-button icon-btn"
                                                onClick={toggleRecordedPlayback}
                                                style={{ color: 'var(--accent-color)', width: '2rem', height: '2rem' }}
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
                                            flex: 1, flexDirection: 'column', padding: '0.75rem 0.25rem',
                                            background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
                                            minWidth: '4rem', borderRadius: '0.75rem'
                                        }}
                                        onClick={(e) => { e.stopPropagation(); handleRating(-1); }}
                                    >
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Wrong</span>
                                    </button>

                                    <button
                                        className="neo-button"
                                        style={{
                                            flex: 1, flexDirection: 'column', padding: '0.75rem 0.25rem',
                                            background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb',
                                            minWidth: '4rem', borderRadius: '0.75rem'
                                        }}
                                        onClick={(e) => { e.stopPropagation(); handleRating(0); }}
                                    >
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Unsure</span>
                                    </button>

                                    <button
                                        className="neo-button"
                                        style={{
                                            flex: 1, flexDirection: 'column', padding: '0.75rem 0.25rem',
                                            background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd',
                                            minWidth: '4rem', borderRadius: '0.75rem'
                                        }}
                                        onClick={(e) => { e.stopPropagation(); handleRating(1); }}
                                    >
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Partly</span>
                                    </button>

                                    <button
                                        className="neo-button"
                                        style={{
                                            flex: 1, flexDirection: 'column', padding: '0.75rem 0.25rem',
                                            background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0',
                                            minWidth: '4rem', borderRadius: '0.75rem'
                                        }}
                                        onClick={(e) => { e.stopPropagation(); handleRating(2); }}
                                    >
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>By heart</span>
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </AnimatePresence>
                </div>
            );
        }
    }

    // Default: Show Answer / Record UI
    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Record Answer UI */}
            <div className="neo-flat" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '0.6rem', height: '0.6rem', borderRadius: '50%',
                        background: isRecording ? '#ff4444' : '#ccc',
                        boxShadow: isRecording ? '0 0 0.5rem #ff4444' : 'none',
                        animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                    }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.7 }}>
                        {isRecording ? 'RECORDING ANSWER...' : recordedAudio ? 'ANSWER RECORDED' : 'RECORD YOUR ANSWER'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {!isRecording && !recordedAudio ? (
                        <button className="neo-button icon-btn" onClick={startRecording} style={{ color: 'var(--accent-color)', width: '2.25rem', height: '2.25rem' }}>
                            <Mic size={18} />
                        </button>
                    ) : isRecording ? (
                        <button className="neo-button icon-btn" onClick={stopRecording} style={{ color: '#ff4444', width: '2.25rem', height: '2.25rem' }}>
                            <Square size={18} fill="currentColor" />
                        </button>
                    ) : (
                        <>
                            <button className="neo-button icon-btn" onClick={deleteRecording} style={{ color: '#ff4444', width: '2.25rem', height: '2.25rem' }}>
                                <Trash2 size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <button
                className="neo-button neo-glow-blue"
                style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem', background: 'var(--accent-color)', color: 'white', minHeight: '3.75rem', borderRadius: '1rem' }}
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
    );
};

export default ReviewControls;
