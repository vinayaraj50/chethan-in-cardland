import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Image as ImageIcon, Plus, Trash2, Copy, Save, Check, Play, Square, Pause, ChevronDown, Download, Upload, Split, Merge } from 'lucide-react';
import { signIn } from '../services/googleAuth';
import { saveStack, deleteStack } from '../services/googleDrive';
import { downloadStackAsZip, uploadStackFromZip } from '../utils/zipUtils';
import { validateDataURI, sanitizeText } from '../utils/securityUtils';
import ImageViewer from './ImageViewer';
import { AnimatePresence } from 'framer-motion';
import NeoDropdown from './NeoDropdown';

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

const AddStackModal = ({
    user, stack, onClose, onSave, onDuplicate, onDelete,
    showAlert, showConfirm, availableLabels, allStacks,
    publicFolderId, activeTab, defaultMetadata
}) => {
    const [title, setTitle] = useState(stack?.title || '');
    const [titleImage, setTitleImage] = useState(stack?.titleImage || '');
    const [label, setLabel] = useState(stack?.label || 'No label');
    const [newLabelInput, setNewLabelInput] = useState('');
    const [cards, setCards] = useState(stack?.cards || [{ id: Date.now(), question: { text: '', image: '', audio: '' }, answer: { text: '', image: '', audio: '' } }]);
    const [standard, setStandard] = useState(stack?.standard || (stack ? '' : (defaultMetadata?.standard || '')));
    const [syllabus, setSyllabus] = useState(stack?.syllabus || (stack ? '' : (defaultMetadata?.syllabus || '')));
    const [medium, setMedium] = useState(stack?.medium || (stack ? '' : (defaultMetadata?.medium || '')));
    const [subject, setSubject] = useState(stack?.subject || (stack ? '' : (defaultMetadata?.subject || '')));
    const [isPublishing, setIsPublishing] = useState(activeTab === 'ready-made' && user?.email === 'chethanincardland@gmail.com');
    const [viewingImage, setViewingImage] = useState(null);
    const uploadInputRef = useRef(null);

    // Split/Merge state
    const [showSplitUI, setShowSplitUI] = useState(false);
    const [selectedCards, setSelectedCards] = useState(new Set());
    const [showMergeUI, setShowMergeUI] = useState(false);
    const [mergeTargetId, setMergeTargetId] = useState('');
    const modalRef = useRef(null);


    // Recording state
    const [recording, setRecording] = useState(null); // { id, field }
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef(null);

    const handleAddCard = () => {
        setCards([...cards, { id: Date.now(), question: { text: '', image: '', audio: '' }, answer: { text: '', image: '', audio: '' } }]);
        // Scroll to bottom after state update
        setTimeout(() => {
            if (modalRef.current) {
                modalRef.current.scrollTo({
                    top: modalRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

    const handleRemoveCard = (id) => {
        if (cards.length > 1) {
            setCards(cards.filter(c => c.id !== id));
        }
    };

    const handleUpdateCard = (id, field, value) => {
        setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    // SECURITY FIX (VULN-004): Validate data URIs before accepting uploads
    const handleFileUpload = (e, callback, fileType = 'image') => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataURI = reader.result;
            // Validate the data URI based on file type
            const allowedTypes = fileType === 'image' ? ['image/'] : ['audio/'];
            if (!validateDataURI(dataURI, allowedTypes)) {
                showAlert(`Invalid ${fileType} file. Only ${fileType} files are allowed.`);
                return;
            }
            callback(dataURI);
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
            // SECURITY FIX (VULN-006): Don't log error details
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
        if (!title.trim()) return showAlert('Please enter a title');

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const hasQuestion = card.question.text.trim() || card.question.image || card.question.audio;
            const hasAnswer = card.answer.text.trim() || card.answer.image || card.answer.audio;

            if (!hasQuestion) return showAlert(`Question is required for card ${i + 1}`);
            if (!hasAnswer) return showAlert(`Answer is required for card ${i + 1}`);
        }

        const newStack = {
            id: stack?.id || Date.now().toString(),
            title,
            titleImage,
            label,
            standard,
            syllabus,
            medium,
            subject,
            cards,
            owner: user.email,
            avgRating: stack?.avgRating || null,
            lastReviewed: stack?.lastReviewed || null,
        };

        try {
            const folderId = isPublishing ? publicFolderId : null;
            const result = await saveStack(user.token, newStack, stack?.driveFileId, folderId);
            // Passing back the stack with the possibly new driveFileId
            onSave({ ...newStack, driveFileId: result.id }, true, isPublishing);
        } catch (error) {
            if (error.message === 'REAUTH_NEEDED') {
                signIn();
            } else {
                // SECURITY FIX (VULN-006): Don't log error details
                showAlert('Failed to save stack.');
            }
        }
    };

    const handleDownload = async () => {
        if (!title) return showAlert('Please save the stack first');

        const stackToDownload = {
            id: stack?.id || Date.now().toString(),
            title,
            titleImage,
            label,
            cards,
            createdAt: stack?.createdAt || new Date().toISOString()
        };

        try {
            await downloadStackAsZip(stackToDownload);
            showAlert('Stack downloaded successfully!');
        } catch (error) {
            // SECURITY FIX (VULN-006): Don't log error details
            showAlert('Failed to download stack.');
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const importedStack = await uploadStackFromZip(file);

            // Populate the form with imported data
            setTitle(importedStack.title);
            setTitleImage(importedStack.titleImage || '');
            setLabel(importedStack.label || 'No label');
            setCards(importedStack.cards);

            showAlert('Stack imported successfully! Review and save.');
        } catch (error) {
            // SECURITY FIX (VULN-006): Don't log error details
            showAlert(error.message || 'Failed to import stack.');
        }
    };

    const handleSplitStack = () => {
        if (selectedCards.size === 0) {
            return showAlert('Please select at least one card to split.');
        }
        if (selectedCards.size === cards.length) {
            return showAlert('Cannot split all cards. Leave at least one card in the current stack.');
        }

        showConfirm(`Split ${selectedCards.size} card(s) into a new stack?`, async () => {
            const cardsToSplit = cards.filter(c => selectedCards.has(c.id));
            const remainingCards = cards.filter(c => !selectedCards.has(c.id));

            // Create new stack with selected cards
            const newStack = {
                id: Date.now().toString(),
                title: `${title} (Split)`,
                titleImage,
                label,
                cards: cardsToSplit,
                owner: user.email,
                avgRating: null,
                lastReviewed: null,
            };

            try {
                // Save new stack
                const result = await saveStack(user.token, newStack);

                // Notify parent about the new stack without closing modal
                onSave({ ...newStack, driveFileId: result.id }, false);

                // Update current stack with remaining cards
                setCards(remainingCards);
                setSelectedCards(new Set());
                setShowSplitUI(false);

                showAlert(`Stack split successfully! New stack "${newStack.title}" created.`);

                // Save the updated current stack
                await handleSave();

            } catch (error) {
                if (error.message === 'REAUTH_NEEDED') {
                    signIn();
                } else {
                    // SECURITY FIX (VULN-006): Don't log error details
                    showAlert('Failed to split stack.');
                }
            }
        });
    };

    const handleMergeStack = async () => {
        if (!mergeTargetId) {
            return showAlert('Please select a stack to merge with.');
        }

        const targetStack = allStacks?.find(s => s.id === mergeTargetId);
        if (!targetStack) {
            return showAlert('Target stack not found.');
        }

        showConfirm(`Merge "${title}" into "${targetStack.title}"? The current stack will be deleted.`, async () => {
            try {
                // Combine cards
                const mergedCards = [...targetStack.cards, ...cards];

                // Update target stack
                const updatedStack = {
                    ...targetStack,
                    cards: mergedCards
                };

                await saveStack(user.token, updatedStack, targetStack.driveFileId);

                // Delete current stack if it exists in Drive
                if (stack?.driveFileId) {
                    await deleteStack(user.token, stack.driveFileId);
                }

                showAlert(`Stacks merged successfully into "${targetStack.title}"!`);
                onClose();
                // SECURITY FIX (VULN-008): Parent component will refresh stacks automatically
            } catch (error) {
                if (error.message === 'REAUTH_NEEDED') {
                    signIn();
                } else {
                    // SECURITY FIX (VULN-006): Don't log error details
                    showAlert('Failed to merge stacks.');
                }
            }
        });
    };

    const toggleCardSelection = (cardId) => {
        setSelectedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cardId)) {
                newSet.delete(cardId);
            } else {
                newSet.add(cardId);
            }
            return newSet;
        });
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.01)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div
                ref={modalRef}
                className="modal-content neo-flat" style={{
                    width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem',
                    display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative'
                }}>
                {/* Header Icons */}
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                    {stack && <button className="neo-button icon-btn" title="Download Stack" onClick={handleDownload}><Download size={18} /></button>}
                    {stack && <button className="neo-button icon-btn" title="Duplicate" onClick={() => onDuplicate(stack)}><Copy size={18} /></button>}
                    <button className="neo-button icon-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <h2 style={{ fontSize: '1.5rem' }}>{stack ? 'Edit Stack' : 'New Flashcard Stack'}</h2>




                {/* Title Image Upload */}
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <label style={{ fontWeight: '600', opacity: 0.7 }}>Title & Cover Image</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                    className="neo-input"
                                    placeholder="Stack Title "
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    style={{ paddingRight: '30px' }}
                                />
                                <span style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'red',
                                    pointerEvents: 'none',
                                    visibility: title ? 'hidden' : 'visible'
                                }}>*</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <label className="neo-button icon-btn" style={{ cursor: 'pointer', flexShrink: 0, color: titleImage ? 'var(--accent-color)' : 'currentColor' }}>
                                    <ImageIcon size={18} />
                                    <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, setTitleImage)} />
                                </label>
                                {titleImage && (
                                    <button className="neo-button icon-btn" style={{ flexShrink: 0 }} onClick={() => setTitleImage('')}>
                                        <Trash2 size={16} color="var(--error-color)" />
                                    </button>
                                )}
                            </div>
                        </div>


                        {/* Neo Dropdown for Labels */}
                        <NeoDropdown
                            label="Label"
                            value={label}
                            options={[
                                { label: 'No label', value: 'No label' },
                                ...availableLabels.filter(lbl => lbl !== 'No label').map(lbl => ({ label: lbl, value: lbl }))
                            ]}
                            onChange={setLabel}
                            placeholder="Select label..."
                        >
                            {/* Add New Label Input inside Dropdown */}
                            <div style={{ display: 'flex', gap: '8px', padding: '8px', borderBottom: '1px solid var(--shadow-dark)', marginBottom: '4px' }}>
                                <input
                                    className="neo-input"
                                    placeholder="Create new label..."
                                    value={newLabelInput}
                                    onChange={(e) => setNewLabelInput(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && newLabelInput.trim()) {
                                            setLabel(newLabelInput.trim());
                                            setNewLabelInput('');
                                        }
                                    }}
                                    style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px', height: '36px' }}
                                />
                                <button
                                    className="neo-button"
                                    style={{ padding: '8px 12px', fontSize: '0.85rem', height: '36px' }}
                                    onClick={() => {
                                        if (newLabelInput.trim()) {
                                            setLabel(newLabelInput.trim());
                                            setNewLabelInput('');
                                        }
                                    }}
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </NeoDropdown>
                    </div>
                </div>

                {/* Community Metadata & Publishing (Admin only) */}
                <div className="neo-inset" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', borderRadius: '16px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', opacity: 0.6 }}>COMMUNITY METADATA</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                        <NeoDropdown
                            label="Standard"
                            value={standard}
                            options={['V', 'VI', 'VII', 'VIII', 'IX', 'X'].map(s => ({ label: `Standard ${s}`, value: s }))}
                            onChange={setStandard}
                            placeholder="Select Standard"
                        />
                        <NeoDropdown
                            label="Syllabus"
                            value={syllabus}
                            options={['NCERT', 'Kerala'].map(s => ({ label: s, value: s }))}
                            onChange={setSyllabus}
                            placeholder="Select Syllabus"
                        />
                        <NeoDropdown
                            label="Medium"
                            value={medium}
                            options={['Malayalam', 'English'].map(s => ({ label: s, value: s }))}
                            onChange={setMedium}
                            placeholder="Select Medium"
                        />
                        <NeoDropdown
                            label="Subject"
                            value={subject}
                            options={['Maths', 'Social Science', 'Science', 'English', 'Malayalam', 'Hindi'].map(s => ({ label: s, value: s }))}
                            onChange={setSubject}
                            placeholder="Select Subject"
                        />
                    </div>

                    {user?.email === 'chethanincardland@gmail.com' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', background: isPublishing ? 'var(--accent-soft)' : 'transparent' }}>
                            <input
                                type="checkbox"
                                checked={isPublishing}
                                onChange={(e) => setIsPublishing(e.target.checked)}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: isPublishing ? 'var(--accent-color)' : 'inherit' }}>
                                Publish to Community Pool
                            </span>
                        </label>
                    )}
                </div>

                {/* Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {cards.map((card, index) => (
                        <div key={card.id} className="neo-inset" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                            {showSplitUI && (
                                <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 5 }}>
                                    <input
                                        type="checkbox"
                                        className="neo-checkbox"
                                        checked={selectedCards.has(card.id)}
                                        onChange={() => toggleCardSelection(card.id)}
                                    />
                                </div>
                            )}
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
                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        className="neo-input"
                                        rows="3"
                                        placeholder="The question... "
                                        value={card.question.text}
                                        onChange={(e) => handleUpdateCard(card.id, 'question', { ...card.question, text: e.target.value })}
                                        style={{ paddingRight: '30px', resize: 'vertical' }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '12px',
                                        color: 'red',
                                        pointerEvents: 'none',
                                        visibility: (card.question.text || card.question.image || card.question.audio) ? 'hidden' : 'visible'
                                    }}>*</span>
                                </div>
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
                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        className="neo-input"
                                        rows="3"
                                        placeholder="The answer... "
                                        value={card.answer.text}
                                        onChange={(e) => handleUpdateCard(card.id, 'answer', { ...card.answer, text: e.target.value })}
                                        style={{ paddingRight: '30px', resize: 'vertical' }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '12px',
                                        color: 'red',
                                        pointerEvents: 'none',
                                        visibility: (card.answer.text || card.answer.image || card.answer.audio) ? 'hidden' : 'visible'
                                    }}>*</span>
                                </div>
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

                {/* Split/Merge UI moved to bottom */}
                {stack && cards.length > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                                className={`neo-button ${showSplitUI ? 'neo-inset' : ''}`}
                                style={{ flex: 1, justifyContent: 'center', fontSize: '0.9rem' }}
                                onClick={() => { setShowSplitUI(!showSplitUI); setShowMergeUI(false); setSelectedCards(new Set()); }}
                            >
                                <Split size={16} /> {showSplitUI ? 'Cancel Split' : 'Split Stack'}
                            </button>
                            {allStacks && allStacks.filter(s => s.id !== stack?.id).length > 0 && (
                                <button
                                    className={`neo-button ${showMergeUI ? 'neo-inset' : ''}`}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.9rem' }}
                                    onClick={() => { setShowMergeUI(!showMergeUI); setShowSplitUI(false); setSelectedCards(new Set()); }}
                                >
                                    <Merge size={16} /> {showMergeUI ? 'Cancel Merge' : 'Merge Stack'}
                                </button>
                            )}
                        </div>

                        {/* Split UI */}
                        {showSplitUI && (
                            <div className="neo-inset" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Select cards to move to a new stack:</p>
                                <button
                                    className="neo-button neo-glow-blue"
                                    style={{ background: 'var(--accent-color)', color: 'white', border: 'none', justifyContent: 'center' }}
                                    onClick={handleSplitStack}
                                >
                                    Create New Stack with {selectedCards.size} Selected Card(s)
                                </button>
                            </div>
                        )}

                        {/* Merge UI */}
                        {showMergeUI && (
                            <div className="neo-inset" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Select stack to merge into:</p>

                                <NeoDropdown
                                    value={mergeTargetId}
                                    options={allStacks?.filter(s => s.id !== stack?.id).map(s => ({
                                        label: `${s.title} (${s.cards?.length || 0} cards)`,
                                        value: s.id
                                    }))}
                                    onChange={setMergeTargetId}
                                    placeholder="-- Select Stack --"
                                    displayValue={(id) => allStacks.find(s => s.id === id)?.title}
                                />

                                <button
                                    className="neo-button neo-glow-blue"
                                    style={{ background: 'var(--accent-color)', color: 'white', border: 'none', justifyContent: 'center' }}
                                    onClick={handleMergeStack}
                                    disabled={!mergeTargetId}
                                >
                                    Merge Into Selected Stack
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {!stack && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                ref={uploadInputRef}
                                type="file"
                                hidden
                                accept=".zip"
                                onChange={handleUpload}
                            />
                            <button
                                className="neo-button neo-glow-blue"
                                style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-soft)', color: 'var(--accent-color)' }}
                                onClick={() => uploadInputRef.current?.click()}
                            >
                                <Upload size={18} /> Upload from Device
                            </button>
                        </div>
                    )}
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
