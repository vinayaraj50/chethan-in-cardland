import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Home as HomeIcon, Plus, Menu, X, LogOut, Trash2, Sun, Moon, Share2, Copy, Maximize, Minimize } from 'lucide-react';
import { initGoogleAuth, signIn, signOut } from './services/googleAuth';
import { listStacks, saveStack, deleteStack, deleteAllData, getFileContent } from './services/googleDrive';
import { getUserProfile, saveUserProfile, checkDailyLogin } from './services/userProfile';

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
import ImportantNotePopup from './components/ImportantNotePopup';
import CoinsDisplay from './components/CoinsDisplay';
import ReferralModal from './components/ReferralModal';
import AdminPanel from './components/AdminPanel';
import CoinPurchaseModal from './components/CoinPurchaseModal';
import LoginPromptModal from './components/LoginPromptModal';
import { DEMO_STACK } from './constants/data';




// Environment Variables
const PUBLIC_FOLDER_ID = import.meta.env.VITE_PUBLIC_FOLDER_ID;
const PUBLIC_API_KEY = import.meta.env.VITE_PUBLIC_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;

const App = () => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null); // { coins, lastLoginDate, driveFileId, ... }
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

    const [showReferralModal, setShowReferralModal] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [showCoinModal, setShowCoinModal] = useState(false);

    // Preview Mode State
    const [previewSession, setPreviewSession] = useState(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);



    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Initialize Auth
    useEffect(() => {
        const handleAuthUpdate = (profile) => {
            setUser(profile);
            setShowMenu(false);
            setUser(profile);
            setShowMenu(false);
            if (profile) {
                fetchStacks(profile.token);
                loadUserProfile(profile.token);
            }
            else {
                setStacks([]);
                setUserProfile(null);
            }
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

    // Handle Preview Session Resume After Login
    useEffect(() => {
        const resumePreviewSession = async () => {
            if (user && previewSession) {
                setLoading(true);
                try {
                    // Import the stack to user's collection
                    const newStack = {
                        ...previewSession.stack,
                        id: Date.now().toString(),
                        driveFileId: null,
                        isPublic: false
                    };
                    const result = await saveStack(user.token, newStack);
                    const importedStack = { ...newStack, driveFileId: result.id };
                    handleUpdateLocalStack(importedStack);

                    // Resume review with the imported stack
                    setReviewStack(importedStack);

                    // Clear preview session
                    setPreviewSession(null);
                    setNotification({ type: 'alert', message: `"${newStack.title}" added to My Cards!` });
                } catch (error) {
                    if (error.message === 'REAUTH_NEEDED') signIn();
                    else setNotification({ type: 'alert', message: 'Import failed. Please try again.' });
                    setPreviewSession(null);
                } finally {
                    setLoading(false);
                }
            }
        };
        resumePreviewSession();
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

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [user, reviewStack, showAddModal]);

    // Handle Back Button specifically for closing modals
    useEffect(() => {
        if (reviewStack || showAddModal) {
            // Push state only when a modal opens
            window.history.pushState({ modal: true }, '', window.location.pathname);

            const handlePopState = (e) => {
                // User pressed back. Close the modal immediately like the close button.
                if (reviewStack) {
                    setReviewStack(null);
                } else if (showAddModal) {
                    setShowAddModal(false);
                }
            };

            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
                // Clean up history state if we close programmatically? 
                // It's tricky to remove history items. 
                // Mostly we just let the user navigate forward/back naturally.
            };
        }
    }, [reviewStack !== null, showAddModal]); // Only re-run when open state changes boolean value

    // Other app logic
    // Other app logic
    const loadUserProfile = async (token) => {
        try {
            let profile = await getUserProfile(token);
            // Check Daily Login
            const loginResult = await checkDailyLogin(token, profile);
            if (loginResult.awarded) {
                profile = loginResult.newProfile;
                setTimeout(() => setNotification({ type: 'alert', message: `Daily Login Bonus! +${loginResult.coinsAdded} Coins` }), 1000);
            }
            setUserProfile(profile);
        } catch (e) {
            console.error("Failed to load profile", e);
        }
    };

    const handleUpdateCoins = (newCoins) => {
        if (!user || !userProfile) return;
        const updated = { ...userProfile, coins: newCoins };
        setUserProfile(updated);
        saveUserProfile(user.token, updated).catch(e => console.error("Failed to save coins", e));
    };

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
        if (publicStacks.length === 0) fetchPublicStacks();
    }, []);

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

    const handleLoginRequired = (progress) => {
        setPreviewSession(progress);
        setReviewStack(null);
        setShowLoginPrompt(true);
    };

    const handleLoginPromptConfirm = () => {
        setShowLoginPrompt(false);
        signIn();
    };

    const handleLoginPromptCancel = () => {
        setShowLoginPrompt(false);
        setPreviewSession(null);
        setReviewStack(null);
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
                <img src={logo} alt="Chethan in Cardland" className="app-logo" />
                <div className="header-actions">
                    {user && (
                        <div onClick={() => setShowCoinModal(true)} style={{ cursor: 'pointer' }}>
                            <CoinsDisplay coins={userProfile?.coins || 0} />
                        </div>
                    )}
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
                        userCoins={userProfile?.coins || 0}
                        onReview={(s) => {
                            // For ready-made stacks without login, allow preview mode
                            if (!user && s.isPublic) {
                                setReviewStack(s);
                                return;
                            }
                            // Check coins before review for logged-in users, but skip for public/demo stacks
                            if (user && !s.isPublic && s.id !== 'demo-stack' && (userProfile?.coins || 0) < 5) {
                                setNotification({ type: 'alert', message: "Not enough coins! You need 5 coins to review." });
                                return;
                            }
                            s.importantNote ? setNoteStack(s) : setReviewStack(s);
                        }}
                        onEdit={(s) => { setActiveStack(s); setShowAddModal(true); }}
                        onImport={handleImportStack} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                        onShowFeedback={() => setShowFeedback(true)} filters={publicFilters} setFilters={setPublicFilters}
                        sortBy={sortBy} onSortChange={setSortBy} filterLabel={filterLabel} onLabelChange={setFilterLabel}
                        availableLabels={[]} onShowKnowMore={() => setShowKnowMore(true)}
                    />
                </main>

                {user && (
                    <button
                        className="neo-button neo-glow-blue fab-add-button"
                        onClick={() => { setActiveStack(null); setShowAddModal(true); }}
                    >
                        <Plus size={32} />
                    </button>
                )}

                <AnimatePresence>
                    {noteStack && <ImportantNotePopup
                        stack={noteStack}
                        user={user}
                        onStart={() => {
                            if (noteStack.isPublic || noteStack.id === 'demo-stack' || (userProfile?.coins || 0) >= 5) {
                                setReviewStack(noteStack);
                                setNoteStack(null);
                            } else {
                                setNotification({ type: 'alert', message: "Not enough coins!" });
                            }
                        }}
                        onClose={() => setNoteStack(null)}
                        onEdit={() => { setActiveStack(noteStack); setNoteStack(null); setShowAddModal(true); }}
                    />}
                </AnimatePresence>
            </div>

            {showMenu && (
                <HamburgerMenu
                    user={user} theme={theme} onToggleTheme={handleToggleTheme}
                    soundsEnabled={soundsEnabled} onToggleSounds={() => setSoundsEnabled(prev => {
                        const newValue = !prev;
                        localStorage.setItem('soundsEnabled', newValue);
                        return newValue;
                    })}
                    onShowFeedback={() => { setShowMenu(false); setShowFeedback(true); }}
                    onShowReferral={() => { setShowMenu(false); setShowReferralModal(true); }}
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
                    availableLabels={[...new Set(stacks.map(s => s.label).filter(l => l && l !== 'No label'))]}
                    allStacks={stacks}
                />
            )}

            {reviewStack && (
                <ReviewModal
                    stack={reviewStack} user={user} onClose={() => setReviewStack(null)}
                    onUpdate={(upd) => handleUpdateLocalStack(upd)}
                    onEdit={() => { setActiveStack(reviewStack); setReviewStack(null); setShowAddModal(true); }}
                    onDuplicate={handleImportStack}
                    showAlert={(notificationObj) => {
                        if (typeof notificationObj === 'string') {
                            setNotification({ type: 'alert', message: notificationObj });
                        } else {
                            setNotification(notificationObj);
                        }
                    }}
                    userCoins={userProfile?.coins || 0}
                    onDeductCoins={(amount) => handleUpdateCoins((userProfile?.coins || 0) - amount)}
                    isPreviewMode={!user && reviewStack.isPublic}
                    onLoginRequired={handleLoginRequired}
                    previewProgress={previewSession}
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

            {showReferralModal && (
                <ReferralModal
                    user={user}
                    userProfile={userProfile}
                    onClose={() => setShowReferralModal(false)}
                    onUpdateProfile={(upd) => { setUserProfile(upd); saveUserProfile(user.token, upd); }}
                    showAlert={(m) => setNotification({ type: 'alert', message: m })}
                />
            )}

            {showAdminPanel && user?.email === 'chethanincardland@gmail.com' && (
                <AdminPanel
                    user={user} onClose={() => setShowAdminPanel(false)}
                    publicStacks={publicStacks} onRefreshPublic={fetchPublicStacks}
                    publicFolderId={PUBLIC_FOLDER_ID}
                    showAlert={(m) => setNotification({ type: 'alert', message: m })}
                    showConfirm={(m, c) => setNotification({ type: 'confirm', message: m, onConfirm: c })}
                />
            )}

            {showCoinModal && (
                <CoinPurchaseModal
                    userCoins={userProfile?.coins || 0}
                    onClose={() => setShowCoinModal(false)}
                    onShare={() => {
                        setShowCoinModal(false);
                        setShowReferralModal(true);
                    }}
                />
            )}

            {showLoginPrompt && previewSession && (
                <LoginPromptModal
                    onLogin={handleLoginPromptConfirm}
                    onCancel={handleLoginPromptCancel}
                    cardsReviewed={previewSession.sessionRatings?.length || 0}
                    totalCards={previewSession.stack?.cards?.length || 0}
                />
            )}
        </div>
    );
};

export default App;
