import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import CoinRewardAnimation from './components/CoinRewardAnimation';
import NamePromptModal from './components/NamePromptModal';
import { DEMO_STACK } from './constants/data';
import { checkSubscriptionGrant } from './services/subscriptionService';
import { ADMIN_EMAIL, PUBLIC_API_KEY, PUBLIC_FOLDER_ID } from './constants/config';

const App = () => {
    // 1. State
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
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
    const [previewSession, setPreviewSession] = useState(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [reviewStarted, setReviewStarted] = useState(false);
    const [rewardData, setRewardData] = useState(null);
    const [showNamePrompt, setShowNamePrompt] = useState(false);

    // 0. Version Check (to solve Old UI issues)
    const APP_VERSION = '1.0.3'; // Increment this whenever UI changes significantly
    useEffect(() => {
        const lastVersion = localStorage.getItem('app_version');
        if (lastVersion && lastVersion !== APP_VERSION) {
            console.log('New version detected. Clearing old cache...');
            // Clear only UI/Service related cache, keep theme and sounds
            const theme = localStorage.getItem('theme');
            const sounds = localStorage.getItem('soundsEnabled');
            localStorage.clear();
            if (theme) localStorage.setItem('theme', theme);
            if (sounds) localStorage.setItem('soundsEnabled', sounds);
            localStorage.setItem('app_version', APP_VERSION);
            window.location.reload(true);
        } else {
            localStorage.setItem('app_version', APP_VERSION);
        }
    }, []);

    const prevModalCount = useRef(0);

    // 2. Logic Functions (useCallback for stable references)
    // Moving handleUpdateLocalStack to the VERY top of declarations
    const handleUpdateLocalStack = useCallback((updated) => {
        setStacks(prev => {
            const index = prev.findIndex(s => s.id === updated.id || s.driveFileId === updated.driveFileId);
            if (index >= 0) {
                const copy = [...prev];
                copy[index] = { ...copy[index], ...updated };
                return copy;
            }
            return [updated, ...prev];
        });
    }, []);

    const fetchPublicStacks = useCallback(async () => {
        if (!PUBLIC_API_KEY || !PUBLIC_FOLDER_ID) return;
        setPublicLoading(true);
        try {
            const { listPublicStacks, getPublicFileContent, getPublicIndex } = await import('./services/publicDrive');
            const indexData = await getPublicIndex(PUBLIC_API_KEY, PUBLIC_FOLDER_ID, user?.token);

            if (indexData && Array.isArray(indexData) && indexData.length > 0) {
                setPublicStacks(indexData);
            } else {
                const files = await listPublicStacks(PUBLIC_API_KEY, PUBLIC_FOLDER_ID);
                const data = await Promise.all(files.map(async (file) => {
                    try {
                        const content = await getPublicFileContent(PUBLIC_API_KEY, file.id, null);
                        return { ...content, driveFileId: file.id, isPublic: true };
                    } catch (e) { return null; }
                }));
                setPublicStacks(data.filter(s => s !== null));
            }
        } catch (error) {
            console.error('Fetch public failed');
        } finally {
            setPublicLoading(false);
        }
    }, []);

    const handleUpdateCoins = useCallback((newCoins) => {
        if (!user || !userProfile) return;
        const updated = { ...userProfile, coins: newCoins };
        setUserProfile(updated);
        saveUserProfile(user.token, updated).catch(e => console.error("Failed to save coins", e));
    }, [user, userProfile]);

    const handleImportStack = useCallback(async (stack) => {
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
            let stackToSave = { ...stack };

            // FIX: If it's a public stack and we don't have its cards yet, fetch full content
            if (stackToSave.isPublic && (!stackToSave.cards || stackToSave.cards.length === 0) && stackToSave.driveFileId) {
                console.log('Fetching full content for shallow public stack before import:', stackToSave.title);
                const { getPublicFileContent } = await import('./services/publicDrive');
                const fullContent = await getPublicFileContent(PUBLIC_API_KEY, stackToSave.driveFileId, user?.token, user?.email === ADMIN_EMAIL);
                if (fullContent && fullContent.cards) {
                    stackToSave = { ...stackToSave, ...fullContent, isPublic: true, driveFileId: stackToSave.driveFileId };
                    console.log('Successfully fetched cards for import:', stackToSave.cards.length);
                } else {
                    throw new Error('Could not fetch stack cards for import.');
                }
            }

            const newStack = { ...stackToSave, id: Date.now().toString(), driveFileId: null, isPublic: false, cost: 0 };
            const result = await saveStack(user.token, newStack);
            if (cost > 0) {
                handleUpdateCoins(userProfile.coins - cost);
            }
            handleUpdateLocalStack({ ...newStack, driveFileId: result.id });
            setNotification({ type: 'alert', message: cost > 0 ? `Purchased "${stack.title}"!` : `Added "${stack.title}"!` });
        } catch (error) {
            console.error('Import failed:', error);
            if (error.message === 'REAUTH_NEEDED') signIn();
            else setNotification({ type: 'alert', message: `Operation failed: ${error.message}` });
        } finally {
            setLoading(false);
        }
    }, [user, userProfile, handleUpdateCoins, handleUpdateLocalStack]);

    const handleDeleteStack = useCallback(async (stack) => {
        if (!stack || (!stack.id && !stack.driveFileId)) return;
        setLoading(true);
        try {
            if (stack.driveFileId && user?.token) {
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
            console.error('Delete failed:', e);
            setNotification({ type: 'alert', message: 'Delete failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    }, [user, fetchPublicStacks]);

    const fetchStacks = useCallback(async (token) => {
        setLoading(true);
        try {
            const data = await listStacks(token);
            setStacks(data);
        } catch (error) {
            if (error.message === 'REAUTH_NEEDED') signIn();
        } finally {
            setLoading(false);
        }
    }, []);

    const loadUserProfile = useCallback(async (token) => {
        try {
            let profile = await getUserProfile(token);
            const urlParams = new URLSearchParams(window.location.search);
            const refCode = urlParams.get('ref') || localStorage.getItem('pendingReferral');

            if (refCode && !profile.referredBy && profile.referralCode !== refCode) {
                profile = { ...profile, referredBy: refCode };
                await saveUserProfile(token, profile);
                localStorage.removeItem('pendingReferral');
                setNotification({ type: 'alert', message: 'Referral code applied successfully!' });
            }

            const loginResult = await checkDailyLogin(token, profile);
            if (loginResult.awarded) {
                profile = loginResult.newProfile;
                setTimeout(() => setRewardData({ amount: loginResult.coinsAdded, type: 'Daily Login' }), 1000);
            }

            if (PUBLIC_FOLDER_ID) {
                const grant = await checkSubscriptionGrant(profile.email, PUBLIC_FOLDER_ID);
                if (grant && grant.expiry) {
                    const expiryTime = new Date(grant.expiry).getTime();
                    if (expiryTime > Date.now() && (!profile.unlimitedCoinsExpiry || expiryTime > new Date(profile.unlimitedCoinsExpiry).getTime())) {
                        profile = { ...profile, unlimitedCoinsExpiry: grant.expiry };
                        await saveUserProfile(token, profile);
                        setTimeout(() => setNotification({ type: 'alert', message: "Unlimited Coins Plan Activated! 🚀" }), 1500);
                    }
                }
            }

            // Check if name is missing
            if (profile && profile.displayName === null) {
                setShowNamePrompt(true);
            }

            setUserProfile(profile);
        } catch (e) {
            console.error("Failed to load profile", e);
        }
    }, []);

    const safelyCloseModal = useCallback(() => {
        if (reviewStack && reviewStarted) {
            setNotification({
                type: 'confirm',
                message: "End review session? Progress will be lost.",
                onConfirm: () => {
                    setNotification(null);
                    setReviewStarted(false);
                    setReviewStack(null);
                    window.history.back();
                }
            });
        } else {
            window.history.back();
        }
    }, [reviewStack, reviewStarted]);

    const handleEditStack = useCallback(async (stack) => {
        let stackToEdit = stack;
        if (stackToEdit.isPublic && (!stackToEdit.cards || stackToEdit.cards.length === 0) && stackToEdit.driveFileId) {
            setLoading(true);
            try {
                const { getPublicFileContent } = await import('./services/publicDrive');
                const fullContent = await getPublicFileContent(PUBLIC_API_KEY, stackToEdit.driveFileId, user?.token, true);
                if (fullContent) {
                    stackToEdit = { ...stackToEdit, ...fullContent, isPublic: true, driveFileId: stackToEdit.driveFileId };
                    setPublicStacks(prev => prev.map(p => p.id === stack.id ? stackToEdit : p));
                } else {
                    setNotification({ type: 'alert', message: 'Stack content not found.' });
                    return;
                }
            } catch (e) {
                setNotification({ type: 'alert', message: 'Failed to load stack content' });
                return;
            } finally {
                setLoading(false);
            }
        }
        setActiveStack(stackToEdit);
        setShowAddModal(true);
    }, [user]);

    const handleLoginRequired = useCallback((progress) => {
        setPreviewSession(progress);
        setReviewStack(null);
        setShowLoginPrompt(true);
    }, []);

    // 4. Effects
    // Ensure ALL useEffects are defined AFTER their dependencies
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref');
        if (refParam) {
            localStorage.setItem('pendingReferral', refParam);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const handleAuthUpdate = (profile) => {
            setUser(profile);
            setShowMenu(false);
            if (profile) {
                fetchStacks(profile.token);
                loadUserProfile(profile.token);
            } else {
                setStacks([]);
                setUserProfile(null);
            }
        };

        const interval = setInterval(() => {
            if (window.google?.accounts?.oauth2) {
                initGoogleAuth(handleAuthUpdate);
                clearInterval(interval);
            }
        }, 500);

        // Multi-device sync: Re-fetch when window gains focus
        const handleFocus = () => {
            if (user?.token) {
                console.log('App focused, checking for updates from other devices...');
                fetchStacks(user.token);
            }
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [fetchStacks, loadUserProfile, user]);

    useEffect(() => {
        if (user && PUBLIC_FOLDER_ID) {
            import('./services/adminService').then(({ checkInUser }) => {
                checkInUser(user.token, user.email, PUBLIC_FOLDER_ID).catch(err => {
                    console.warn('User tracking error:', err.message);
                });
            });
        }
    }, [user]);

    // Resuming preview session relies on handleUpdateLocalStack
    useEffect(() => {
        const resumePreviewSession = async () => {
            if (user && previewSession) {
                setLoading(true);
                try {
                    const newStack = { ...previewSession.stack, id: Date.now().toString(), driveFileId: null, isPublic: false };
                    const result = await saveStack(user.token, newStack);
                    const importedStack = { ...newStack, driveFileId: result.id };
                    handleUpdateLocalStack(importedStack);
                    setReviewStack(importedStack);
                    setPreviewSession(null);
                    setNotification({ type: 'alert', message: `"${newStack.title}" added to My Cards!` });
                } catch (error) {
                    if (error.message === 'REAUTH_NEEDED') signIn();
                    else setNotification({ type: 'alert', message: 'Import failed.' });
                    setPreviewSession(null);
                } finally {
                    setLoading(false);
                }
            }
        };
        resumePreviewSession();
    }, [user, previewSession, handleUpdateLocalStack]);

    useEffect(() => {
        if (publicStacks.length === 0) fetchPublicStacks();
    }, [fetchPublicStacks, publicStacks.length]);

    const openModalCount = [
        reviewStack, showAddModal, showMenu, showReferralModal,
        showAdminPanel, showCoinModal, showFeedback, showKnowMore,
        showLoginPrompt, noteStack, notification?.type === 'alert', rewardData
    ].filter(Boolean).length;

    useEffect(() => {
        if (openModalCount > prevModalCount.current) {
            window.history.pushState({ modalOpen: true }, '', window.location.pathname);
        }
        prevModalCount.current = openModalCount;

        const handlePopState = (e) => {
            if (rewardData) { setRewardData(null); return; }
            if (notification) { setNotification(null); return; }
            if (showLoginPrompt) { setShowLoginPrompt(false); return; }
            if (noteStack) { setNoteStack(null); return; }
            if (showReferralModal) { setShowReferralModal(false); return; }
            if (showFeedback) { setShowFeedback(false); return; }
            if (showKnowMore) { setShowKnowMore(false); return; }
            if (showAdminPanel) { setShowAdminPanel(false); return; }

            if (reviewStack && reviewStarted) {
                window.history.pushState({ modalOpen: true }, '', window.location.pathname);
                setNotification({
                    type: 'confirm',
                    message: "End review session? Progress will be lost.",
                    onConfirm: () => {
                        setNotification(null);
                        setReviewStarted(false);
                        setReviewStack(null);
                        window.history.back();
                    }
                });
                return;
            }
            if (reviewStack) { setReviewStack(null); return; }
            if (showCoinModal) { setShowCoinModal(false); return; }
            if (showAddModal) { setShowAddModal(false); return; }
            if (showMenu) { setShowMenu(false); return; }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [
        reviewStack, showAddModal, showMenu, showReferralModal,
        showAdminPanel, showCoinModal, showFeedback, showKnowMore,
        showLoginPrompt, noteStack, notification, reviewStarted, rewardData
    ]);

    const getSortedStacks = () => {
        let filtered = filterLabel ? stacks.filter(s => s.label === filterLabel) : stacks;
        if (searchQuery.trim()) filtered = filtered.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

        return [...filtered].sort((a, b) => {
            if (sortBy === 'Title') {
                return a.title.localeCompare(b.title);
            }
            if (sortBy === 'Upcoming Review') {
                const dateA = a.nextReview ? new Date(a.nextReview) : new Date(8640000000000000);
                const dateB = b.nextReview ? new Date(b.nextReview) : new Date(8640000000000000);
                return dateA.getTime() - dateB.getTime();
            }
            if (sortBy === 'Average Rating') {
                return (b.rating || 0) - (a.rating || 0);
            }
            // Default: Creation Date (Newest first)
            return (b.id || 0) - (a.id || 0);
        });
    };

    const isUnlimited = userProfile?.unlimitedCoinsExpiry && new Date(userProfile.unlimitedCoinsExpiry).getTime() > Date.now();

    return (
        <div className="app-layout">
            <header className="main-header">
                <img src={logo} alt="Chethan in Cardland" className="app-logo" />
                <div className="header-actions">
                    {user && (
                        <div onClick={() => setShowCoinModal(true)} style={{ cursor: 'pointer' }}>
                            <CoinsDisplay coins={userProfile?.coins || 0} isUnlimited={isUnlimited} />
                        </div>
                    )}
                    <button className="neo-button icon-btn" onClick={() => {
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(() => { });
                            setIsFullscreen(true);
                        } else {
                            document.exitFullscreen();
                            setIsFullscreen(false);
                        }
                    }}>
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
                        publicStacks={publicStacks} user={user}
                        onLogin={() => signIn('consent', 0, null, (msg) => setNotification({ type: 'alert', message: msg }))}
                        loading={loading} publicLoading={publicLoading}
                        userCoins={userProfile?.coins || 0}
                        onReview={async (s) => {
                            let stackToReview = s;
                            // Load full card data if not present (for both public and private stacks with important notes)
                            if ((!stackToReview.cards || stackToReview.cards.length === 0) && stackToReview.isPublic && stackToReview.driveFileId && stackToReview.cardsCount > 0) {
                                try {
                                    setPublicLoading(true);
                                    const { getPublicFileContent } = await import('./services/publicDrive');
                                    const fullContent = await getPublicFileContent(PUBLIC_API_KEY, stackToReview.driveFileId, user?.token, user?.email === ADMIN_EMAIL);
                                    if (fullContent) {
                                        stackToReview = {
                                            ...stackToReview,
                                            ...fullContent,
                                            // Ensure metadata from index is preserved if fullContent is missing it
                                            cost: fullContent.cost !== undefined ? fullContent.cost : stackToReview.cost,
                                            importantNote: fullContent.importantNote || stackToReview.importantNote,
                                            isPublic: true,
                                            driveFileId: stackToReview.driveFileId
                                        };
                                        setPublicStacks(prev => prev.map(p => p.id === s.id ? stackToReview : p));
                                    }
                                } catch (e) {
                                    setNotification({ type: 'alert', message: 'Failed to open stack.' });
                                    return;
                                } finally {
                                    setPublicLoading(false);
                                }
                            } else if ((!stackToReview.cards || stackToReview.cards.length === 0) && !stackToReview.isPublic && stackToReview.driveFileId && user?.token) {
                                // Load private stack cards from Google Drive
                                console.log('Loading private stack cards from Drive, fileId:', stackToReview.driveFileId);
                                try {
                                    setLoading(true);
                                    const fullStack = await getFileContent(user.token, stackToReview.driveFileId);
                                    console.log('Loaded fullStack content:', {
                                        hasCards: !!fullStack?.cards,
                                        cardsLength: fullStack?.cards?.length,
                                        title: fullStack?.title
                                    });

                                    if (fullStack && fullStack.cards && fullStack.cards.length > 0) {
                                        // Merge content properties, preserve Drive metadata
                                        stackToReview = {
                                            ...stackToReview,
                                            cards: fullStack.cards,
                                            importantNote: fullStack.importantNote || stackToReview.importantNote,
                                            title: fullStack.title || stackToReview.title,
                                            label: fullStack.label || stackToReview.label,
                                        };
                                        // Update local state to cache the cards
                                        handleUpdateLocalStack(stackToReview);
                                        console.log('Successfully loaded and cached cards for stack:', stackToReview.title);
                                    } else {
                                        console.warn('Stack fetch returned no cards from user Drive. Attempting to heal if it was an imported public stack...');
                                        // HEALING: Look for matching title in public stacks
                                        const matchingPublic = publicStacks.find(ps => ps.title === stackToReview.title);
                                        if (matchingPublic && matchingPublic.driveFileId) {
                                            console.log('Found matching public source for healing:', matchingPublic.title);
                                            const { getPublicFileContent } = await import('./services/publicDrive');
                                            const recoveredContent = await getPublicFileContent(PUBLIC_API_KEY, matchingPublic.driveFileId, user?.token, user?.email === ADMIN_EMAIL);

                                            if (recoveredContent && recoveredContent.cards && recoveredContent.cards.length > 0) {
                                                console.log('Successfully recovered cards from public source. Healing user copy...');
                                                stackToReview = {
                                                    ...stackToReview,
                                                    cards: recoveredContent.cards,
                                                    importantNote: recoveredContent.importantNote || stackToReview.importantNote
                                                };
                                                // Update local state first for immediate UI response
                                                handleUpdateLocalStack(stackToReview);
                                                // Save fixed version back to user's Drive in background
                                                saveStack(user.token, stackToReview, stackToReview.driveFileId)
                                                    .then(() => console.log('Permanently healed stack on Google Drive'))
                                                    .catch(err => console.error('Failed to save healed stack back to Drive', err));
                                            } else {
                                                console.error('Failed to recover cards from public source');
                                                setNotification({ type: 'alert', message: 'This stack seems to be empty. Please add cards before reviewing.' });
                                                return;
                                            }
                                        } else {
                                            setNotification({ type: 'alert', message: 'This stack seems to be empty. Please add cards before reviewing.' });
                                            return;
                                        }
                                    }
                                } catch (e) {
                                    console.error('Failed to load stack cards:', e);
                                    setNotification({ type: 'alert', message: 'Failed to load stack content from Google Drive.' });
                                    return;
                                } finally {
                                    setLoading(false);
                                }
                            }

                            // Final safety check: if still no cards and it's not a demo stack
                            if ((!stackToReview.cards || stackToReview.cards.length === 0) && stackToReview.id !== 'demo-stack' && stackToReview.cardsCount !== undefined && stackToReview.cardsCount > 0) {
                                console.error('Final check failed: Stack has card count but no cards array', stackToReview);
                                setNotification({ type: 'alert', message: 'Something went wrong loading the cards. Please try again.' });
                                return;
                            }

                            // For guest users, always open review directly
                            if (!user && stackToReview.isPublic) {
                                setReviewStack(stackToReview);
                                return;
                            }

                            // Debug logging
                            console.log('Stack to review final state:', {
                                title: stackToReview.title,
                                hasCards: !!stackToReview.cards,
                                cardsLength: stackToReview.cards?.length,
                                hasImportantNote: !!stackToReview.importantNote
                            });

                            // Show important note popup if present, ReviewModal will handle empty cards gracefully
                            stackToReview.importantNote ? setNoteStack(stackToReview) : setReviewStack(stackToReview);
                        }}
                        onEdit={handleEditStack}
                        onImport={handleImportStack} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                        onShowFeedback={() => setShowFeedback(true)} filters={publicFilters} setFilters={setPublicFilters}
                        sortBy={sortBy} onSortChange={setSortBy} filterLabel={filterLabel} onLabelChange={setFilterLabel}
                        availableLabels={[...new Set(stacks.map(s => s.label).filter(l => l && l !== 'No label'))]} onShowKnowMore={() => setShowKnowMore(true)}
                        onDelete={handleDeleteStack}
                        showConfirm={(msg, cb) => setNotification({ type: 'confirm', message: msg, onConfirm: cb })}
                        onAddStack={() => { setActiveStack(null); setShowAddModal(true); }}
                        onRefresh={() => {
                            if (activeTab === 'my' && user) fetchStacks(user.token);
                            else fetchPublicStacks();
                        }}
                    />
                </main>

                {user && (
                    <button className="neo-button neo-glow-blue fab-add-button" onClick={() => { setActiveStack(null); setShowAddModal(true); }}>
                        <Plus size={32} />
                    </button>
                )}

                <AnimatePresence>
                    {noteStack && <ImportantNotePopup
                        stack={noteStack} user={user}
                        onStart={() => { setReviewStack(noteStack); setNoteStack(null); }}
                        onClose={() => window.history.back()}
                        onEdit={() => { setActiveStack(noteStack); setNoteStack(null); setShowAddModal(true); }}
                        onDelete={() => handleDeleteStack(noteStack)}
                        showConfirm={(msg, cb) => setNotification({ type: 'confirm', message: msg, onConfirm: cb })}
                    />}
                </AnimatePresence>
            </div>

            {showMenu && (
                <HamburgerMenu
                    user={user} theme={theme} onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                    soundsEnabled={soundsEnabled} onToggleSounds={() => {
                        const newValue = !soundsEnabled;
                        setSoundsEnabled(newValue);
                        localStorage.setItem('soundsEnabled', newValue);
                        return newValue;
                    }}
                    onShowFeedback={() => { setShowMenu(false); setShowFeedback(true); }}
                    onShowReferral={() => { setShowMenu(false); setShowReferralModal(true); }}
                    onClose={() => window.history.back()} onLogout={() => signOut(setUser)}
                    onLogin={() => signIn('consent', 0, null, (msg) => setNotification({ type: 'alert', message: msg }))}
                    onShowAdminPanel={() => { setShowMenu(false); setShowAdminPanel(true); }}
                    appVersion={APP_VERSION}
                />
            )}

            {showAddModal && (
                <AddStackModal
                    user={user} stack={activeStack} onClose={() => window.history.back()}
                    onSave={(upd, shouldClose, isPublishing) => {
                        handleUpdateLocalStack(upd);
                        if (upd.isPublic || isPublishing) fetchPublicStacks();
                        if (shouldClose !== false) setShowAddModal(false);
                    }}
                    onDelete={handleDeleteStack}
                    showAlert={(msg) => setNotification({ type: 'alert', message: msg })}
                    showConfirm={(msg, cb) => setNotification({ type: 'confirm', message: msg, onConfirm: cb })}
                    publicFolderId={PUBLIC_FOLDER_ID}
                    availableLabels={[...new Set(stacks.map(s => s.label).filter(l => l && l !== 'No label'))]}
                    allStacks={stacks}
                    activeTab={activeTab}
                />
            )}

            {reviewStack && (
                <ReviewModal
                    stack={reviewStack} user={user} onClose={safelyCloseModal}
                    onUpdate={(upd) => handleUpdateLocalStack(upd)}
                    onEdit={() => { setActiveStack(reviewStack); setReviewStack(null); setShowAddModal(true); }}
                    onDuplicate={handleImportStack}
                    showAlert={(obj) => typeof obj === 'string' ? setNotification({ type: 'alert', message: obj }) : setNotification(obj)}
                    userCoins={userProfile?.coins || 0}
                    onDeductCoins={(amount) => { if (!isUnlimited) handleUpdateCoins((userProfile?.coins || 0) - amount); }}
                    isPreviewMode={!user && reviewStack.isPublic}
                    onLoginRequired={handleLoginRequired}
                    previewProgress={previewSession}
                    isUnlimited={isUnlimited}
                    onReviewStart={() => setReviewStarted(true)}
                    displayName={userProfile?.displayName}
                />
            )}

            <AnimatePresence>
                {notification && <NotificationModal type={notification.type} message={notification.message} onConfirm={notification.onConfirm} onClose={() => setNotification(null)} />}
            </AnimatePresence>

            {showFeedback && <FeedbackModal user={user} onClose={() => window.history.back()} showAlert={(m) => setNotification({ type: 'alert', message: m })} />}
            <KnowMoreModal isOpen={showKnowMore} onClose={() => window.history.back()} onLogin={() => { setShowKnowMore(false); signIn('consent', 0, null, (msg) => setNotification({ type: 'alert', message: msg })); }} />

            {showCoinModal && (
                <CoinPurchaseModal
                    user={user} userCoins={userProfile?.coins || 0} onClose={() => window.history.back()}
                    onShare={() => { setShowCoinModal(false); setShowReferralModal(true); }}
                    onShowFeedback={() => { setShowCoinModal(false); setShowFeedback(true); }}
                />
            )}

            {showReferralModal && (
                <ReferralModal
                    user={user} userProfile={userProfile} onClose={() => window.history.back()}
                    onUpdateProfile={(upd) => { setUserProfile(upd); saveUserProfile(user.token, upd); }}
                    showAlert={(m) => setNotification({ type: 'alert', message: m })}
                    onShowFeedback={() => { setShowReferralModal(false); setShowFeedback(true); }}
                />
            )}

            {showAdminPanel && user?.email === ADMIN_EMAIL && (
                <AdminPanel
                    user={user} onClose={() => window.history.back()}
                    publicStacks={publicStacks} onRefreshPublic={fetchPublicStacks}
                    publicFolderId={PUBLIC_FOLDER_ID}
                    showAlert={(m) => setNotification({ type: 'alert', message: m })}
                    showConfirm={(m, c) => setNotification({ type: 'confirm', message: m, onConfirm: c })}
                    onEditStack={handleEditStack}
                />
            )}

            {showLoginPrompt && previewSession && (
                <LoginPromptModal
                    onLogin={() => { setShowLoginPrompt(false); signIn('consent', 0, null, (msg) => setNotification({ type: 'alert', message: msg })); }}
                    onCancel={() => { setShowLoginPrompt(false); setPreviewSession(null); setReviewStack(null); }}
                    cardsReviewed={previewSession.sessionRatings?.length || 0}
                    totalCards={previewSession.stack?.cards?.length || 0}
                />
            )}

            <AnimatePresence>
                {rewardData && (
                    <CoinRewardAnimation
                        amount={rewardData.amount}
                        type={rewardData.type}
                        onClose={() => setRewardData(null)}
                    />
                )}
            </AnimatePresence>

            {showNamePrompt && (
                <NamePromptModal
                    onSave={async (name) => {
                        const updated = { ...userProfile, displayName: name };
                        setUserProfile(updated);
                        setShowNamePrompt(false);
                        await saveUserProfile(user.token, updated);
                        setNotification({ type: 'alert', message: `Nice to meet you, ${name}!` });
                    }}
                />
            )}
        </div>
    );
};

export default App;
