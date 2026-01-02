import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, RefreshCw, Search, User, Database, Zap, ChevronDown } from 'lucide-react';
import { getUsersData, getUserStats, sortUsers } from '../services/adminService';
import { parseGeminiOutput } from '../utils/importUtils';
import { saveStack, deleteStack } from '../services/googleDrive';

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
    const [sortBy, setSortBy] = useState('Last Active');
    const [searchQuery, setSearchQuery] = useState('');

    const [smartPasteText, setSmartPasteText] = useState('');
    const [parsedData, setParsedData] = useState(null);
    const [title, setTitle] = useState('');
    const [label, setLabel] = useState('No label');
    const [importantNote, setImportantNote] = useState('');
    const [standard, setStandard] = useState('');
    const [syllabus, setSyllabus] = useState('');
    const [medium, setMedium] = useState('');
    const [subject, setSubject] = useState('');

    const [dbFilters, setDbFilters] = useState({ standard: '', syllabus: '', medium: '', subject: '' });

    useEffect(() => {
        if (activeSection === 'users') fetchUsers();
    }, [activeSection]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await getUsersData(user.token, publicFolderId);
            const stats = getUserStats(data);
            setUsersData(stats);
        } catch (error) {
            showAlert('Failed to load user data.');
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
            await saveStack(user.token, {
                id: Date.now().toString(), title, label, standard, syllabus, medium, subject,
                importantNote, cards: parsedData.cards, owner: user.email
            }, null, publicFolderId);
            showAlert('Stack published!');
            setSmartPasteText(''); setParsedData(null); onRefreshPublic();
        } catch (e) { showAlert('Publish failed'); } finally { setLoading(false); }
    };

    const handleDeletePublicStack = async (stack) => {
        showConfirm(`Delete "${stack.title}"?`, async () => {
            setLoading(true);
            try { await deleteStack(user.token, stack.driveFileId); showAlert('Deleted!'); onRefreshPublic(); }
            catch (e) { showAlert('Failed'); } finally { setLoading(false); }
        });
    };

    const getSortedUsers = () => {
        const filtered = searchQuery.trim() ? usersData.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase())) : usersData;
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
        <div style={{
            position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 10000,
            display: 'flex', flexDirection: 'column', color: '#1e293b', fontFamily: 'system-ui, sans-serif'
        }}>
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
                <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', padding: '6px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} /></button>
            </header>

            <nav style={{
                display: 'flex', background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 1rem', gap: '1.5rem', overflowX: 'auto', flexShrink: 0
            }}>
                {[
                    { id: 'users', label: 'Users', icon: User },
                    { id: 'smart-paste', label: 'Smart Paste', icon: Upload },
                    { id: 'database', label: 'Database', icon: Database }
                ].map(item => (
                    <button key={item.id} onClick={() => setActiveSection(item.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '0.85rem 0',
                        background: 'none', border: 'none', fontSize: '0.85rem', fontWeight: '600',
                        color: activeSection === item.id ? '#3b82f6' : '#64748b',
                        borderBottom: `2px solid ${activeSection === item.id ? '#3b82f6' : 'transparent'}`,
                        whiteSpace: 'nowrap', cursor: 'pointer'
                    }}>
                        <item.icon size={16} /> {item.label}
                    </button>
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
                                    <button onClick={fetchUsers} style={{ height: '42px', width: '42px', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
                                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                                    </button>
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
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {getSortedUsers().length === 0 && !loading && <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No users found.</div>}
                            </div>
                        </div>
                    )}

                    {activeSection === 'smart-paste' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Paste Script Output</label>
                                <textarea
                                    value={smartPasteText} onChange={(e) => setSmartPasteText(e.target.value)}
                                    placeholder="JSON output..."
                                    style={{ width: '100%', height: '150px', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                                />
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
                                <button onClick={onRefreshPublic} style={{ height: '40px', padding: '0 10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><RefreshCw size={16} /></button>
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
        </div>
    );
};

export default AdminPanel;
