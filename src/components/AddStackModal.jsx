import React, { useState, useEffect, useRef } from 'react';
import CloseButton from './common/CloseButton';
import { X, Mic, Image as ImageIcon, Plus, Trash2, Copy, Save, Check, Play, Square, Pause, ChevronDown, Download, Upload, Split, Merge, RefreshCw } from 'lucide-react';
import { signIn } from '../services/googleAuth';
import { saveFile, deleteStack, listFilesInFolder, getFileContent, makeFilePublic } from '../services/googleDrive';
import { storageService } from '../services/storageOrchestrator';
import { downloadStackAsZip, uploadStackFromZip } from '../utils/zipUtils';
import { parseGeminiOutput } from '../utils/importUtils';
import { validateDataURI, sanitizeText } from '../utils/securityUtils';
import ImageViewer from './ImageViewer';
import { AnimatePresence } from 'framer-motion';
import NeoDropdown from './NeoDropdown';
import { ADMIN_EMAIL } from '../constants/config';

const AutoGrowingTextarea = ({ value, onChange, placeholder, style = {}, ...props }) => {
    const textareaRef = useRef(null);

    const adjustHeight = (element) => {
        if (!element) return;
        element.style.height = 'auto';
        element.style.height = `${element.scrollHeight}px`;
    };

    useEffect(() => {
        adjustHeight(textareaRef.current);
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            className="neo-input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
                onChange(e);
                adjustHeight(e.target);
            }}
            style={{
                ...style,
                overflow: 'hidden',
                resize: 'none',
                minHeight: '40px',
                display: 'block'
            }}
            {...props}
        />
    );
};

