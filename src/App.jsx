import React, { useState, useEffect, useRef } from 'react';
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
import { checkSubscriptionGrant } from './services/subscriptionService';
import { ADMIN_EMAIL } from './constants/config';




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
        // Capture referral code immediately on load
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref');
        if (refParam) {
            localStorage.setItem('pendingReferral', refParam);
            // Optional: Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const handleAuthUpdate = (profile) => {
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

    // Track review progress for confirmation
    const [reviewStarted, setReviewStarted] = useState(false);

    // Track open modal count for history management
    const openModalCount = [
        reviewStack, showAddModal, showMenu, showReferralModal,
        showAdminPanel, showCoinModal, showFeedback, showKnowMore,
        showLoginPrompt, noteStack, notification?.type === 'alert'
    ].filter(Boolean).length;

    const prevModalCount = useRef(0);

    // Handle Browser Back Button & Modal History
    useEffect(() => {
        // Only push history if we INCREASED the number of modals (stacked up)
        if (openModalCount > prevModalCount.current) {
            window.history.pushState({ modalOpen: true }, '', window.location.pathname);
        }

        prevModalCount.current = openModalCount;

        const handlePopState = (e) => {
            // Priority Closing Logic - "Pop" the top-most modal

            // 1. Notification (Top)
            if (notification) {
                setNotification(null);
                // If notification was just an alert (no history push), we might need to handle history?
                // But normally we treat alerts as ephemeral. If one was open, we close it.
                // If it caused a stack increase, we are good (one back consumed).
                return;
            }

            // 2. Leaf Modals (Stacked on top of others)
            if (showLoginPrompt) { setShowLoginPrompt(false); return; }
            if (noteStack) { setNoteStack(null); return; }
            if (showReferralModal) { setShowReferralModal(false); return; }
            if (showFeedback) { setShowFeedback(false); return; }
            if (showKnowMore) { setShowKnowMore(false); return; }
            if (showAdminPanel) { setShowAdminPanel(false); return; }

            // 3. Primary Modals
            // Review Confirmation
            if (reviewStack && reviewStarted) {
                // Prevent navigation by restoring state (pushing it back)
                // because we consumed one "back" to get here, but we are refusing to leave.
                window.history.pushState({ modalOpen: true }, '', window.location.pathname);

                setNotification({
                    type: 'confirm',
                    message: "End review session? Progress will be lost.",
                    onConfirm: () => {
                        // Authorize the close so popstate keeps flow
                        setReviewStarted(false);
                        // We need to trigger the back that we cancelled/restored
                        // But simply setting state null is safer, history is already 'back' before the restore?
                        // No, we restored it. So we need to back() again.
                        window.history.back();
                    }
                });
                return;
            }
            if (reviewStack) { setReviewStack(null); return; } // Not started, just close

            if (showCoinModal) { setShowCoinModal(false); return; }
            if (showAddModal) { setShowAddModal(false); return; }
            if (showMenu) { setShowMenu(false); return; }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [
        reviewStack, showAddModal, showMenu, showReferralModal,
        showAdminPanel, showCoinModal, showFeedback, showKnowMore,
        showLoginPrompt, noteStack, notification, reviewStarted
    ]);

    // Helper to safely close modals with history check
    const safelyCloseModal = () => {
        if (reviewStack && reviewStarted) {
            setNotification({
                type: 'confirm',
                message: "End review session? Progress will be lost.",
                onConfirm: () => {
                    setReviewStarted(false);
                    window.history.back();
                }
            });
        } else {
            window.history.back();
        }
    };

    // Other app logic
    const loadUserProfile = async (token) => {
        try {
            let profile = await getUserProfile(token);

            // Check for pending referral code from URL
            const urlParams = new URLSearchParams(window.location.search);
            const refCode = urlParams.get('ref') || localStorage.getItem('pendingReferral');

            if (refCode && !profile.referredBy && profile.referralCode !== refCode) {
                // Apply referral Code
                profile = { ...profile, referredBy: refCode };
                await saveUserProfile(token, profile);

                localStorage.removeItem('pendingReferral'); // Clear after use
                setNotification({ type: 'alert', message: 'Referral code applied successfully!' });
            }

            // Check Daily Login
            const loginResult = await checkDailyLogin(token, profile);
            if (loginResult.awarded) {
                profile = loginResult.newProfile;
                setTimeout(() => setNotification({ type: 'alert', message: `Daily Login Bonus! +${loginResult.coinsAdded} Coins` }), 1000);
            }

            // Check for Unlimited Subscription Grant
            if (PUBLIC_FOLDER_ID) {
                const grant = await checkSubscriptionGrant(profile.email, PUBLIC_FOLDER_ID);
                if (grant && grant.expiry) {
                    const expiryTime = new Date(grant.expiry).getTime();
                    if (expiryTime > Date.now() && (!profile.unlimitedCoinsExpiry || expiryTime > new Date(profile.unlimitedCoinsExpiry).getTime())) {
                        // New or extended grant found
                        profile = { ...profile, unlimitedCoinsExpiry: grant.expiry };
                        await saveUserProfile(token, profile);
                        setTimeout(() => setNotification({ type: 'alert', message: "Unlimited Coins Plan Activated! 🚀" }), 1500);
                    }
                }
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

        const cost = stack.cost || 0;
        if (cost > 0) {
            if ((userProfile?.coins || 0) < cost) {
                setNotification({ type: 'alert', message: `Not enough coins! You need ${cost} coins.` });
                return;
            }
            if (!window.confirm(`Buy "${stack.title}" for ${cost} coins?`)) return;
        }

        setLoading(true);
        try {
            const newStack = { ...stack, id: Date.now().toString(), driveFileId: null, isPublic: false, cost: 0 };
            const result = await saveStack(user.token, newStack);

            if (cost > 0) {
                handleUpdateCoins(userProfile.coins - cost);
            }

            handleUpdateLocalStack({ ...newStack, driveFileId: result.id });
            setNotification({ type: 'alert', message: cost > 0 ? `Purchased "${stack.title}"!` : `Added "${stack.title}"!` });
        } catch (error) {
            if (error.message === 'REAUTH_NEEDED') signIn();
            else setNotification({ type: 'alert', message: 'Operation failed.' });
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

    const handleDeleteStack = async (stack) => {
        setLoading(true);
        try {
            if (stack.driveFileId) {
                await deleteStack(user.token, stack.driveFileId);
            }
            if (stack.isPublic) {
                fetchPublicStacks();
            } else {
                setStacks(prev => prev.filter(s => s.id !== stack.id));
            }
            setShowAddModal(false);
            setReviewStack(null);
            setNoteStack(null);
            setNotification({ type: 'alert', message: `Deleted "${stack.title}"` });
        } catch (e) {
            setNotification({ type: 'alert', message: 'Delete failed' });
        } finally {
            setLoading(false);
        }
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

    const isUnlimited = userProfile?.unlimitedCoinsExpiry && new Date(userProfile.unlimitedCoinsExpiry).getTime() > Date.now();

    return (
        <div className="app-layout">
            <header className="main-header">
                <img src={logo} alt="Chethan in Cardland" className="app-logo" />
                <div className="header-actions">
                    {user && (
                        <div onClick={() => setShowCoinModal(true)} style={{ cursor: 'pointer' }}>
                            <div onClick={() => setShowCoinModal(true)} style={{ cursor: 'pointer' }}>
                                <CoinsDisplay coins={userProfile?.coins || 0} isUnlimited={isUnlimited} />
                            </div>
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
                            // No coin deduction for reviews in the new model
                            s.importantNote ? setNoteStack(s) : setReviewStack(s);
                        }}
                        onEdit={(s) => { setActiveStack(s); setShowAddModal(true); }}
                        onImport={handleImportStack} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                        onShowFeedback={() => setShowFeedback(true)} filters={publicFilters} setFilters={setPublicFilters}
                        sortBy={sortBy} onSortChange={setSortBy} filterLabel={filterLabel} onLabelChange={setFilterLabel}
                        availableLabels={[...new Set(stacks.map(s => s.label).filter(l => l && l !== 'No label'))]} onShowKnowMore={() => setShowKnowMore(true)}
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
                            setReviewStack(noteStack);
                            setNoteStack(null);
                        }}
                        onClose={() => window.history.back()}
                        onEdit={() => { setActiveStack(noteStack); setNoteStack(null); setShowAddModal(true); }}
                    />}
                </AnimatePresence>
            </div>

            {showMenu && (
                <HamburgerMenu
                    user={user} theme={theme} onToggleTheme={handleToggleTheme}
                    soundsEnabled={soundsEnabled} onToggleSounds={() => {
                        const newValue = !soundsEnabled;
                        setSoundsEnabled(newValue);
                        localStorage.setItem('soundsEnabled', newValue);
                        return newValue;
                    }}
                    onShowFeedback={() => { setShowMenu(false); setShowFeedback(true); }}
                    onShowReferral={() => { setShowMenu(false); setShowReferralModal(true); }}
                    onClose={() => window.history.back()} onLogout={() => signOut(setUser)} onLogin={signIn}
                    onShowAdminPanel={() => { setShowMenu(false); setShowAdminPanel(true); }}
                />
            )}

            {showAddModal && (
                <AddStackModal
                    user={user} stack={activeStack} onClose={() => window.history.back()}
                    onSave={(upd) => { handleUpdateLocalStack(upd); setShowAddModal(false); }}
                    onDelete={handleDeleteStack}
                    showAlert={(msg) => setNotification({ type: 'alert', message: msg })}
                    showConfirm={(msg, cb) => setNotification({ type: 'confirm', message: msg, onConfirm: cb })}
                    publicFolderId={PUBLIC_FOLDER_ID}
                    availableLabels={[...new Set(stacks.map(s => s.label).filter(l => l && l !== 'No label'))]}
                    allStacks={stacks}
                />
            )}

            {reviewStack && (
                <ReviewModal
                    stack={reviewStack} user={user} onClose={safelyCloseModal}
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
                    onDeductCoins={(amount) => {
                        if (!isUnlimited) handleUpdateCoins((userProfile?.coins || 0) - amount);
                    }}
                    isPreviewMode={!user && reviewStack.isPublic}
                    onLoginRequired={handleLoginRequired}
                    previewProgress={previewSession}
                    isUnlimited={isUnlimited}
                    onReviewStart={() => setReviewStarted(true)}
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

            {showFeedback && <FeedbackModal user={user} onClose={() => window.history.back()} showAlert={(m) => setNotification({ type: 'alert', message: m })} />}
            <KnowMoreModal isOpen={showKnowMore} onClose={() => window.history.back()} onLogin={() => { setShowKnowMore(false); signIn(); }} />

            {showCoinModal && (
                <CoinPurchaseModal
                    user={user}
                    userCoins={userProfile?.coins || 0}
                    onClose={() => window.history.back()}
                    onShare={() => {
                        setShowCoinModal(false);
                        setShowReferralModal(true);
                    }}
                    onShowFeedback={() => {
                        setShowCoinModal(false);
                        setShowFeedback(true);
                    }}
                />
            )}

            {showReferralModal && (
                <ReferralModal
                    user={user}
                    userProfile={userProfile}
                    onClose={() => window.history.back()}
                    onUpdateProfile={(upd) => { setUserProfile(upd); saveUserProfile(user.token, upd); }}
                    showAlert={(m) => setNotification({ type: 'alert', message: m })}
                    onShowFeedback={() => {
                        setShowReferralModal(false);
                        setShowFeedback(true);
                    }}
                />
            )}

            {showAdminPanel && user?.email === ADMIN_EMAIL && (
                <AdminPanel
                    user={user} onClose={() => window.history.back()}
                    publicStacks={publicStacks} onRefreshPublic={fetchPublicStacks}
                    publicFolderId={PUBLIC_FOLDER_ID}
                    showAlert={(m) => setNotification({ type: 'alert', message: m })}
                    showConfirm={(m, c) => setNotification({ type: 'confirm', message: m, onConfirm: c })}
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
