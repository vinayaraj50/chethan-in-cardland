import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Home as HomeIcon, Plus, Menu, X, LogOut, Trash2, Sun, Moon, Share2, Copy, Github, Maximize, Minimize } from 'lucide-react';
import { initGoogleAuth, signIn, signOut } from './services/googleAuth';
import { listStacks, saveStack, deleteStack, deleteAllData, getFileContent } from './services/googleDrive';

// Components
import logo from './assets/logo.png';
import HamburgerMenu from './components/HamburgerMenu';
import AddStackModal from './components/AddStackModal';
import ReviewModal from './components/ReviewModal';
import NotificationModal from './components/NotificationModal';
import Home from './pages/Home';
import FeedbackModal from './components/FeedbackModal';
import KnowMoreModal from './components/KnowMoreModal';
import { loadPicker, showPicker } from './services/googlePicker';
import LandingPage from './components/LandingPage';
import AdPopup from './components/AdPopup';
import ImportantNotePopup from './components/ImportantNotePopup';
import defaultAdImage from './assets/default_ad.png';
import { DEMO_STACK } from './constants/demoData';
import AdminPanel from './components/AdminPanel';

// Environment Variables
const PUBLIC_FOLDER_ID = import.meta.env.VITE_PUBLIC_FOLDER_ID;
const PUBLIC_API_KEY = import.meta.env.VITE_PUBLIC_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;

