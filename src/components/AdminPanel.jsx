import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CloseButton from './common/CloseButton';
import { X, Upload, Trash2, RefreshCw, Search, User, Database, Zap, ChevronDown, Edit2, Copy, Plus } from 'lucide-react';
import { getUsersData, getUserStats, sortUsers, rebuildPublicIndex, updatePublicStackIndex, saveAdminPrompts, getAdminPrompts, saveAdminSettings, getAdminSettings } from '../services/adminService';
import { APPS_SCRIPT_URL, COIN_PACKAGES, APPS_SCRIPT_KEY } from '../constants/config';
import { parseGeminiOutput } from '../utils/importUtils';
import { saveStack, saveFile, deleteStack, listFilesInFolder, getFileContent, makeFilePublic } from '../services/googleDrive';

const SimpleSelect = ({ label, value, options, onChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>{label}</label>}
        <div style={{ position: 'relative', width: '100%' }}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    width: '100%', padding: '10px 32px 10px 12px', borderRadius: '8px',
                    border: '1px solid #e2e8f0', appearance: 'none', background: '#fff',
                    fontSize: '0.9rem', outline: 'none', cursor: 'pointer', height: '42px'
                }}
            >
                {options.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
        </div>
    </div>
);

const AdminPanel = ({ user, onClose, publicStacks, onRefreshPublic, publicFolderId, showAlert, showConfirm }) => {
    const [activeSection, setActiveSection] = useState('users');
    const [usersData, setUsersData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [sortBy, setSortBy] = useState('Last Active');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [syncingPrompts, setSyncingPrompts] = useState(false);

    const [smartPasteText, setSmartPasteText] = useState('');
    const [parsedData, setParsedData] = useState(null);
    const [title, setTitle] = useState('');
    const [label, setLabel] = useState('No label');
    const [importantNote, setImportantNote] = useState('');
    const [standard, setStandard] = useState('');
    const [syllabus, setSyllabus] = useState('');
    const [medium, setMedium] = useState('');
    const [subject, setSubject] = useState('');
    const [cost, setCost] = useState(0);

    // Persist settings to cloud instead of localStorage
    useEffect(() => {
        const fetchRemoteSettings = async () => {
            if (!user?.token || !publicFolderId) return;
            try {
                const remoteSettings = await getAdminSettings(user.token, publicFolderId);
                if (remoteSettings) {
                    if (remoteSettings.standard) setStandard(remoteSettings.standard);
                    if (remoteSettings.syllabus) setSyllabus(remoteSettings.syllabus);
                    if (remoteSettings.subject) setSubject(remoteSettings.subject);
                    if (remoteSettings.medium) setMedium(remoteSettings.medium);
                }
            } catch (e) {
                console.warn('Failed to sync settings from server');
            }
        };
        fetchRemoteSettings();
    }, [user?.token, publicFolderId]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!user?.token || !publicFolderId) return;
            // Only save if we have some values
            if (standard || syllabus || subject || medium) {
                await saveAdminSettings(user.token, publicFolderId, { standard, syllabus, subject, medium });
            }
        }, 3000); // 3-second debounce to avoid excessive writes
        return () => clearTimeout(timer);
    }, [standard, syllabus, subject, medium, user?.token, publicFolderId]);

    // Debounce search
    useEffect(() => {
        const h = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            if (activeSection === 'users') {
                setOffset(0);
                setUsersData([]);
            }
        }, 300);
        return () => clearTimeout(h);
    }, [searchQuery]);

    const [dbFilters, setDbFilters] = useState({ standard: '', syllabus: '', medium: '', subject: '' });

    const [processingAction, setProcessingAction] = useState(null); // format: 'email-action' e.g. 'john@doe.com-grant'

    useEffect(() => {
        if (activeSection === 'users') fetchUsers();
    }, [activeSection, debouncedSearch]);

    const fetchUsers = async (isNextPage = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const currentOffset = isNextPage ? offset : 0;
            const result = await getUsersData(user.token, publicFolderId, currentOffset, 50, debouncedSearch);
            const stats = getUserStats(result.data);

            if (isNextPage) {
                setUsersData(prev => [...prev, ...stats]);
            } else {
                setUsersData(stats);
            }

            setHasMore(result.hasMore);
            setOffset(result.nextOffset || 0);
            setIsBlocked(false);
        } catch (error) {
            console.error('Fetch error:', error);
            if (error.message.includes('BLOCKED_BY_CLIENT') || error.name === 'TypeError') {
                setIsBlocked(true);
            }
            showAlert('Failed to load user data. Check if an AdBlocker is blocking Google Scripts.');
        } finally {
            setLoading(false);
        }
    };

    const handleParseSmartPaste = () => {
        if (!smartPasteText.trim()) return showAlert('Paste something first');
        try {
            const result = parseGeminiOutput(smartPasteText);
            if (!result.cards.length) return showAlert('No cards found');
            setParsedData(result);
            setTitle(result.title || '');
            setLabel(result.label || 'No label');
            setImportantNote(result.importantNote || '');
        } catch (e) { showAlert('Parse failed'); }
    };

    const handlePublishStack = async () => {
        if (!parsedData || !title.trim()) return showAlert('Fields missing');
        try {
            setLoading(true);
            const newStack = {
                id: Date.now().toString(), title, label, standard, syllabus, medium, subject,
                importantNote, cards: parsedData.cards, owner: user.email, cost: parseInt(cost) || 0
            };
            const result = await saveStack(user.token, newStack, null, publicFolderId);

            // Update index immediately
            try {
                // Dynamic import removed, using static import
                await updatePublicStackIndex(user.token, publicFolderId, { ...newStack, driveFileId: result.id });
            } catch (e) {
                console.warn('Index update failed, manual rebuild may be needed', e);
            }

            showAlert('Stack published!');
            setSmartPasteText(''); setParsedData(null); onRefreshPublic();
            // Note: selections (standard, syllabus, subject) are NOT cleared to allow fast consecutive uploads.
        } catch (e) { showAlert('Publish failed'); } finally { setLoading(false); }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showAlert('Prompt copied to clipboard!');
    };

    const [editingPrompt, setEditingPrompt] = useState(null);

    const defaultPrompts = [
        { id: 1, title: "MCQ Generator", prompt: "Create 10 multiple choice questions about..." },
        { id: 2, title: "Summary", prompt: "Summarize the following text into key bullet points..." },
        { id: 3, title: "Lesson Plan", prompt: "Generate a lesson plan for 5th grade science on..." },
        { id: 4, title: "Q&A Creator", prompt: "Create 5 short answer questions and answers for..." },
        { id: 5, title: "Simplified Explainer", prompt: "Explain this topic to a 10-year old..." },
        { id: 6, title: "Keyword Extractor", prompt: "Extract 10 key terms and their definitions from..." },
        { id: 7, title: "Story Prompt", prompt: "Write a short story based on these concepts..." },
        { id: 8, title: "Translation", prompt: "Translate this text into English..." },
        { id: 9, title: "Fact Lister", prompt: "List 5 interesting and rare facts about..." },
        { id: 10, title: "Stack Splitter", prompt: "Divide this content into 3 logical flashcard sets..." }
    ];

    const [customPrompts, setCustomPrompts] = useState(() => {
        const saved = localStorage.getItem('admin_custom_prompts');
        return saved ? JSON.parse(saved) : defaultPrompts;
    });

    useEffect(() => {
        const fetchRemotePrompts = async () => {
            if (!user?.token || !publicFolderId) return;
            setSyncingPrompts(true);
            try {
                const remotePrompts = await getAdminPrompts(user.token, publicFolderId);
                if (remotePrompts && Array.isArray(remotePrompts)) {
                    // Update local state if remote is different
                    setCustomPrompts(remotePrompts);
                }
            } catch (e) {
                console.warn('Failed to sync prompts from server');
            } finally {
                setSyncingPrompts(false);
            }
        };
        fetchRemotePrompts();
    }, [user?.token, publicFolderId]);

    const handleSavePrompt = async (id, newTitle, newPrompt) => {
        const updatedPrompts = customPrompts.map(p => p.id === id ? { ...p, title: newTitle, prompt: newPrompt } : p);

        // Check if it's a new prompt
        let finalPrompts = updatedPrompts;
        if (id === 'new') {
            const nextId = Math.max(0, ...customPrompts.filter(p => typeof p.id === 'number').map(p => p.id)) + 1;
            finalPrompts = [...customPrompts, { id: nextId, title: newTitle, prompt: newPrompt }];
        }

        setCustomPrompts(finalPrompts);
        setEditingPrompt(null);
        showAlert('Prompt updated locally...');

        // Save to cloud
        setSyncingPrompts(true);
        const success = await saveAdminPrompts(user.token, publicFolderId, finalPrompts);
        setSyncingPrompts(false);

        if (success) {
            showAlert('Prompts synced to cloud!');
        } else {
            showAlert('Synced locally, but cloud save failed.');
        }
    };

    const handleDeletePrompt = async (id) => {
        showConfirm('Delete this prompt?', async () => {
            const finalPrompts = customPrompts.filter(p => p.id !== id);
            setCustomPrompts(finalPrompts);

            setSyncingPrompts(true);
            const success = await saveAdminPrompts(user.token, publicFolderId, finalPrompts);
            setSyncingPrompts(false);

            if (success) showAlert('Deleted from cloud!');
        });
    };

    const handleDeletePublicStack = async (stack) => {
        showConfirm(`Delete "${stack.title}"?`, async () => {
            setLoading(true);
            try { await deleteStack(user.token, stack.driveFileId); showAlert('Deleted!'); onRefreshPublic(); }
            catch (e) { showAlert('Failed'); } finally { setLoading(false); }
        });
    };

    // Unlimited grant function removed as per request

    const handleGrantCoins = async (targetEmail, amount) => {
        // Amount is now passed directly
        if (!amount || isNaN(amount)) return showAlert('Invalid amount');

        const actionId = `${targetEmail}-coins`;
        setProcessingAction(actionId);
        try {
            // Dynamic import removed, using static import
            const url = `${APPS_SCRIPT_URL}?action=grantCoins&email=${encodeURIComponent(targetEmail)}&amount=${amount}&adminEmail=${encodeURIComponent(user.email)}&key=${APPS_SCRIPT_KEY}&t=${Date.now()}`;
            const response = await fetch(url);
            const result = await response.json();

            if (result.error) throw new Error(result.error);
            showAlert(`Successfully granted ${amount} coins to ${targetEmail}!`);
        } catch (e) {
            console.error(e);
            showAlert('Failed to grant coins: ' + e.message);
        } finally {
            setProcessingAction(null);
        }
    };

    const handleRebuildIndex = async () => {
        setLoading(true);
        try {
            const count = await rebuildPublicIndex(user.token, publicFolderId);
            showAlert(`Index rebuilt with ${count} stacks!`);
            onRefreshPublic();
        } catch (e) {
            console.error(e);
            showAlert('Failed to rebuild index');
        } finally {
            setLoading(false);
        }
    };

    const getSortedUsers = () => {
        const filtered = debouncedSearch.trim() ? usersData.filter(u => u.email.toLowerCase().includes(debouncedSearch.toLowerCase())) : usersData;
        return sortUsers(filtered, sortBy);
    };

    const getFilteredStacks = () => publicStacks.filter(s => {
        if (dbFilters.standard && s.standard !== dbFilters.standard) return false;
        if (dbFilters.syllabus && s.syllabus !== dbFilters.syllabus) return false;
        if (dbFilters.subject && s.subject !== dbFilters.subject) return false;
        return true;
    });

    const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
                position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 10000,
                display: 'flex', flexDirection: 'column', color: '#1e293b', fontFamily: 'system-ui, sans-serif'
            }}
        >
            <header style={{
                background: '#fff', padding: '1rem', borderBottom: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: '#3b82f6', color: '#fff', padding: '6px', borderRadius: '6px' }}><Zap size={18} /></div>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>
                        Admin panel <span style={{ color: '#64748b', fontWeight: '400' }}>({usersData.length} Users)</span>
                    </h1>
                </div>
                <CloseButton onClick={onClose} size={20} style={{ border: 'none', background: '#f1f5f9' }} />
            </header>

            <nav style={{
                display: 'flex', background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 1rem', gap: '1.5rem', overflowX: 'auto', flexShrink: 0
            }}>
                {[
                    { id: 'users', label: 'Users', icon: User },
                    { id: 'smart-paste', label: 'Smart Paste', icon: Upload },
                    { id: 'database', label: 'Database', icon: Database }
                ].map(item => (
                    <motion.button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '0.85rem 0',
                            background: 'none', border: 'none', fontSize: '0.85rem', fontWeight: '600',
                            color: activeSection === item.id ? '#3b82f6' : '#64748b',
                            borderBottom: `2px solid ${activeSection === item.id ? '#3b82f6' : 'transparent'}`,
                            whiteSpace: 'nowrap', cursor: 'pointer', outline: 'none'
                        }}
                    >
                        <item.icon size={16} /> {item.label}
                    </motion.button>
                ))}
            </nav>

            <main style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                    {activeSection === 'users' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Search Users</label>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            placeholder="Email address..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{ width: '100%', padding: '10px 10px 10px 34px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <SimpleSelect label="Sort By" value={sortBy} options={['Last Active', 'Most Active', 'First Seen', 'Email'].map(s => ({ label: s, value: s }))} onChange={setSortBy} />
                                    <motion.button
                                        onClick={fetchUsers}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.92 }}
                                        style={{ height: '42px', width: '42px', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <RefreshCw size={18} className={loading && activeSection === 'users' ? 'spin' : ''} />
                                    </motion.button>
                                </div>
                            </div>

                            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            <tr>
                                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', color: '#64748b' }}>EMAIL ADDRESS</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', color: '#64748b' }}>LAST ACTIVE</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.7rem', color: '#64748b' }}>LOGINS</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.7rem', color: '#64748b' }}>ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getSortedUsers().map(u => (
                                                <tr key={u.email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.75rem', fontWeight: '500', fontSize: '0.85rem', wordBreak: 'break-all' }}>{u.email}</td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(u.lastSeen)}</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                        <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '0.7rem' }}>{u.totalLogins}</span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                            {COIN_PACKAGES.map((pkg) => {
                                                                // Determine color based on package
                                                                let bg = '#3b82f6', activeBg = '#2563eb'; // Blue (50)
                                                                if (pkg.coins === 200) { bg = '#10b981'; activeBg = '#059669'; } // Green
                                                                if (pkg.coins === 500) { bg = '#f59e0b'; activeBg = '#d97706'; } // Amber

                                                                const actionId = `${u.email}-coins-${pkg.coins}`;
                                                                const isProcessing = processingAction && processingAction.startsWith(`${u.email}-coins`) && processingAction !== actionId; // Disable other buttons while one is processing
                                                                const isThisProcessing = processingAction === actionId;

                                                                return (
                                                                    <motion.button
                                                                        key={pkg.coins}
                                                                        whileHover={{ scale: 1.05, filter: 'brightness(1.1)' }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                        onClick={() => {
                                                                            setProcessingAction(actionId);
                                                                            handleGrantCoins(u.email, pkg.coins).finally(() => setProcessingAction(null));
                                                                        }}
                                                                        disabled={!!processingAction}
                                                                        title={`Grant ${pkg.coins} Coins (₹${pkg.price})`}
                                                                        style={{
                                                                            background: isThisProcessing ? '#94a3b8' : bg,
                                                                            color: 'white', border: 'none',
                                                                            padding: '6px 8px', borderRadius: '6px', fontSize: '0.65rem',
                                                                            fontWeight: '600', cursor: !!processingAction ? 'not-allowed' : 'pointer',
                                                                            display: 'flex', alignItems: 'center', gap: '3px',
                                                                            opacity: isProcessing ? 0.5 : 1
                                                                        }}
                                                                    >
                                                                        {isThisProcessing ? <RefreshCw size={10} className="spin" /> : <Plus size={10} />}
                                                                        ₹{pkg.price} ({pkg.coins})
                                                                    </motion.button>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {getSortedUsers().length === 0 && !loading && (
                                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No users found.</div>
                                        {isBlocked && (
                                            <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#b91c1c', fontSize: '0.8rem' }}>
                                                <strong>Connection Blocked:</strong> Your browser or an extension (like an AdBlocker) is blocking the connection to the user database. Please disable AdBlock for this site.
                                            </div>
                                        )}
                                    </div>
                                )}
                                {hasMore && (
                                    <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', borderTop: '1px solid #f1f5f9' }}>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => fetchUsers(true)}
                                            disabled={loading}
                                            style={{
                                                padding: '0.75rem 1.5rem', background: '#3b82f6', color: '#fff',
                                                border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                                            }}
                                        >
                                            {loading ? 'Loading...' : 'Load More Users'}
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'smart-paste' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Paste Script Output</label>

                                <div style={{ display: 'flex', gap: '1rem', minHeight: '300px' }}>
                                    <textarea
                                        value={smartPasteText} onChange={(e) => setSmartPasteText(e.target.value)}
                                        placeholder="JSON output..."
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                                    />

                                    <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '400px', paddingRight: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>AI Prompts</label>
                                            <button
                                                onClick={() => setEditingPrompt({ id: 'new', title: '', prompt: '' })}
                                                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.65rem', fontWeight: '700' }}
                                            >
                                                <Plus size={10} /> ADD NEW
                                            </button>
                                        </div>
                                        {syncingPrompts && <div style={{ fontSize: '0.6rem', color: '#3b82f6', textAlign: 'center' }}><RefreshCw size={8} className="spin" /> Syncing...</div>}
                                        {customPrompts.map((p) => (
                                            <div
                                                key={p.id}
                                                style={{
                                                    padding: '10px',
                                                    background: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px',
                                                    position: 'relative',
                                                    transition: 'all 0.2s',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => copyToClipboard(p.prompt)}
                                                onMouseOver={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{p.title}</span>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingPrompt(p); }}
                                                            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#64748b' }}
                                                            title="Edit Prompt"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeletePrompt(p.id); }}
                                                            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#ef4444' }}
                                                            title="Delete Prompt"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                        <div style={{ color: '#3b82f6', padding: '4px' }}><Copy size={12} /></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button onClick={handleParseSmartPaste} style={{ marginTop: '0.75rem', padding: '0.6rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Analyze</button>
                            </div>
                            {parsedData && (
                                <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '2px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div><label style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b', display: 'block' }}>TITLE</label><input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                                        <div><label style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b', display: 'block' }}>TAG</label><input value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
                                        <SimpleSelect label="Class" value={standard} options={['V', 'VI', 'VII', 'VIII', 'IX', 'X'].map(s => ({ label: s, value: s }))} onChange={setStandard} />
                                        <SimpleSelect label="Board" value={syllabus} options={['NCERT', 'Kerala'].map(s => ({ label: s, value: s }))} onChange={setSyllabus} />
                                        <SimpleSelect label="Sub" value={subject} options={['Maths', 'Social', 'Science', 'English'].map(s => ({ label: s, value: s }))} onChange={setSubject} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b', display: 'block' }}>COST (COINS)</label>
                                            <input
                                                type="number"
                                                value={cost}
                                                onChange={(e) => setCost(e.target.value)}
                                                placeholder="0 for free"
                                                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', height: '42px' }}
                                            />
                                        </div>
                                    </div>
                                    <button onClick={handlePublishStack} disabled={loading} style={{ width: '100%', padding: '0.75rem', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>
                                        {loading ? 'Publishing...' : `Go Live (${parsedData.cards.length} Cards)`}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === 'database' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'flex-end' }}>
                                <div style={{ flex: '1 1 100px' }}><SimpleSelect label="Class" value={dbFilters.standard} options={[{ label: 'All', value: '' }, ...['V', 'VI', 'VII', 'VIII', 'IX', 'X'].map(s => ({ label: s, value: s }))]} onChange={v => setDbFilters({ ...dbFilters, standard: v })} /></div>
                                <div style={{ flex: '1 1 100px' }}><SimpleSelect label="Board" value={dbFilters.syllabus} options={[{ label: 'All', value: '' }, ...['NCERT', 'Kerala'].map(s => ({ label: s, value: s }))]} onChange={v => setDbFilters({ ...dbFilters, syllabus: v })} /></div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={handleRebuildIndex} title="Rebuild Master Index" style={{ height: '40px', padding: '0 10px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Database size={16} /></button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={async () => {
                                            setLoading(true);
                                            await onRefreshPublic();
                                            setLoading(false);
                                        }}
                                        style={{ height: '40px', padding: '0 10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <RefreshCw size={16} className={loading && activeSection === 'database' ? 'spin' : ''} />
                                    </motion.button>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                                {getFilteredStacks().map(s => (
                                    <div key={s.id} style={{ background: '#fff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700' }}>{s.title}</h4>
                                            <button onClick={() => handleDeletePublicStack(s)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.cards?.length || 0} Cards • {s.standard || 'All'} • {s.owner || 'System'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* Edit Prompt Modal */}
            {editingPrompt && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 20000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }} onClick={() => setEditingPrompt(null)}>
                    <div
                        style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Edit Prompt</h3>
                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Title</label>
                            <input
                                value={editingPrompt.title}
                                onChange={e => setEditingPrompt({ ...editingPrompt, title: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Prompt Text</label>
                            <textarea
                                value={editingPrompt.prompt}
                                onChange={e => setEditingPrompt({ ...editingPrompt, prompt: e.target.value })}
                                style={{ width: '100%', height: '150px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button
                                onClick={() => handleSavePrompt(editingPrompt.id, editingPrompt.title, editingPrompt.prompt)}
                                style={{ flex: 1, padding: '0.75rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => setEditingPrompt(null)}
                                style={{ padding: '0.75rem 1.25rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default AdminPanel;
