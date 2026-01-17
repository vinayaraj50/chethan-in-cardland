import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { AdminProvider } from '../context/AdminContext';
import AdminLayout from './admin/AdminLayout';
import IndexTable from './admin/IndexTable';
import { parseGeminiOutput } from '../utils/importUtils';
import { Check, Clipboard, AlertCircle, Edit3 } from 'lucide-react';

const AdminPanel = ({ onClose, showAlert, onEditStack, initialSection = 'users' }) => {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState(initialSection);
    const [pastedText, setPastedText] = useState('');
    const [parsedData, setParsedData] = useState(null);
    const [processError, setProcessError] = useState(null);

    // Navigation Handler
    const handleNavigation = (section) => {
        setActiveSection(section);
        setProcessError(null);
    };

    const handleProcessPaste = () => {
        try {
            setProcessError(null);
            const data = parseGeminiOutput(pastedText);
            if (!data.title && data.cards.length === 0 && data.sections.length === 0) {
                throw new Error("Could not find any valid lesson data in the paste.");
            }
            setParsedData(data);
            showAlert('Content processed successfully!');
        } catch (e) {
            setProcessError(e.message);
        }
    };

    const handleOpenInEditor = () => {
        if (parsedData && onEditStack) {
            // Transform parsedData to match expected stack structure
            const stackToEdit = {
                ...parsedData,
                id: `draft-${Date.now()}`,
                isPublic: true, // Admin-pasted content is usually intended for public
                owner: user?.email
            };
            onEditStack(stackToEdit);
            onClose(); // Close admin panel to show editor
        }
    };

    return (
        <AdminProvider>
            <AdminLayout
                activeSection={activeSection}
                onNavigate={handleNavigation}
                onClose={onClose}
            >
                {activeSection === 'users' && (
                    <IndexTable />
                )}

                {activeSection === 'smart_paste' && (
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Smart Paste (New Schema Support)</h2>
                        <p style={styles.cardDesc}>
                            Paste lesson JSON following the new hierarchical schema (sections, noteSegments, etc.).
                            The system will automatically recognize the structure.
                        </p>

                        <div style={styles.pasteWrapper}>
                            <textarea
                                style={styles.textarea}
                                placeholder="Paste JSON here..."
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                            />

                            <div style={styles.pasteActions}>
                                <button
                                    onClick={handleProcessPaste}
                                    style={styles.primaryBtn}
                                    disabled={!pastedText.trim()}
                                >
                                    <Clipboard size={16} style={{ marginRight: '8px' }} />
                                    Analyze & Process
                                </button>
                                {pastedText && (
                                    <button
                                        onClick={() => { setPastedText(''); setParsedData(null); }}
                                        style={styles.secondaryBtn}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {processError && (
                            <div style={styles.errorBanner}>
                                <AlertCircle size={18} />
                                <span>{processError}</span>
                            </div>
                        )}

                        {parsedData && (
                            <div style={styles.previewBox}>
                                <div style={styles.previewHeader}>
                                    <Check size={18} color="#008060" />
                                    <h3 style={styles.previewTitle}>Analysis Complete</h3>
                                </div>
                                <div style={styles.metaGrid}>
                                    <MetaItem label="Title" value={parsedData.title} />
                                    <MetaItem label="Subject" value={parsedData.subject} />
                                    <MetaItem label="Standard" value={parsedData.standard} />
                                    <MetaItem label="Syllabus" value={parsedData.syllabus} />
                                    <MetaItem label="Cards" value={parsedData.cards?.length} />
                                    <MetaItem label="Sections" value={parsedData.sections?.length} />
                                </div>
                                <button
                                    onClick={handleOpenInEditor}
                                    style={styles.editBtn}
                                >
                                    <Edit3 size={16} />
                                    Open in Lesson Editor
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'prompts' && (
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Prompt Library</h2>
                        <p>Manage system prompts for AI generation.</p>
                    </div>
                )}
            </AdminLayout>
        </AdminProvider>
    );
};

const MetaItem = ({ label, value }) => (
    <div style={styles.metaItem}>
        <span style={styles.metaLabel}>{label}:</span>
        <span style={styles.metaValue}>{value || 'N/A'}</span>
    </div>
);

const styles = {
    card: { background: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e1e3e5', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    cardTitle: { marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: '#202223' },
    cardDesc: { marginBottom: '1.5rem', fontSize: '0.9rem', color: '#6d7175' },
    pasteWrapper: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    textarea: {
        width: '100%', height: '200px', padding: '1rem',
        borderRadius: '4px', border: '1.5px solid #dcdfe3',
        fontFamily: 'monospace', fontSize: '0.85rem', outline: 'none',
        resize: 'vertical'
    },
    pasteActions: { display: 'flex', gap: '1rem' },
    primaryBtn: {
        padding: '0.75rem 1.5rem', background: '#008060', color: 'white',
        border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center'
    },
    secondaryBtn: {
        padding: '0.75rem 1rem', background: 'transparent', color: '#5c5f62',
        border: '1px solid #c9cccf', borderRadius: '4px', cursor: 'pointer'
    },
    errorBanner: {
        marginTop: '1rem', padding: '1rem', background: '#fff4f4', color: '#8f2316',
        borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem'
    },
    previewBox: {
        marginTop: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px',
        border: '1px solid #e1e3e5'
    },
    previewHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' },
    previewTitle: { margin: 0, fontSize: '1rem', fontWeight: 600, color: '#008060' },
    metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
    metaItem: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    metaLabel: { fontSize: '0.75rem', fontWeight: 600, color: '#6d7175', textTransform: 'uppercase' },
    metaValue: { fontSize: '0.95rem', fontWeight: 500, color: '#202223' },
    editBtn: {
        width: '100%', padding: '0.75rem', background: 'white', color: '#2c6ecb',
        border: '1px solid #2c6ecb', borderRadius: '4px', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
    }
};

export default AdminPanel;