const App = () => {
    const [user, setUser] = useState(null);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [stacks, setStacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sortBy, setSortBy] = useState('Creation Date');
    const [filterLabel, setFilterLabel] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('my');
    const [publicStacks, setPublicStacks] = useState([]);
    const [publicLoading, setPublicLoading] = useState(false);
    const [publicFilters, setPublicFilters] = useState({ standard: '', syllabus: '', medium: '', subject: '' });

    // Modal States
    const [showMenu, setShowMenu] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeStack, setActiveStack] = useState(null);
    const [reviewStack, setReviewStack] = useState(null);
    const [notification, setNotification] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [soundsEnabled, setSoundsEnabled] = useState(localStorage.getItem('soundsEnabled') !== 'false');
    const [showFeedback, setShowFeedback] = useState(false);
    const [showKnowMore, setShowKnowMore] = useState(false);
    const [noteStack, setNoteStack] = useState(null);

    // Ad System States
    const [showAdPopup, setShowAdPopup] = useState(false);
    const [adConfig, setAdConfig] = useState(null);
    const [isInitialAd, setIsInitialAd] = useState(false);
    const [authIssue, setAuthIssue] = useState(null);
    const [showAdminPanel, setShowAdminPanel] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Initialize Auth
    useEffect(() => {
        const handleAuthUpdate = (profile) => {
            setUser(profile);
            setShowMenu(false);
            if (profile) fetchStacks(profile.token);
            else setStacks([]);
        };

        const interval = setInterval(() => {
            if (window.google) {
                initGoogleAuth(handleAuthUpdate);
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Track User Login (Admin Analytics)
    useEffect(() => {
        if (user && PUBLIC_FOLDER_ID) {
            import('./services/adminService').then(({ checkInUser }) => {
                checkInUser(user.token, user.email, PUBLIC_FOLDER_ID).catch(err => {
                    console.warn('User tracking error:', err.message);
                });
            });
        }
    }, [user]);

    // Navigation confirmation logic
    useEffect(() => {
        if (!user) return;
        const handleBeforeUnload = (e) => {
            if (reviewStack || showAddModal) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };
        const handlePopState = (e) => {
            if (reviewStack || showAddModal) {
                const message = reviewStack ? "Exit study session?" : "Discard changes?";
                if (window.confirm(message)) {
                    setReviewStack(null);
                    setShowAddModal(false);
                } else {
                    window.history.pushState(null, '', window.location.pathname);
                }
            }
        };
        if (reviewStack || showAddModal) window.history.pushState(null, '', window.location.pathname);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [user, reviewStack, showAddModal]);

    // Other app logic
    useEffect(() => {
        const loadAds = () => {
            setAdConfig({ mediaType: 'image', mediaData: defaultAdImage, whatsappNumber: '919497449115', maxViews: 9999, isDefault: true });
            setIsInitialAd(true);
            setShowAdPopup(true);
        };
        loadAds();
    }, []);

    const fetchPublicStacks = async () => {
        if (!PUBLIC_API_KEY || !PUBLIC_FOLDER_ID) return;
        setPublicLoading(true);
        try {
            const { listPublicStacks, getPublicFileContent } = await import('./services/publicDrive');
            const files = await listPublicStacks(PUBLIC_API_KEY, PUBLIC_FOLDER_ID);
            const data = await Promise.all(files.map(async (file) => {
                try {
                    const content = await getPublicFileContent(PUBLIC_API_KEY, file.id, user?.token);
                    return { ...content, driveFileId: file.id, isPublic: true };
                } catch (e) { return null; }
            }));
            setPublicStacks(data.filter(s => s !== null));
        } catch (error) {
            console.error('Fetch public failed');
        } finally {
            setPublicLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'ready-made' && publicStacks.length === 0) fetchPublicStacks();
    }, [activeTab]);

    const handleImportStack = async (stack) => {
        if (!user) { signIn(); return; }
        setLoading(true);
        try {
            const newStack = { ...stack, id: Date.now().toString(), driveFileId: null, isPublic: false };
            const result = await saveStack(user.token, newStack);
            handleUpdateLocalStack({ ...newStack, driveFileId: result.id });
            setNotification({ type: 'alert', message: `Added "${stack.title}"!` });
        } catch (error) {
            if (error.message === 'REAUTH_NEEDED') signIn();
            else setNotification({ type: 'alert', message: 'Import failed.' });
        } finally {
            setLoading(false);
        }
    };

    const fetchStacks = async (token) => {
        setLoading(true);
        try {
            const data = await listStacks(token);
            setStacks(data);
        } catch (error) {
            if (error.message === 'REAUTH_NEEDED') signIn();
        } finally {
            setLoading(false);
        }
    };

    const getSortedStacks = () => {
        let filtered = filterLabel ? stacks.filter(s => s.label === filterLabel) : stacks;
        if (searchQuery.trim()) filtered = filtered.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
        return [...filtered].sort((a, b) => (b.id || 0) - (a.id || 0));
    };

    const handleToggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
    const handleLogoutAndClear = () => signOut(setUser);

    const handleUpdateLocalStack = (updated) => {
        setStacks(prev => {
            const index = prev.findIndex(s => s.id === updated.id || s.driveFileId === updated.driveFileId);
            if (index >= 0) {
                const copy = [...prev];
                copy[index] = { ...copy[index], ...updated };
                return copy;
            }
            return [updated, ...prev];
        });
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <div className="app-layout">
            <header className="main-header">
                <img src={logo} alt="Chethan in Cardland" style={{ height: '60px', maxWidth: '200px' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="neo-button icon-btn" onClick={toggleFullscreen}>
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                    <button className="neo-button icon-btn" onClick={() => setShowMenu(true)}>
                        <Menu size={24} />
                    </button>
                </div>
            </header>

            <div className="app-container">
                <main className="main-content">
                    <Home
                        activeTab={activeTab} setActiveTab={setActiveTab}
                        stacks={user ? getSortedStacks() : [DEMO_STACK]}
                        publicStacks={publicStacks} user={user} onLogin={signIn}
                        loading={loading} publicLoading={publicLoading}
                        onReview={(s) => s.importantNote ? setNoteStack(s) : setReviewStack(s)}
                        onEdit={(s) => { setActiveStack(s); setShowAddModal(true); }}
                        onImport={handleImportStack} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                        onShowFeedback={() => setShowFeedback(true)} filters={publicFilters} setFilters={setPublicFilters}
                        sortBy={sortBy} onSortChange={setSortBy} filterLabel={filterLabel} onLabelChange={setFilterLabel}
                        availableLabels={[]} onShowKnowMore={() => setShowKnowMore(true)}
                    />
                </main>

                <button
                    className="neo-button neo-glow-blue"
                    style={{ position: 'fixed', bottom: '2rem', right: '2rem', borderRadius: '50%', width: '60px', height: '60px', background: 'var(--accent-color)', color: 'white', zIndex: 100 }}
                    onClick={() => { if (!user) { signIn(); return; } setActiveStack(null); setShowAddModal(true); }}
                >
                    <Plus size={32} />
                </button>

                <AnimatePresence>
                    {noteStack && <ImportantNotePopup stack={noteStack} onStart={() => { setReviewStack(noteStack); setNoteStack(null); }} onClose={() => setNoteStack(null)} />}
                </AnimatePresence>
            </div>

            {showMenu && (
                <HamburgerMenu
                    user={user} theme={theme} onToggleTheme={handleToggleTheme}
                    onShowFeedback={() => { setShowMenu(false); setShowFeedback(true); }}
                    onClose={() => setShowMenu(false)} onLogout={() => signOut(setUser)} onLogin={signIn}
                    onShowAdminPanel={() => { setShowMenu(false); setShowAdminPanel(true); }}
                />
            )}

            {showAddModal && (
                <AddStackModal
                    user={user} stack={activeStack} onClose={() => setShowAddModal(false)}
                    onSave={(upd) => { handleUpdateLocalStack(upd); setShowAddModal(false); }}
                    showAlert={(msg) => setNotification({ type: 'alert', message: msg })}
                    showConfirm={(msg, cb) => setNotification({ type: 'confirm', message: msg, onConfirm: cb })}
                    publicFolderId={PUBLIC_FOLDER_ID}
                />
            )}

            {reviewStack && (
                <ReviewModal
                    stack={reviewStack} user={user} onClose={() => setReviewStack(null)}
                    onUpdate={(upd) => handleUpdateLocalStack(upd)}
                    onEdit={() => { setActiveStack(reviewStack); setReviewStack(null); setShowAddModal(true); }}
                    showAlert={(msg) => setNotification({ type: 'alert', message: msg })}
                />
            )}

            <AnimatePresence>
                {notification && (
                    <NotificationModal
                        type={notification.type} message={notification.message}
                        onConfirm={notification.onConfirm} onClose={() => setNotification(null)}
                    />
                )}
            </AnimatePresence>

            {showFeedback && <FeedbackModal user={user} onClose={() => setShowFeedback(false)} showAlert={(m) => setNotification({ type: 'alert', message: m })} />}
            <KnowMoreModal isOpen={showKnowMore} onClose={() => setShowKnowMore(false)} onLogin={() => { setShowKnowMore(false); signIn(); }} />

            <AdPopup isOpen={showAdPopup} onClose={() => setShowAdPopup(false)} adConfig={adConfig} isInitialAd={isInitialAd} authIssue={authIssue} user={user} />

            {showAdminPanel && user?.email === 'chethanincardland@gmail.com' && (
                <AdminPanel
                    user={user} onClose={() => setShowAdminPanel(false)}
                    publicStacks={publicStacks} onRefreshPublic={fetchPublicStacks}
                    publicFolderId={PUBLIC_FOLDER_ID}
                    showAlert={(m) => setNotification({ type: 'alert', message: m })}
                    showConfirm={(m, c) => setNotification({ type: 'confirm', message: m, onConfirm: c })}
                />
            )}
        </div>
    );
};

export default App;