const CardItem = ({
    card, index, totalCards, onUpdate, onRemove, onMove,
    recording, startRecording, stopRecording, cancelRecording, recordingTime,
    handleFileUpload, handleOptionChange, setViewingImage, showSplitUI, selectedCards, toggleCardSelection
}) => {
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div key={card.id} className="neo-inset" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
            {showSplitUI && (
                <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 5 }}>
                    <input
                        type="checkbox"
                        className="neo-checkbox"
                        checked={selectedCards?.has(card.id)}
                        onChange={() => toggleCardSelection?.(card.id)}
                    />
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{card.type === 'mcq' ? 'MCQ' : 'CARD'} {index + 1}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '8px', boxShadow: 'inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light)' }}>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Pos:</span>
                        <input
                            type="number"
                            className="neo-input"
                            style={{
                                width: '40px', padding: '2px', textAlign: 'center',
                                boxShadow: 'none', background: 'transparent', height: 'auto',
                                fontSize: '0.9rem', fontWeight: 'bold'
                            }}
                            placeholder="#"
                            onBlur={(e) => {
                                if (e.target.value) {
                                    onMove(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.target.value) {
                                    onMove(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                        />
                    </div>
                    <button
                        className="neo-button icon-btn"
                        style={{ width: '32px', height: '32px', color: 'var(--error-color)', boxShadow: 'none' }}
                        onClick={onRemove}
                        title="Delete Card"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

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
                                    <button className="neo-button icon-btn" style={{ width: '32px', height: '32px' }} onClick={() => onUpdate('question', { ...card.question, audio: '' })}>
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
                            <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, (data) => onUpdate('question', { ...card.question, image: data }))} />
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
                            onClick={() => onUpdate('question', { ...card.question, image: '' })}
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
                <div style={{ position: 'relative' }}>
                    <AutoGrowingTextarea
                        placeholder="The question... "
                        value={card.question.text}
                        onChange={(e) => onUpdate('question', { ...card.question, text: sanitizeText(e.target.value) })}
                        style={{ paddingRight: '30px' }}
                    />
                </div>
            </div>

            {card.type === 'mcq' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>OPTIONS</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {card.options?.map((opt, i) => (
                            <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="radio"
                                    name={`correct-${card.id}`}
                                    checked={opt.isCorrect}
                                    onChange={() => handleOptionChange(opt.id, 'isCorrect', true)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                                />
                                <input
                                    className="neo-input"
                                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                    value={opt.text}
                                    onChange={(e) => handleOptionChange(opt.id, 'text', sanitizeText(e.target.value))}
                                    style={{
                                        borderColor: opt.isCorrect ? 'var(--accent-color)' : 'transparent',
                                        borderWidth: opt.isCorrect ? '2px' : '1px'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
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
                                        <button className="neo-button icon-btn" style={{ width: '32px', height: '32px' }} onClick={() => onUpdate('answer', { ...card.answer, audio: '' })}>
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
                                <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, (data) => onUpdate('answer', { ...card.answer, image: data }))} />
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
                                onClick={() => onUpdate('answer', { ...card.answer, image: '' })}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}
                    <AutoGrowingTextarea
                        placeholder="The answer... "
                        value={card.answer.text}
                        onChange={(e) => onUpdate('answer', { ...card.answer, text: sanitizeText(e.target.value) })}
                    />
                </div>
            )}
        </div>
    );
};

const AddStackModal = ({
    user, stack, onClose, onSave, onDuplicate, onDelete,
    showAlert, showConfirm, availableLabels, allStacks,
    activeTab, defaultMetadata
}) => {
    const [title, setTitle] = useState(stack?.title || '');
    const [titleImage, setTitleImage] = useState(stack?.titleImage || '');
    const [label, setLabel] = useState(stack?.label || 'No label');
    const [importantNote, setImportantNote] = useState(stack?.importantNote || '');
    const [newLabelInput, setNewLabelInput] = useState('');
    const [cards, setCards] = useState(stack?.cards || [{ id: Date.now(), question: { text: '', image: '', audio: '' }, answer: { text: '', image: '', audio: '' } }]);
    const [standard, setStandard] = useState(stack?.standard || (stack ? '' : (defaultMetadata?.standard || '')));
    const [syllabus, setSyllabus] = useState(stack?.syllabus || (stack ? '' : (defaultMetadata?.syllabus || '')));
    const [medium, setMedium] = useState(stack?.medium || (stack ? '' : (defaultMetadata?.medium || '')));
    const [subject, setSubject] = useState(stack?.subject || (stack ? '' : (defaultMetadata?.subject || '')));
    const [cost, setCost] = useState(stack?.cost || 0);
    const [sections, setSections] = useState(stack?.sections || []);
    const [isPublishing, setIsPublishing] = useState(activeTab === 'ready-made' && user?.email === ADMIN_EMAIL);
    const [viewingImage, setViewingImage] = useState(null);
    const uploadInputRef = useRef(null);

    // Split/Merge state
    const [showSplitUI, setShowSplitUI] = useState(false);
    const [selectedCards, setSelectedCards] = useState(new Set());
    const [showMergeUI, setShowMergeUI] = useState(false);
    const [mergeTargetId, setMergeTargetId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const modalRef = useRef(null);
    const contentRef = useRef(null); // Dedicated ref for scrollable content

    // Recording state
    const [recording, setRecording] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const timerRef = useRef(null);

    const handleAddCard = () => {
        const newCard = { id: Date.now(), type: 'flashcard', question: { text: '', image: '', audio: '' }, answer: { text: '', image: '', audio: '' } };
        if (sections.length > 0) {
            const lastIdx = sections.length - 1;
            const newSections = [...sections];
            newSections[lastIdx].cards.push(newCard);
            setSections(newSections);
            setCards(newSections.flatMap(s => s.cards));
        } else {
            setCards([...cards, newCard]);
        }
        scrollToBottom();
    };

    const handleAddMCQ = () => {
        const newCard = {
            id: Date.now(),
            type: 'mcq',
            question: { text: '', image: '', audio: '' },
            options: [
                { id: Date.now() + 1, text: '', isCorrect: false },
                { id: Date.now() + 2, text: '', isCorrect: false },
                { id: Date.now() + 3, text: '', isCorrect: false },
                { id: Date.now() + 4, text: '', isCorrect: false }
            ],
            answer: { text: '', image: '', audio: '' }
        };

        if (sections.length > 0) {
            const lastIdx = sections.length - 1;
            const newSections = [...sections];
            newSections[lastIdx].cards.push(newCard);
            setSections(newSections);
            setCards(newSections.flatMap(s => s.cards));
        } else {
            setCards([...cards, newCard]);
        }
        scrollToBottom();
    };

    const handleAddSection = () => {
        setSections([...sections, { noteSegment: '', cards: [] }]);
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (contentRef.current) {
                contentRef.current.scrollTo({
                    top: contentRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

    const handleMoveCard = (index, newPosition, sIndex = null) => {
        const newIndex = parseInt(newPosition) - 1;
        if (sIndex !== null) {
            const newSections = [...sections];
            const sectionCards = newSections[sIndex].cards;
            if (isNaN(newIndex) || newIndex < 0 || newIndex >= sectionCards.length || newIndex === index) return;
            const [movedCard] = sectionCards.splice(index, 1);
            sectionCards.splice(newIndex, 0, movedCard);
            setSections(newSections);
            setCards(newSections.flatMap(s => s.cards));
        } else {
            if (isNaN(newIndex) || newIndex < 0 || newIndex >= cards.length || newIndex === index) return;
            const newCards = [...cards];
            const [movedCard] = newCards.splice(index, 1);
            newCards.splice(newIndex, 0, movedCard);
            setCards(newCards);
        }
    };

    const handleOptionChange = (cardId, optionId, field, value) => {
        setCards(cards.map(c => {
            if (c.id !== cardId) return c;
            if (field === 'isCorrect') {
                return {
                    ...c,
                    options: c.options.map(opt => ({
                        ...opt,
                        isCorrect: opt.id === optionId
                    }))
                };
            }
            return {
                ...c,
                options: c.options.map(opt => opt.id === optionId ? { ...opt, [field]: value } : opt)
            };
        }));
    };

    const handleRemoveCard = (id) => {
        if (cards.length > 1) {
            setCards(cards.filter(c => c.id !== id));
        }
    };

    const handleUpdateCard = (id, field, value) => {
        setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleFileUpload = (e, callback, fileType = 'image') => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataURI = reader.result;
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
                    setCards(prevCards => prevCards.map(c => c.id === id ? { ...c, [field]: { ...c[field], audio: reader.result } } : c));
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(track => track.stop());
                clearInterval(timerRef.current);
                setRecordingTime(0);
            };
            recorder.start();
            setMediaRecorder(recorder);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (err) {
            showAlert('Could not access microphone.');
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

    const handleSave = async () => {
        if (!title.trim()) return showAlert('Please enter a title');

        const finalCards = sections.length > 0 ? sections.flatMap(s => s.cards) : cards;

        for (let i = 0; i < finalCards.length; i++) {
            const card = finalCards[i];
            const hasQuestion = card.question.text.trim() || card.question.image || card.question.audio;
            const hasAnswer = card.answer.text.trim() || card.answer.image || card.answer.audio;
            if (card.type === 'mcq') {
                const hasCorrectOption = card.options?.some(o => o.isCorrect);
                if (!hasQuestion) return showAlert(`Question is required for MCQ ${i + 1}`);
                if (!hasCorrectOption) return showAlert(`Please select a correct answer for MCQ ${i + 1}`);
            } else {
                if (!hasQuestion) return showAlert(`Question is required for card ${i + 1}`);
                if (!hasAnswer) return showAlert(`Answer is required for card ${i + 1}`);
            }
        }

        const newStack = {
            id: stack?.id || Date.now().toString(),
            title, titleImage, label, standard, syllabus, medium, subject, importantNote,
            cards: finalCards, sections,
            owner: user.email,
            avgRating: stack?.avgRating || null,
            lastReviewed: stack?.lastReviewed || null,
            cost: parseInt(cost) || 0,
        };

        try {
            setIsSaving(true);
            let savedStack;

            if (isPublishing) {
                // Authoritative Move to Firebase for Public Lessons
                const { savePublicLesson } = await import('../services/publicDrive');
                savedStack = await savePublicLesson(newStack);
            } else {
                // Personal Storage strictly stays on Google Drive
                savedStack = await storageService.saveStack(newStack);
            }

            const resultId = savedStack.driveFileId || savedStack.id;
            onSave({ ...savedStack, driveFileId: resultId }, true, isPublishing);
        } catch (error) {
            setIsSaving(false);
            if (error.message === 'REAUTH_NEEDED') {
                signIn('consent', () => handleSave(), showAlert);
            } else {
                console.error('Save failed:', error);
                if (error.code === 'storage/unknown' || error.message.includes('storage/unknown')) {
                    showAlert('Cloud upload failed (likely CORS). Please use the "Download" button to save locally.');
                } else {
                    showAlert(`Failed to save stack: ${error.message}`);
                }
            }
        }
    };

    const handleDownload = async () => {
        if (!title) return showAlert('Please save the stack first');
        const stackToDownload = {
            id: stack?.id || Date.now().toString(),
            title, titleImage, label, cards,
            createdAt: stack?.createdAt || new Date().toISOString()
        };
        try {
            await downloadStackAsZip(stackToDownload);
            showAlert('Stack downloaded successfully!');
        } catch (error) {
            showAlert('Failed to download stack.');
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const importedStack = await uploadStackFromZip(file);
            setTitle(importedStack.title);
            setTitleImage(importedStack.titleImage || '');
            setLabel(importedStack.label || 'No label');
            setImportantNote(importedStack.importantNote || '');

            // Set Metadata
            setStandard(importedStack.standard || '');
            setSyllabus(importedStack.syllabus || '');
            setMedium(importedStack.medium || '');
            setSubject(importedStack.subject || '');
            setCost(importedStack.cost || 0);

            setCards(importedStack.cards);
            if (importedStack.sections) setSections(importedStack.sections);
            showAlert('Stack imported successfully! Review and save.');
        } catch (error) {
            showAlert(error.message || 'Failed to import stack.');
        }
    };

    const handleSplitStack = () => {
        if (selectedCards.size === 0) return showAlert('Please select at least one card to split.');
        if (selectedCards.size === cards.length) return showAlert('Cannot split all cards.');
        showConfirm(`Split ${selectedCards.size} card(s) into a new stack?`, async () => {
            const cardsToSplit = cards.filter(c => selectedCards.has(c.id));
            const remainingCards = cards.filter(c => !selectedCards.has(c.id));
            const newStack = {
                id: Date.now().toString(),
                title: `${title} (Split)`,
                titleImage, label, cards: cardsToSplit,
                owner: user.email
            };
            try {
                const savedNewStack = await storageService.saveStack(newStack);
                onSave({ ...savedNewStack, driveFileId: savedNewStack.driveFileId || savedNewStack.id }, false);
                setCards(remainingCards);
                setSelectedCards(new Set());
                setShowSplitUI(false);
                showAlert(`Stack split successfully!`);
                await handleSave();
            } catch (error) {
                showAlert('Failed to split stack.');
            }
        });
    };

    const handleMergeStack = async () => {
        if (!mergeTargetId) return showAlert('Please select a stack to merge with.');
        const targetStack = allStacks?.find(s => s.id === mergeTargetId);
        if (!targetStack) return showAlert('Target stack not found.');
        showConfirm(`Merge "${title}" into "${targetStack.title}"?`, async () => {
            try {
                const updatedStack = { ...targetStack, cards: [...targetStack.cards, ...cards] };
                await storageService.saveStack(updatedStack);
                if (stack?.driveFileId) await deleteStack(user.token, stack.driveFileId);
                showAlert(`Stacks merged successfully!`);
                onClose();
            } catch (error) {
                showAlert('Failed to merge stacks.');
            }
        });
    };

    const toggleCardSelection = (cardId) => {
        setSelectedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cardId)) newSet.delete(cardId);
            else newSet.add(cardId);
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
                    width: '100%', maxWidth: '600px',
                    height: window.innerWidth < 768 ? '100%' : '90vh',
                    maxHeight: '100%',
                    padding: 0,
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: window.innerWidth < 768 ? 0 : '24px'
                }}>

                <div style={{
                    padding: '1.5rem 2rem', borderBottom: '1px solid var(--shadow-dark)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg-color)', zIndex: 10
                }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{stack ? 'Edit Stack' : 'New Flashcard Stack'}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {stack && <button className="neo-button icon-btn" title="Download Stack" onClick={handleDownload}><Download size={18} /></button>}
                        {stack && <button className="neo-button icon-btn" title="Duplicate" onClick={() => onDuplicate(stack)}><Copy size={18} /></button>}
                        <CloseButton onClick={onClose} size={18} />
                    </div>
                </div>

                <div
                    ref={contentRef}
                    style={{
                        padding: '2rem', flex: 1, overflowY: 'auto',
                        display: 'flex', flexDirection: 'column', gap: '1.5rem'
                    }}
                >
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <label style={{ fontWeight: '600', opacity: 0.7 }}>Title & Cover Image</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input
                                        id="modal-title-input"
                                        className="neo-input"
                                        placeholder="Stack Title "
                                        value={title}
                                        onChange={(e) => setTitle(sanitizeText(e.target.value))}
                                        style={{ paddingRight: '30px' }}
                                    />
                                    {!title && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'red', pointerEvents: 'none' }}>*</span>}
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
                                <div style={{ display: 'flex', gap: '8px', padding: '8px', borderBottom: '1px solid var(--shadow-dark)', marginBottom: '4px' }}>
                                    <input
                                        className="neo-input"
                                        placeholder="Create new label..."
                                        value={newLabelInput}
                                        onChange={(e) => setNewLabelInput(sanitizeText(e.target.value))}
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                                <label style={{ fontWeight: '600', opacity: 0.7 }}>Important Note (Optional)</label>
                                <AutoGrowingTextarea
                                    placeholder="Add an important note..."
                                    value={importantNote}
                                    onChange={(e) => setImportantNote(sanitizeText(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    {user?.email === ADMIN_EMAIL && (
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Cost (Coins)</label>
                                    <input
                                        type="number"
                                        className="neo-input"
                                        value={cost}
                                        onChange={(e) => setCost(e.target.value)}
                                        placeholder="0 for free"
                                        style={{ padding: '10px 12px' }}
                                    />
                                </div>
                            </div>
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
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {sections && sections.length > 0 ? (
                            sections.map((section, sIndex) => (
                                <div key={sIndex} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', borderRadius: '12px', border: '1px solid var(--shadow-dark)' }}>
                                    <div className="neo-flat" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-color)', borderRadius: '8px' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Section Note</label>
                                        <AutoGrowingTextarea
                                            value={section.noteSegment}
                                            onChange={(e) => {
                                                const newSections = [...sections];
                                                newSections[sIndex].noteSegment = e.target.value;
                                                setSections(newSections);
                                            }}
                                            placeholder="Enter section note..."
                                            style={{ minHeight: '40px', background: 'transparent', boxShadow: 'none' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {section.cards.map((card, index) => (
                                            <CardItem
                                                key={card.id}
                                                card={card}
                                                index={index}
                                                totalCards={section.cards.length}
                                                onUpdate={(field, val) => {
                                                    const newSections = [...sections];
                                                    newSections[sIndex].cards[index] = { ...card, [field]: val };
                                                    setSections(newSections);
                                                    setCards(newSections.flatMap(s => s.cards));
                                                }}
                                                onRemove={() => {
                                                    const newSections = [...sections];
                                                    newSections[sIndex].cards.splice(index, 1);
                                                    setSections(newSections);
                                                    setCards(newSections.flatMap(s => s.cards));
                                                }}
                                                onMove={(newPos) => handleMoveCard(index, newPos, sIndex)}
                                                recording={recording}
                                                startRecording={startRecording}
                                                stopRecording={stopRecording}
                                                cancelRecording={cancelRecording}
                                                recordingTime={recordingTime}
                                                handleFileUpload={handleFileUpload}
                                                handleOptionChange={(optId, f, v) => {
                                                    const newSections = [...sections];
                                                    const c = newSections[sIndex].cards[index];
                                                    if (f === 'isCorrect') {
                                                        c.options = c.options.map(o => ({ ...o, isCorrect: o.id === optId }));
                                                    } else {
                                                        c.options = c.options.map(o => o.id === optId ? { ...o, [f]: v } : o);
                                                    }
                                                    setSections(newSections);
                                                    setCards(newSections.flatMap(s => s.cards));
                                                }}
                                                setViewingImage={setViewingImage}
                                                showSplitUI={showSplitUI}
                                                selectedCards={selectedCards}
                                                toggleCardSelection={toggleCardSelection}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        className="neo-button"
                                        style={{ alignSelf: 'center', fontSize: '0.8rem', opacity: 0.6 }}
                                        onClick={() => {
                                            const newSections = [...sections];
                                            newSections.splice(sIndex + 1, 0, { noteSegment: '', cards: [] });
                                            setSections(newSections);
                                        }}
                                    >
                                        <Plus size={14} /> Insert Section Here
                                    </button>
                                </div>
                            ))
                        ) : (
                            cards.map((card, index) => (
                                <CardItem
                                    key={card.id}
                                    card={card}
                                    index={index}
                                    totalCards={cards.length}
                                    onUpdate={(field, val) => handleUpdateCard(card.id, field, val)}
                                    onRemove={() => handleRemoveCard(card.id)}
                                    onMove={(newPos) => handleMoveCard(index, newPos)}
                                    recording={recording}
                                    startRecording={startRecording}
                                    stopRecording={stopRecording}
                                    cancelRecording={cancelRecording}
                                    recordingTime={recordingTime}
                                    handleFileUpload={handleFileUpload}
                                    handleOptionChange={(optId, f, v) => handleOptionChange(card.id, optId, f, v)}
                                    setViewingImage={setViewingImage}
                                    showSplitUI={showSplitUI}
                                    selectedCards={selectedCards}
                                    toggleCardSelection={toggleCardSelection}
                                />
                            ))
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="neo-button neo-glow-blue" style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-soft)', color: 'var(--accent-color)' }} onClick={handleAddCard}>
                            <Plus size={18} /> Add Card
                        </button>
                        <button className="neo-button neo-glow-blue" style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-soft)', color: 'var(--accent-color)' }} onClick={handleAddMCQ}>
                            <Plus size={18} /> Add MCQ
                        </button>
                        <button className="neo-button neo-glow-blue" style={{ flex: 1, justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--accent-color)' }} onClick={handleAddSection}>
                            <Plus size={18} /> Add Section
                        </button>
                    </div>

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
                </div>

                <div style={{
                    padding: '1.5rem', borderTop: '1px solid var(--shadow-dark)',
                    display: 'flex', flexDirection: 'column', gap: '1rem',
                    background: 'var(--bg-color)', zIndex: 10
                }}>
                    {!stack && user?.email === ADMIN_EMAIL && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input ref={uploadInputRef} type="file" hidden accept=".zip" onChange={handleUpload} />
                            <button
                                className="neo-button neo-glow-blue"
                                style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-soft)', color: 'var(--accent-color)' }}
                                onClick={() => uploadInputRef.current?.click()}
                            >
                                <Upload size={18} /> Upload from Device
                            </button>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {stack && (
                            <button
                                className="neo-button neo-glow-red"
                                style={{ flex: '1 1 8.75rem', justifyContent: 'center', color: 'var(--error-color)', padding: '0.8rem' }}
                                onClick={() => showConfirm(`Delete "${stack.title}"?`, () => onDelete(stack))}
                            >
                                <Trash2 size={18} /> Delete Stack
                            </button>
                        )}
                        <button className="neo-button" style={{ flex: '1 1 6.25rem', justifyContent: 'center', padding: '0.8rem' }} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className={`neo-button ${isSaving ? 'neo-inset' : ''}`}
                            style={{
                                flex: '2 1 12.5rem',
                                justifyContent: 'center',
                                background: isSaving ? 'var(--bg-color)' : 'var(--accent-color)',
                                color: isSaving ? 'var(--accent-color)' : 'white',
                                border: 'none', padding: '0.8rem',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                opacity: isSaving ? 0.8 : 1
                            }}
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <><RefreshCw size={18} className="spin" style={{ marginRight: '8px' }} /> Saving...</>
                            ) : (
                                <><Save size={18} style={{ marginRight: '8px' }} /> {stack ? 'Save Changes' : 'Create Stack'}</>
                            )}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {viewingImage && <ImageViewer imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AddStackModal;
