import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Image as ImageIcon, Plus, Trash2, Share2, Copy, Save, Check, Play, Square, Pause, ChevronDown } from 'lucide-react';
import { saveStack, shareStack } from '../services/googleDrive';
import ImageViewer from './ImageViewer';
import { AnimatePresence } from 'framer-motion';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem', width: '100%', maxWidth: '250px' }}>
            <button
                className="neo-button icon-btn"
                onClick={togglePlay}
                style={{ width: '30px', height: '30px', background: 'var(--accent-soft)', color: 'var(--accent-color)', borderRadius: '50%', flexShrink: 0 }}
            >
                {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            </button>
            <button
                className="neo-button icon-btn"
                onClick={stopAudio}
                style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0 }}
            >
                <Square size={10} fill="currentColor" />
            </button>
            <div
                ref={progressBarRef}
                className="neo-inset"
                onClick={handleSeek}
                style={{ flex: 1, height: '6px', borderRadius: '3px', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
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

const AddStackModal = ({ user, stack, onClose, onSave, onDuplicate, onDelete, showAlert, showConfirm, availableLabels }) => {
    const [title, setTitle] = useState(stack?.title || '');
    const [titleImage, setTitleImage] = useState(stack?.titleImage || '');
    const [label, setLabel] = useState(stack?.label || 'No label');
    const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);
    const [newLabelInput, setNewLabelInput] = useState('');
    const [cards, setCards] = useState(stack?.cards || [{ id: Date.now(), question: { text: '', image: '', audio: '' }, answer: { text: '', image: '', audio: '' } }]);
    const [showShare, setShowShare] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [shareRole, setShareRole] = useState('reader');
    const [viewingImage, setViewingImage] = useState(null);

    // Recording state
    const [recording, setRecording] = useState(null); // { id, field }
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef(null);

    const handleAddCard = () => {
        setCards([...cards, { id: Date.now(), question: { text: '', image: '', audio: '' }, answer: { text: '', image: '', audio: '' } }]);
    };

    const handleRemoveCard = (id) => {
        if (cards.length > 1) {
            setCards(cards.filter(c => c.id !== id));
        }
    };

    const handleUpdateCard = (id, field, value) => {
        setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleFileUpload = (e, callback) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            callback(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const startRecording = async (id, field) => {
        // Set recording state immediately for instant UI feedback
        setRecording({ id, field });
        setRecordingTime(0);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    // Use functional update to avoid stale closure
                    setCards(prevCards => {
                        return prevCards.map(c => {
                            if (c.id === id) {
                                return {
                                    ...c,
                                    [field]: { ...c[field], audio: reader.result }
                                };
                            }
                            return c;
                        });
                    });
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(track => track.stop());
                clearInterval(timerRef.current);
                setRecordingTime(0);
            };

            recorder.start();
            setMediaRecorder(recorder);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            showAlert('Could not access microphone.');
            // Clear recording state on error
            setRecording(null);
            setRecordingTime(0);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setMediaRecorder(null);
            setRecording(null);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.onstop = () => {
                clearInterval(timerRef.current);
                setRecordingTime(0);
                setMediaRecorder(null);
                setRecording(null);
            };
            mediaRecorder.stop();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSave = async () => {
        if (!title) return showAlert('Please enter a title');

        const newStack = {
            id: stack?.id || Date.now().toString(),
            title,
            titleImage,
            label,
            cards,
            owner: user.email,
            avgRating: stack?.avgRating || null,
            lastReviewed: stack?.lastReviewed || null,
        };

        try {
            await saveStack(user.token, newStack, stack?.driveFileId);
            onSave();
        } catch (error) {
            console.error('Error saving stack:', error);
            showAlert('Failed to save stack.');
        }
    };

    const handleShare = async () => {
        if (showShare) return setShowShare(false);
        setShowShare(true);
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
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div className="modal-content neo-flat" style={{
                width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem',
                display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative'
            }}>
                {/* Header Icons */}
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                    {stack && <button className={`neo-button icon-btn ${showShare ? 'neo-inset' : ''}`} title="Share" onClick={handleShare}><Share2 size={18} /></button>}
                    {stack && <button className="neo-button icon-btn" title="Duplicate" onClick={() => onDuplicate(stack)}><Copy size={18} /></button>}
                    <button className="neo-button icon-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <h2 style={{ fontSize: '1.5rem' }}>{stack ? 'Edit Stack' : 'New Flashcard Stack'}</h2>

                {/* Share UI */}
                {showShare && (
                    <div className="neo-inset" style={{ padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Collaborate</div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                className="neo-input"
                                placeholder="Email address"
                                value={shareEmail}
                                onChange={(e) => setShareEmail(e.target.value)}
                            />
                            <select className="neo-select" style={{ width: '100px' }} value={shareRole} onChange={(e) => setShareRole(e.target.value)}>
                                <option value="reader">Read</option>
                                <option value="writer">Edit</option>
                            </select>
                            <button className="neo-button" onClick={executeShare}>Add</button>
                        </div>
                    </div>
                )}

                {/* Title Image Upload */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="neo-inset" style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                        {titleImage ? (
                            <img
                                src={titleImage}
                                alt="Title"
                                style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                                onClick={() => setViewingImage(titleImage)}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                <ImageIcon size={32} />
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontWeight: '600', opacity: 0.7 }}>Title & Cover Image</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                className="neo-input"
                                placeholder="Stack Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <label className="neo-button icon-btn" style={{ cursor: 'pointer', flexShrink: 0 }}>
                                <ImageIcon size={18} />
                                <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, setTitleImage)} />
                            </label>
                        </div>

                        {/* Custom Label Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button
                                className="neo-select"
                                style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                                onClick={() => setIsLabelDropdownOpen(!isLabelDropdownOpen)}
                            >
                                <span style={{ fontSize: '0.9rem', opacity: label === 'No label' ? 0.5 : 1 }}>{label}</span>
                                <ChevronDown size={16} style={{ transform: isLabelDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                            </button>

                            {isLabelDropdownOpen && (
                                <div className="neo-flat" style={{
                                    position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '8px',
                                    zIndex: 100, padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px',
                                    maxHeight: '250px', overflowY: 'auto'
                                }}>
                                    {/* Add New Label Input */}
                                    <div style={{ display: 'flex', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--shadow-dark)' }}>
                                        <input
                                            className="neo-input"
                                            placeholder="Create new label..."
                                            value={newLabelInput}
                                            onChange={(e) => setNewLabelInput(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && newLabelInput.trim()) {
                                                    setLabel(newLabelInput.trim());
                                                    setNewLabelInput('');
                                                    setIsLabelDropdownOpen(false);
                                                }
                                            }}
                                            style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px' }}
                                        />
                                        <button
                                            className="neo-button"
                                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                            onClick={() => {
                                                if (newLabelInput.trim()) {
                                                    setLabel(newLabelInput.trim());
                                                    setNewLabelInput('');
                                                    setIsLabelDropdownOpen(false);
                                                }
                                            }}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    {/* No Label Option */}
                                    <div
                                        className={`neo-button ${label === 'No label' ? 'neo-inset' : ''}`}
                                        style={{
                                            padding: '10px', fontSize: '0.9rem', cursor: 'pointer',
                                            boxShadow: label === 'No label' ? 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)' : 'none',
                                            background: label === 'No label' ? 'var(--accent-soft)' : 'transparent',
                                            border: 'none', borderRadius: '8px', width: '100%', textAlign: 'left'
                                        }}
                                        onClick={() => { setLabel('No label'); setIsLabelDropdownOpen(false); }}
                                    >
                                        No label
                                    </div>

                                    {/* Existing Labels */}
                                    {availableLabels.map(lbl => (
                                        <div
                                            key={lbl}
                                            className={`neo-button ${label === lbl ? 'neo-inset' : ''}`}
                                            style={{
                                                padding: '10px', fontSize: '0.9rem', cursor: 'pointer',
                                                boxShadow: label === lbl ? 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)' : 'none',
                                                background: label === lbl ? 'var(--accent-soft)' : 'transparent',
                                                border: 'none', borderRadius: '8px', width: '100%', textAlign: 'left'
                                            }}
                                            onClick={() => { setLabel(lbl); setIsLabelDropdownOpen(false); }}
                                        >
                                            {lbl}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {cards.map((card, index) => (
                        <div key={card.id} className="neo-inset" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                <button className="neo-button icon-btn" style={{ width: '30px', height: '30px' }} onClick={() => handleRemoveCard(card.id)}>
                                    <Trash2 size={14} color="var(--error-color)" />
                                </button>
                            </div>

                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', opacity: 0.5 }}>CARD {index + 1}</div>

                            {/* Question Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>QUESTION</span>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {!recording ? (
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button
                                                    className="neo-button icon-btn"
                                                    style={{ width: '32px', height: '32px', color: card.question.audio ? 'var(--accent-color)' : 'currentColor' }}
                                                    onClick={() => startRecording(card.id, 'question')}
                                                >
                                                    <Mic size={14} />
                                                </button>
                                                {card.question.audio && (
                                                    <button className="neo-button icon-btn" style={{ width: '32px', height: '32px' }} onClick={() => handleUpdateCard(card.id, 'question', { ...card.question, audio: '' })}>
                                                        <Trash2 size={12} color="var(--error-color)" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : recording.id === card.id && recording.field === 'question' ? (
                                            <div className="neo-flat" style={{
                                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10,
                                                borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '1rem',
                                                background: 'var(--bg-color)'
                                            }}>
                                                <div style={{ width: '10px', height: '10px', background: 'red', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                                                <span style={{ flex: 1, fontWeight: '600' }}>Recording... {formatTime(recordingTime)}</span>
                                                <button className="neo-button icon-btn" title="Cancel" style={{ width: '32px', height: '32px' }} onClick={cancelRecording}>
                                                    <X size={14} color="var(--error-color)" />
                                                </button>
                                                <button className="neo-button icon-btn" title="Stop & Save" style={{ width: '32px', height: '32px' }} onClick={stopRecording}>
                                                    <Check size={14} color="var(--accent-color)" />
                                                </button>
                                            </div>
                                        ) : null}

                                        <label className="neo-button icon-btn" style={{ width: '32px', height: '32px', cursor: 'pointer' }}>
                                            <ImageIcon size={14} color={card.question.image ? 'var(--accent-color)' : 'currentColor'} />
                                            <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, (data) => handleUpdateCard(card.id, 'question', { ...card.question, image: data }))} />
                                        </label>
                                    </div>
                                </div>
                                {card.question.image && (
                                    <div style={{ position: 'relative', width: '100%', maxHeight: '150px' }}>
                                        <img
                                            src={card.question.image}
                                            style={{ width: '100%', height: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px', cursor: 'pointer' }}
                                            onClick={() => setViewingImage(card.question.image)}
                                        />
                                        <button
                                            className="neo-button icon-btn"
                                            style={{ position: 'absolute', top: '5px', right: '5px', width: '24px', height: '24px' }}
                                            onClick={() => handleUpdateCard(card.id, 'question', { ...card.question, image: '' })}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                                <textarea
                                    className="neo-input"
                                    rows="1"
                                    placeholder="The question..."
                                    value={card.question.text}
                                    onChange={(e) => handleUpdateCard(card.id, 'question', { ...card.question, text: e.target.value })}
                                />
                                {card.question.audio && (
                                    <AudioPlayer audioData={card.question.audio} />
                                )}
                            </div>

                            {/* Answer Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>ANSWER</span>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {!recording ? (
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button
                                                    className="neo-button icon-btn"
                                                    style={{ width: '32px', height: '32px', color: card.answer.audio ? 'var(--accent-color)' : 'currentColor' }}
                                                    onClick={() => startRecording(card.id, 'answer')}
                                                >
                                                    <Mic size={14} />
                                                </button>
                                                {card.answer.audio && (
                                                    <button className="neo-button icon-btn" style={{ width: '32px', height: '32px' }} onClick={() => handleUpdateCard(card.id, 'answer', { ...card.answer, audio: '' })}>
                                                        <Trash2 size={12} color="var(--error-color)" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : recording.id === card.id && recording.field === 'answer' ? (
                                            <div className="neo-flat" style={{
                                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10,
                                                borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '1rem',
                                                background: 'var(--bg-color)'
                                            }}>
                                                <div style={{ width: '10px', height: '10px', background: 'red', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                                                <span style={{ flex: 1, fontWeight: '600' }}>Recording... {formatTime(recordingTime)}</span>
                                                <button className="neo-button icon-btn" title="Cancel" style={{ width: '32px', height: '32px' }} onClick={cancelRecording}>
                                                    <X size={14} color="var(--error-color)" />
                                                </button>
                                                <button className="neo-button icon-btn" title="Stop & Save" style={{ width: '32px', height: '32px' }} onClick={stopRecording}>
                                                    <Check size={14} color="var(--accent-color)" />
                                                </button>
                                            </div>
                                        ) : null}
                                        <label className="neo-button icon-btn" style={{ width: '32px', height: '32px', cursor: 'pointer' }}>
                                            <ImageIcon size={14} color={card.answer.image ? 'var(--accent-color)' : 'currentColor'} />
                                            <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, (data) => handleUpdateCard(card.id, 'answer', { ...card.answer, image: data }))} />
                                        </label>
                                    </div>
                                </div>
                                {card.answer.image && (
                                    <div style={{ position: 'relative', width: '100%', maxHeight: '150px' }}>
                                        <img
                                            src={card.answer.image}
                                            style={{ width: '100%', height: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px', cursor: 'pointer' }}
                                            onClick={() => setViewingImage(card.answer.image)}
                                        />
                                        <button
                                            className="neo-button icon-btn"
                                            style={{ position: 'absolute', top: '5px', right: '5px', width: '24px', height: '24px' }}
                                            onClick={() => handleUpdateCard(card.id, 'answer', { ...card.answer, image: '' })}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                                <textarea
                                    className="neo-input"
                                    rows="1"
                                    placeholder="The answer..."
                                    value={card.answer.text}
                                    onChange={(e) => handleUpdateCard(card.id, 'answer', { ...card.answer, text: e.target.value })}
                                />
                                {card.answer.audio && (
                                    <AudioPlayer audioData={card.answer.audio} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <button className="neo-button neo-glow-blue" style={{ justifyContent: 'center', background: 'var(--accent-soft)', color: 'var(--accent-color)' }} onClick={handleAddCard}>
                    <Plus size={18} /> Add More Q&A
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {stack && (
                            <button className="neo-button neo-glow-red" style={{ flex: 1, justifyContent: 'center', color: 'var(--error-color)' }} onClick={() => onDelete(stack)}>
                                <Trash2 size={18} /> Delete Stack
                            </button>
                        )}
                        <button className="neo-button" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                    <button className="neo-button" style={{ justifyContent: 'center', background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.8rem' }} onClick={handleSave}>
                        <Save size={18} /> {stack ? 'Save Changes' : 'Create Stack'}
                    </button>
                </div>

                {/* Collaboration Popup */}
                {showShare && (
                    <div className="neo-flat" style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: '80%', padding: '1.5rem', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}>
                        <h3>Collaborate</h3>
                        <input
                            className="neo-input"
                            placeholder="Enter Gmail ID"
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label><input type="radio" name="role" checked={shareRole === 'reader'} onChange={() => setShareRole('reader')} /> View Only</label>
                            <label><input type="radio" name="role" checked={shareRole === 'writer'} onChange={() => setShareRole('writer')} /> Edit</label>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="neo-button" style={{ flex: 1 }} onClick={handleShare}>Send Notification</button>
                            <button className="neo-button" onClick={() => setShowShare(false)}>Close</button>
                        </div>
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
        </div >
    );
};

export default AddStackModal;
