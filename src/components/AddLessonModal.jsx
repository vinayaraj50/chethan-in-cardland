import React, { useState, useEffect, useRef } from 'react';
import CloseButton from './common/CloseButton';
import { X, Mic, Image as ImageIcon, Plus, Trash2, Save, Check, Play, Square, Pause, ChevronDown, Split, Merge, RefreshCw } from 'lucide-react';
import { signIn } from '../services/googleAuth';
import { saveFile, deleteLesson, getFileContent, makeFilePublic } from '../services/googleDrive';
import { storageService } from '../services/storageOrchestrator';
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

const QuestionItem = ({
    question, index, totalQuestions, onUpdate, onRemove, onMove,
    recording, startRecording, stopRecording, cancelRecording, recordingTime,
    handleFileUpload, handleOptionChange, setViewingImage, showSplitUI, selectedQuestions, toggleQuestionSelection
}) => {
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div key={question.id} className="neo-inset" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
            {showSplitUI && (
                <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 5 }}>
                    <input
                        type="checkbox"
                        className="neo-checkbox"
                        checked={selectedQuestions?.has(question.id)}
                        onChange={() => toggleQuestionSelection?.(question.id)}
                    />
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{question.type === 'mcq' ? 'MCQ' : 'QUESTION'} {index + 1}</span>
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
                        title="Delete Question"
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
                                    style={{ width: '32px', height: '32px', color: question.question.audio ? 'var(--accent-color)' : 'currentColor' }}
                                    onClick={() => startRecording(question.id, 'question')}
                                >
                                    <Mic size={14} />
                                </button>
                                {question.question.audio && (
                                    <button className="neo-button icon-btn" style={{ width: '32px', height: '32px' }} onClick={() => onUpdate('question', { ...question.question, audio: '' })}>
                                        <Trash2 size={12} color="var(--error-color)" />
                                    </button>
                                )}
                            </div>
                        ) : recording.id === question.id && recording.field === 'question' ? (
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
                            <ImageIcon size={14} color={question.question.image ? 'var(--accent-color)' : 'currentColor'} />
                            <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, (data) => onUpdate('question', { ...question.question, image: data }))} />
                        </label>
                    </div>
                </div>
                {question.question.image && (
                    <div style={{ position: 'relative', width: '100%', maxHeight: '150px' }}>
                        <img
                            src={question.question.image}
                            style={{ width: '100%', height: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px', cursor: 'pointer' }}
                            onClick={() => setViewingImage(question.question.image)}
                        />
                        <button
                            className="neo-button icon-btn"
                            style={{ position: 'absolute', top: '5px', right: '5px', width: '24px', height: '24px' }}
                            onClick={() => onUpdate('question', { ...question.question, image: '' })}
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
                <div style={{ position: 'relative' }}>
                    <AutoGrowingTextarea
                        placeholder="The question... "
                        value={question.question.text}
                        onChange={(e) => onUpdate('question', { ...question.question, text: sanitizeText(e.target.value) })}
                        style={{ paddingRight: '30px' }}
                    />
                </div>
            </div>

            {question.type === 'mcq' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>OPTIONS</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {question.options?.map((opt, i) => (
                            <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="radio"
                                    name={`correct-${question.id}`}
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
                                        style={{ width: '32px', height: '32px', color: question.answer.audio ? 'var(--accent-color)' : 'currentColor' }}
                                        onClick={() => startRecording(question.id, 'answer')}
                                    >
                                        <Mic size={14} />
                                    </button>
                                    {question.answer.audio && (
                                        <button className="neo-button icon-btn" style={{ width: '32px', height: '32px' }} onClick={() => onUpdate('answer', { ...question.answer, audio: '' })}>
                                            <Trash2 size={12} color="var(--error-color)" />
                                        </button>
                                    )}
                                </div>
                            ) : recording.id === question.id && recording.field === 'answer' ? (
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
                                <ImageIcon size={14} color={question.answer.image ? 'var(--accent-color)' : 'currentColor'} />
                                <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, (data) => onUpdate('answer', { ...question.answer, image: data }))} />
                            </label>
                        </div>
                    </div>
                    {question.answer.image && (
                        <div style={{ position: 'relative', width: '100%', maxHeight: '150px' }}>
                            <img
                                src={question.answer.image}
                                style={{ width: '100%', height: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px', cursor: 'pointer' }}
                                onClick={() => setViewingImage(question.answer.image)}
                            />
                            <button
                                className="neo-button icon-btn"
                                style={{ position: 'absolute', top: '5px', right: '5px', width: '24px', height: '24px' }}
                                onClick={() => onUpdate('answer', { ...question.answer, image: '' })}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}
                    <AutoGrowingTextarea
                        placeholder="The answer... "
                        value={question.answer.text}
                        onChange={(e) => onUpdate('answer', { ...question.answer, text: sanitizeText(e.target.value) })}
                    />
                </div>
            )}
        </div>
    );
};

const AddLessonModal = ({
    user, lesson, onClose, onSave, onDelete,
    showAlert, showConfirm, availableLabels, allLessons,
    activeTab, defaultMetadata
}) => {
    const [title, setTitle] = useState(lesson?.title || '');
    const [titleImage, setTitleImage] = useState(lesson?.titleImage || '');
    const [label, setLabel] = useState(lesson?.label || 'No label');
    const [importantNote, setImportantNote] = useState(lesson?.importantNote || '');
    const [newLabelInput, setNewLabelInput] = useState('');
    const [questions, setQuestions] = useState(lesson?.questions || lesson?.cards || [{ id: Date.now(), question: { text: '', image: '', audio: '' }, answer: { text: '', image: '', audio: '' } }]);
    const [standard, setStandard] = useState(lesson?.standard || (lesson ? '' : (defaultMetadata?.standard || '')));
    const [syllabus, setSyllabus] = useState(lesson?.syllabus || (lesson ? '' : (defaultMetadata?.syllabus || '')));
    const [medium, setMedium] = useState(lesson?.medium || (lesson ? '' : (defaultMetadata?.medium || '')));
    const [subject, setSubject] = useState(lesson?.subject || (lesson ? '' : (defaultMetadata?.subject || '')));
    const [cost, setCost] = useState(lesson?.cost || 0);
    const [sections, setSections] = useState(lesson?.sections || []);
    const [isPublishing, setIsPublishing] = useState(activeTab === 'lessons' && user?.email === ADMIN_EMAIL);
    const [viewingImage, setViewingImage] = useState(null);
    const uploadInputRef = useRef(null);

    // Split/Merge state
    const [showSplitUI, setShowSplitUI] = useState(false);
    const [selectedQuestions, setSelectedQuestions] = useState(new Set());
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

    const handleAddQuestion = () => {
        const newQuestion = { id: Date.now(), type: 'flashcard', question: { text: '', image: '', audio: '' }, answer: { text: '', image: '', audio: '' } };
        if (sections.length > 0) {
            const lastIdx = sections.length - 1;
            const newSections = [...sections];
            newSections[lastIdx].questions = newSections[lastIdx].questions || newSections[lastIdx].cards || [];
            newSections[lastIdx].questions.push(newQuestion);
            setSections(newSections);
            setQuestions(newSections.flatMap(s => s.questions || s.cards));
        } else {
            setQuestions([...questions, newQuestion]);
        }
        scrollToBottom();
    };

    const handleAddMCQ = () => {
        const newQuestion = {
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
            newSections[lastIdx].questions = newSections[lastIdx].questions || newSections[lastIdx].cards || [];
            newSections[lastIdx].questions.push(newQuestion);
            setSections(newSections);
            setQuestions(newSections.flatMap(s => s.questions || s.cards));
        } else {
            setQuestions([...questions, newQuestion]);
        }
        scrollToBottom();
    };

    const handleAddSection = () => {
        setSections([...sections, { noteSegment: '', questions: [] }]);
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

    const handleMoveQuestion = (index, newPosition, sIndex = null) => {
        const newIndex = parseInt(newPosition) - 1;
        if (sIndex !== null) {
            const newSections = [...sections];
            const sectionQuestions = newSections[sIndex].questions || newSections[sIndex].cards || [];
            if (isNaN(newIndex) || newIndex < 0 || newIndex >= sectionQuestions.length || newIndex === index) return;
            const [movedQuestion] = sectionQuestions.splice(index, 1);
            sectionQuestions.splice(newIndex, 0, movedQuestion);
            newSections[sIndex].questions = sectionQuestions;
            setSections(newSections);
            setQuestions(newSections.flatMap(s => s.questions || s.cards));
        } else {
            if (isNaN(newIndex) || newIndex < 0 || newIndex >= questions.length || newIndex === index) return;
            const newQuestions = [...questions];
            const [movedQuestion] = newQuestions.splice(index, 1);
            newQuestions.splice(newIndex, 0, movedQuestion);
            setQuestions(newQuestions);
        }
    };

    const handleOptionChange = (questionId, optionId, field, value) => {
        setQuestions(questions.map(c => {
            if (c.id !== questionId) return c;
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

    const handleRemoveQuestion = (id) => {
        if (questions.length > 1) {
            setQuestions(questions.filter(c => c.id !== id));
        }
    };

    const handleUpdateQuestion = (id, field, value) => {
        setQuestions(questions.map(c => c.id === id ? { ...c, [field]: value } : c));
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
                    setQuestions(prevQuestions => prevQuestions.map(c => c.id === id ? { ...c, [field]: { ...c[field], audio: reader.result } } : c));
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

        const finalQuestions = sections.length > 0 ? sections.flatMap(s => s.questions || s.cards) : questions;

        for (let i = 0; i < finalQuestions.length; i++) {
            const questionItem = finalQuestions[i];
            const hasQuestion = questionItem.question.text.trim() || questionItem.question.image || questionItem.question.audio;
            const hasAnswer = questionItem.answer.text.trim() || questionItem.answer.image || questionItem.answer.audio;
            if (questionItem.type === 'mcq') {
                const hasCorrectOption = questionItem.options?.some(o => o.isCorrect);
                if (!hasQuestion) return showAlert(`Question is required for MCQ ${i + 1}`);
                if (!hasCorrectOption) return showAlert(`Please select a correct answer for MCQ ${i + 1}`);
            } else {
                if (!hasQuestion) return showAlert(`Question is required for question ${i + 1}`);
                if (!hasAnswer) return showAlert(`Answer is required for question ${i + 1}`);
            }
        }

        const newLesson = {
            id: lesson?.id || Date.now().toString(),
            title, titleImage, label, standard, syllabus, medium, subject, importantNote,
            questions: finalQuestions, sections,
            owner: user.email,
            avgRating: lesson?.avgRating || null,
            lastReviewed: lesson?.lastReviewed || null,
            cost: parseInt(cost) || 0,
            questionCount: finalQuestions.length
        };

        try {
            setIsSaving(true);
            let savedLesson;

            if (isPublishing) {
                // Authoritative Move to Firebase for Public Lessons
                const { savePublicLesson } = await import('../services/publicDrive');
                savedLesson = await savePublicLesson(newLesson);
            } else {
                // Personal Storage strictly stays on Google Drive
                savedLesson = await storageService.saveLesson(newLesson);
            }

            const resultId = savedLesson.driveFileId || savedLesson.id;
            onSave({ ...savedLesson, driveFileId: resultId }, true, isPublishing);
        } catch (error) {
            setIsSaving(false);
            if (error.message === 'REAUTH_NEEDED' || error.message.includes('REAUTH_NEEDED')) {
                // Token missing or expired. Prompt re-connection.
                showAlert('Please reconnect to Google Drive to save.');
                try {
                    await signIn({ prompt: 'consent' });
                    // Retry save after successful login
                    await handleSave();
                } catch (e) {
                    console.error('Re-auth failed/cancelled', e);
                    // User cancelled or failed to sign in
                }
            } else {
                console.error('Save failed:', error);
                if (error.code === 'storage/unknown' || error.message.includes('storage/unknown')) {
                    showAlert('Cloud upload failed (likely CORS). Please use the "Download" button to save locally.');
                } else {
                    showAlert(`Failed to save lesson: ${error.message}`);
                }
            }
        }
    };



    const handleSplitLesson = () => {
        if (selectedQuestions.size === 0) return showAlert('Please select at least one question to split.');
        if (selectedQuestions.size === questions.length) return showAlert('Cannot split all questions.');
        showConfirm(`Split ${selectedQuestions.size} question(s) into a new lesson?`, async () => {
            const questionsToSplit = questions.filter(c => selectedQuestions.has(c.id));
            const remainingQuestions = questions.filter(c => !selectedQuestions.has(c.id));
            const newLesson = {
                id: Date.now().toString(),
                title: `${title} (Split)`,
                titleImage, label, questions: questionsToSplit,
                owner: user.email,
                questionCount: questionsToSplit.length
            };
            try {
                const savedNewLesson = await storageService.saveLesson(newLesson);
                onSave({ ...savedNewLesson, driveFileId: savedNewLesson.driveFileId || savedNewLesson.id }, false);
                setQuestions(remainingQuestions);
                setSelectedQuestions(new Set());
                setShowSplitUI(false);
                showAlert(`Lesson split successfully!`);
                await handleSave();
            } catch (error) {
                showAlert('Failed to split lesson.');
            }
        });
    };

    const handleMergeLesson = async () => {
        if (!mergeTargetId) return showAlert('Please select a lesson to merge with.');
        const targetLesson = allLessons?.find(s => s.id === mergeTargetId);
        if (!targetLesson) return showAlert('Target lesson not found.');
        showConfirm(`Merge "${title}" into "${targetLesson.title}"?`, async () => {
            try {
                const targetQuestions = targetLesson.questions || targetLesson.cards || [];
                const updatedLesson = {
                    ...targetLesson,
                    questions: [...targetQuestions, ...questions],
                    questionCount: (targetQuestions.length + questions.length)
                };
                await storageService.saveLesson(updatedLesson);
                if (lesson?.driveFileId) await deleteLesson(user.token, lesson.driveFileId);
                showAlert(`Lessons merged successfully!`);
                onClose();
            } catch (error) {
                showAlert('Failed to merge lessons.');
            }
        });
    };

    const toggleQuestionSelection = (questionId) => {
        setSelectedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) newSet.delete(questionId);
            else newSet.add(questionId);
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
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{lesson ? 'Edit Lesson' : 'New Lesson'}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                                        id="lesson-modal-title-input"
                                        className="neo-input"
                                        placeholder="Lesson Title "
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
                            sections.map((section, sIndex) => {
                                const sectionQuestions = section.questions || section.cards || [];
                                return (
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
                                            {sectionQuestions.map((question, index) => (
                                                <QuestionItem
                                                    key={question.id}
                                                    question={question}
                                                    index={index}
                                                    totalQuestions={sectionQuestions.length}
                                                    onUpdate={(field, val) => {
                                                        const newSections = [...sections];
                                                        const sq = newSections[sIndex].questions || newSections[sIndex].cards || [];
                                                        sq[index] = { ...question, [field]: val };
                                                        newSections[sIndex].questions = sq;
                                                        setSections(newSections);
                                                        setQuestions(newSections.flatMap(s => s.questions || s.cards));
                                                    }}
                                                    onRemove={() => {
                                                        const newSections = [...sections];
                                                        const sq = newSections[sIndex].questions || newSections[sIndex].cards || [];
                                                        sq.splice(index, 1);
                                                        newSections[sIndex].questions = sq;
                                                        setSections(newSections);
                                                        setQuestions(newSections.flatMap(s => s.questions || s.cards));
                                                    }}
                                                    onMove={(newPos) => handleMoveQuestion(index, newPos, sIndex)}
                                                    recording={recording}
                                                    startRecording={startRecording}
                                                    stopRecording={stopRecording}
                                                    cancelRecording={cancelRecording}
                                                    recordingTime={recordingTime}
                                                    handleFileUpload={handleFileUpload}
                                                    handleOptionChange={(optId, f, v) => {
                                                        const newSections = [...sections];
                                                        const sq = newSections[sIndex].questions || newSections[sIndex].cards || [];
                                                        const q = sq[index];
                                                        if (f === 'isCorrect') {
                                                            q.options = q.options.map(o => ({ ...o, isCorrect: o.id === optId }));
                                                        } else {
                                                            q.options = q.options.map(o => o.id === optId ? { ...o, [f]: v } : o);
                                                        }
                                                        newSections[sIndex].questions = sq;
                                                        setSections(newSections);
                                                        setQuestions(newSections.flatMap(s => s.questions || s.cards));
                                                    }}
                                                    setViewingImage={setViewingImage}
                                                    showSplitUI={showSplitUI}
                                                    selectedQuestions={selectedQuestions}
                                                    toggleQuestionSelection={toggleQuestionSelection}
                                                />
                                            ))}
                                        </div>
                                        <button
                                            className="neo-button"
                                            style={{ alignSelf: 'center', fontSize: '0.8rem', opacity: 0.6 }}
                                            onClick={() => {
                                                const newSections = [...sections];
                                                newSections.splice(sIndex + 1, 0, { noteSegment: '', questions: [] });
                                                setSections(newSections);
                                            }}
                                        >
                                            <Plus size={14} /> Insert Section Here
                                        </button>
                                    </div>
                                )
                            })
                        ) : (
                            questions.map((question, index) => (
                                <QuestionItem
                                    key={question.id}
                                    question={question}
                                    index={index}
                                    totalQuestions={questions.length}
                                    onUpdate={(field, val) => handleUpdateQuestion(question.id, field, val)}
                                    onRemove={() => handleRemoveQuestion(question.id)}
                                    onMove={(newPos) => handleMoveQuestion(index, newPos)}
                                    recording={recording}
                                    startRecording={startRecording}
                                    stopRecording={stopRecording}
                                    cancelRecording={cancelRecording}
                                    recordingTime={recordingTime}
                                    handleFileUpload={handleFileUpload}
                                    handleOptionChange={(optId, f, v) => handleOptionChange(question.id, optId, f, v)}
                                    setViewingImage={setViewingImage}
                                    showSplitUI={showSplitUI}
                                    selectedQuestions={selectedQuestions}
                                    toggleQuestionSelection={toggleQuestionSelection}
                                />
                            ))
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="neo-button neo-glow-blue" style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-soft)', color: 'var(--accent-color)' }} onClick={handleAddQuestion}>
                            <Plus size={18} /> Add Question
                        </button>
                        <button className="neo-button neo-glow-blue" style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-soft)', color: 'var(--accent-color)' }} onClick={handleAddMCQ}>
                            <Plus size={18} /> Add MCQ
                        </button>
                        <button className="neo-button neo-glow-blue" style={{ flex: 1, justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--accent-color)' }} onClick={handleAddSection}>
                            <Plus size={18} /> Add Section
                        </button>
                    </div>

                    {lesson && questions.length > 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    className={`neo-button ${showSplitUI ? 'neo-inset' : ''}`}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.9rem' }}
                                    onClick={() => { setShowSplitUI(!showSplitUI); setShowMergeUI(false); setSelectedQuestions(new Set()); }}
                                >
                                    <Split size={16} /> {showSplitUI ? 'Cancel Split' : 'Split Lesson'}
                                </button>
                                {allLessons && allLessons.filter(s => s.id !== lesson?.id).length > 0 && (
                                    <button
                                        className={`neo-button ${showMergeUI ? 'neo-inset' : ''}`}
                                        style={{ flex: 1, justifyContent: 'center', fontSize: '0.9rem' }}
                                        onClick={() => { setShowMergeUI(!showMergeUI); setShowSplitUI(false); setSelectedQuestions(new Set()); }}
                                    >
                                        <Merge size={16} /> {showMergeUI ? 'Cancel Merge' : 'Merge Lesson'}
                                    </button>
                                )}
                            </div>

                            {showSplitUI && (
                                <div className="neo-inset" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Select questions to move to a new lesson:</p>
                                    <button
                                        className="neo-button neo-glow-blue"
                                        style={{ background: 'var(--accent-color)', color: 'white', border: 'none', justifyContent: 'center' }}
                                        onClick={handleSplitLesson}
                                    >
                                        Create New Lesson with {selectedQuestions.size} Selected Question(s)
                                    </button>
                                </div>
                            )}

                            {showMergeUI && (
                                <div className="neo-inset" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Select lesson to merge into:</p>
                                    <NeoDropdown
                                        value={mergeTargetId}
                                        options={allLessons?.filter(s => s.id !== lesson?.id).map(s => ({
                                            label: `${s.title} (${(s.questions?.length || s.cards?.length || 0)} questions)`,
                                            value: s.id
                                        }))}
                                        onChange={setMergeTargetId}
                                        placeholder="-- Select Lesson --"
                                        displayValue={(id) => allLessons.find(s => s.id === id)?.title}
                                    />
                                    <button
                                        className="neo-button neo-glow-blue"
                                        style={{ background: 'var(--accent-color)', color: 'white', border: 'none', justifyContent: 'center' }}
                                        onClick={handleMergeLesson}
                                        disabled={!mergeTargetId}
                                    >
                                        Merge Into Selected Lesson
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

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {lesson && (
                            <button
                                className="neo-button neo-glow-red"
                                style={{ flex: '1 1 8.75rem', justifyContent: 'center', color: 'var(--error-color)', padding: '0.8rem' }}
                                onClick={() => onDelete(lesson)}
                            >
                                <Trash2 size={18} /> Delete Lesson
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
                                <><Save size={18} style={{ marginRight: '8px' }} /> {lesson ? 'Save Changes' : 'Create Lesson'}</>
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

export default AddLessonModal;
