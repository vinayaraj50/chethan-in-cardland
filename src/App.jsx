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
    const [activeTab, setActiveTab] = useState('my'); // 'my' is now the default landing page
    const [publicStacks, setPublicStacks] = useState([]);
    const [publicLoading, setPublicLoading] = useState(false);
    const [publicFilters, setPublicFilters] = useState({
        standard: '',
        syllabus: '',
        medium: '',
        subject: ''
    });

    // Modal States
    const [showMenu, setShowMenu] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeStack, setActiveStack] = useState(null);
    const [reviewStack, setReviewStack] = useState(null);
    const [notification, setNotification] = useState(null); // { type, message, onConfirm }
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [soundsEnabled, setSoundsEnabled] = useState(localStorage.getItem('soundsEnabled') !== 'false');
    const [showFeedback, setShowFeedback] = useState(false);
    const [showKnowMore, setShowKnowMore] = useState(false);
    const [noteStack, setNoteStack] = useState(null);

    // Ad System States
    const [showAdPopup, setShowAdPopup] = useState(false);
    const [adConfig, setAdConfig] = useState(null);
    const [isInitialAd, setIsInitialAd] = useState(false);
    const [authIssue, setAuthIssue] = useState(null); // { type: 'permission' | 'storage', message: string }

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleAuthUpdate = (profile) => {
            setUser(profile);
            setShowMenu(false); // Ensure menu is closed on login
            if (profile) {
                fetchStacks(profile.token);
            } else {
                setStacks([]);
            }
        };

        // Wait for Google script to load
        const interval = setInterval(() => {
            if (window.google) {
                initGoogleAuth(handleAuthUpdate);
                clearInterval(interval);
            }
        }, 500);

        return () => clearInterval(interval);
    }, []);

    // Navigation confirmation logic
    useEffect(() => {
        if (!user) return;

        const handleBeforeUnload = (e) => {
            if (reviewStack || showAddModal) {
                e.preventDefault();
                e.returnValue = ''; // Standard way to trigger browser confirmation
                return '';
            }
        };

        const handlePopState = (e) => {
            if (reviewStack || showAddModal) {
                const message = reviewStack
                    ? "Study session in progress. Exit and lose progress?"
                    : "You have unsaved changes. Discard them and exit?";

                if (window.confirm(message)) {
                    setReviewStack(null);
                    setShowAddModal(false);
                } else {
                    // Push state back to stay on the current view
                    window.history.pushState(null, '', window.location.pathname);
                }
            }
        };

        // If a modal is open, ensure we have a history state to catch the 'Back' click
        if (reviewStack || showAddModal) {
            window.history.pushState(null, '', window.location.pathname);
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [user, reviewStack, showAddModal]);

    // Ad Logic - Show on mount
    useEffect(() => {
        const loadAds = async () => {
            // Force usage of src/assets/default_ad.png for all users
            const configToShow = {
                mediaType: 'image',
                mediaData: defaultAdImage,
                whatsappNumber: '919497449115',
                maxViews: 9999,
                isDefault: true
            };

            setAdConfig(configToShow);
            setIsInitialAd(true);
            setShowAdPopup(true);
        };

        loadAds();
    }, []);

    // Background checks for permissions and storage
    useEffect(() => {
        if (user) {
            const performBackgroundChecks = async () => {
                setAuthIssue(null);

                // 1. Check Permissions
                if (user.hasDrivePermission === false) {
                    setAuthIssue({
                        type: 'permission',
                        message: 'Google Drive permission not granted. The app won\'t be able to save your stacks.'
                    });
                    return;
                }

                // 2. Check Storage (25MB = 25 * 1024 * 1024 bytes)
                try {
                    const { getStorageQuota } = await import('./services/googleDrive');
                    const quota = await getStorageQuota(user.token);
                    const limit = parseInt(quota.limit);
                    const usage = parseInt(quota.usage);
                    const remaining = limit - usage;

                    if (limit !== -1 && remaining < 25 * 1024 * 1024) {
                        setAuthIssue({
                            type: 'storage',
                            message: `Low storage space in Google Drive (${(remaining / (1024 * 1024)).toFixed(1)}MB remaining).`
                        });
                    }
                } catch (e) {
                    console.warn('Failed to check storage quota:', e);
                }
            };

            performBackgroundChecks();
        }
    }, [user]);


    const fetchPublicStacks = async () => {
        if (!PUBLIC_API_KEY || !PUBLIC_FOLDER_ID) {
            console.error('Missing Public Drive Config:', { PUBLIC_API_KEY, PUBLIC_FOLDER_ID });
            setNotification({
                type: 'alert',
                message: 'Community flashcards configuration is incomplete. Please check your environment variables.'
            });
            return;
        }
        setPublicLoading(true);
        try {
            const { listPublicStacks, getPublicFileContent } = await import('./services/publicDrive');
            const files = await listPublicStacks(PUBLIC_API_KEY, PUBLIC_FOLDER_ID);

            const stacks = await Promise.all(files.map(async (file) => {
                try {
                    const content = await getPublicFileContent(PUBLIC_API_KEY, file.id);
                    return {
                        ...content,
                        driveFileId: file.id,
                        isPublic: true // Identifies it's from the community pool
                    };
                } catch (e) {
                    console.warn(`Failed to fetch content for public file ${file.id}:`, e);
                    return null;
                }
            }));
            setPublicStacks(stacks.filter(s => s !== null));
        } catch (error) {
            console.error('Failed to fetch public stacks:', error);
        } finally {
            setPublicLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'ready-made' && publicStacks.length === 0) {
            fetchPublicStacks();
        }
    }, [activeTab]);

    const handleImportStack = async (stack) => {
        if (!user) {
            signIn();
            return;
        }
        setLoading(true);
        try {
            const newStack = {
                ...stack,
                id: Date.now().toString(),
                avgRating: null,
                lastReviewed: null,
                driveFileId: null, // Force create new file in user's drive
                isPublic: false
            };
            const result = await saveStack(user.token, newStack);
            handleUpdateLocalStack({ ...newStack, driveFileId: result.id });
            setNotification({ type: 'alert', message: `Added "${stack.title}" to your library!` });
        } catch (error) {
            if (error.message === 'REAUTH_NEEDED') {
                signIn();
            } else {
                setNotification({ type: 'alert', message: 'Failed to import stack.' });
            }
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
            if (error.message === 'REAUTH_NEEDED') {
                signIn(); // Prompt for re-auth
            }
            // SECURITY FIX (VULN-006): Don't log error details
        } finally {
            setLoading(false);
        }
    };

    const getAvailableLabels = () => {
        const labels = new Set();
        stacks.forEach(stack => {
            if (stack.label && stack.label !== 'No label') {
                labels.add(stack.label);
            }
        });
        return Array.from(labels).sort();
    };

    const getSortedStacks = () => {
        let filtered = filterLabel
            ? stacks.filter(stack => stack.label === filterLabel)
            : stacks;

        // Apply search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(stack =>
                stack.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        const sorted = [...filtered];
        switch (sortBy) {
            case 'Number of Cards':
                return sorted.sort((a, b) => (b.cards?.length || 0) - (a.cards?.length || 0));
            case 'Average Rating':
                return sorted.sort((a, b) => (parseFloat(b.avgRating) || 0) - (parseFloat(a.avgRating) || 0));
            case 'Last Reviewed':
                return sorted.sort((a, b) => {
                    if (!a.lastReviewed) return 1;
                    if (!b.lastReviewed) return -1;
                    return new Date(b.lastReviewed) - new Date(a.lastReviewed);
                });
            case 'Creation Date':
            default:
                return sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
        }
    };

    const handleToggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleToggleSounds = () => {
        const newValue = !soundsEnabled;
        setSoundsEnabled(newValue);
        localStorage.setItem('soundsEnabled', newValue);
    };

    const handleDeleteAll = async () => {
        setNotification({
            type: 'confirm',
            message: 'Are you sure you want to delete ALL your data? This cannot be undone.',
            onConfirm: async () => {
                await deleteAllData(user.token);
                setStacks([]);
                setNotification({ type: 'alert', message: 'Data deleted successfully.' });
            }
        });
    };

    const handleLogoutAndClear = async () => {
        setNotification({
            type: 'confirm',
            message: 'Delete all data and log out?',
            onConfirm: async () => {
                await deleteAllData(user.token);
                signOut(setUser);
            }
        });
    };

    const handleDeleteStack = async (stack) => {
        setNotification({
            type: 'confirm',
            message: `Are you sure you want to delete "${stack.title}"?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    await deleteStack(user.token, stack.driveFileId);
                    setStacks(prev => prev.filter(s => s.driveFileId !== stack.driveFileId));
                    setShowAddModal(false);
                    setReviewStack(null);
                } catch (error) {
                    if (error.message === 'REAUTH_NEEDED') {
                        signIn();
                    } else {
                        console.error('Failed to delete stack:', error);
                        setNotification({ type: 'alert', message: 'Failed to delete stack.' });
                    }
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleUpdateLocalStack = (updatedStack, publishedToCommunity = false) => {
        if (publishedToCommunity) {
            fetchPublicStacks();
        }

        setStacks(prev => {
            const index = prev.findIndex(s => s.id === updatedStack.id || s.driveFileId === updatedStack.driveFileId);
            if (index >= 0) {
                const newStacks = [...prev];
                // Preserve additional properties from drive list like ownedByMe, ownerName etc if present
                newStacks[index] = { ...newStacks[index], ...updatedStack };
                return newStacks;
            } else {
                return [updatedStack, ...prev];
            }
        });
    };

    const handleDuplicateStack = async (stack) => {
        setNotification({
            type: 'confirm',
            message: `Do you want to duplicate "${stack.title}"?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    const newStack = {
                        ...stack,
                        id: Date.now().toString(),
                        title: `${stack.title} (Copy)`,
                        avgRating: null,
                        lastReviewed: null,
                        driveFileId: null // Force create new file
                    };
                    const result = await saveStack(user.token, newStack);
                    handleUpdateLocalStack({ ...newStack, driveFileId: result.id });
                } catch (error) {
                    if (error.message === 'REAUTH_NEEDED') {
                        signIn();
                    } else {
                        // SECURITY FIX (VULN-006): Don't log error details
                        setNotification({ type: 'alert', message: 'Failed to duplicate stack.' });
                    }
                } finally {
                    setLoading(false);
                }
            }
        });
    };



    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                // SECURITY FIX (VULN-006): Don't log error details
                // Silently fail if fullscreen is not supported
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };



    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // LandingPage logic is removed as we now land directly on the Community (ready-made) tab.
    // Guests see community stacks and a demo stack in 'My Cards'.

    return (
        <div className="app-layout">
            <header className="main-header">
                <img src={logo} alt="Chethan in Cardland" style={{ height: '60px', maxWidth: '200px', objectFit: 'contain' }} />

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="neo-button icon-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                    <button
                        className="neo-button icon-btn"
                        onClick={() => {
                            console.log('Opening menu...');
                            setShowMenu(true);
                        }}
                        aria-label="Open Menu"
                        style={{
                            cursor: 'pointer',
                            background: 'var(--bg-color)',
                            boxShadow: '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)'
                        }}
                    >
                        <Menu size={24} strokeWidth={2.5} color="var(--text-color)" />
                    </button>
                </div>
            </header>

            <div className="app-container">
                <main className="main-content">
                    <Home
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        stacks={user ? getSortedStacks() : [DEMO_STACK]}
                        publicStacks={publicStacks}
                        user={user}
                        onLogin={() => signIn()}
                        loading={loading}
                        publicLoading={publicLoading}
                        onReview={(stack) => {
                            if (stack.importantNote) {
                                setNoteStack(stack);
                            } else {
                                setReviewStack(stack);
                            }
                        }}
                        onEdit={(stack) => { setActiveStack(stack); setShowAddModal(true); }}
                        onImport={handleImportStack}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        onShowFeedback={() => setShowFeedback(true)}
                        filters={publicFilters}
                        setFilters={setPublicFilters}
                        sortBy={sortBy}
                        onSortChange={setSortBy}
                        filterLabel={filterLabel}
                        onLabelChange={setFilterLabel}
                        availableLabels={getAvailableLabels()}
                        onShowKnowMore={() => setShowKnowMore(true)}
                    />
                </main>

                {/* Floating Action Button */}
                <button
                    className="neo-button neo-glow-blue"
                    style={{
                        position: 'fixed', bottom: '2rem', right: '2rem', borderRadius: '50%', width: '60px', height: '60px',
                        justifyContent: 'center', background: 'var(--accent-color)', color: 'white', border: 'none',
                        zIndex: 100 // Ensure it's above content but below modals
                    }}
                    onClick={() => {
                        if (!user) {
                            signIn();
                            return;
                        }
                        setActiveStack(null);
                        setShowAddModal(true);
                    }}
                >
                    <Plus size={32} />
                </button>

                <AnimatePresence>
                    {noteStack && (
                        <ImportantNotePopup
                            stack={noteStack}
                            onStart={() => {
                                setReviewStack(noteStack);
                                setNoteStack(null);
                            }}
                            onClose={() => setNoteStack(null)}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Modals & Overlays */}
            {showMenu && (
                <HamburgerMenu
                    user={user}
                    theme={theme}
                    onToggleTheme={handleToggleTheme}
                    soundsEnabled={soundsEnabled}
                    onToggleSounds={handleToggleSounds}
                    onShowFeedback={() => { setShowMenu(false); setShowFeedback(true); }}
                    onClose={() => setShowMenu(false)}
                    onLogout={() => signOut(setUser)}
                    onLogin={() => signIn()}
                    onDeleteData={handleDeleteAll}
                    onDeleteAndLogout={handleLogoutAndClear}
                    onShowAd={() => { setShowMenu(false); setIsInitialAd(false); setShowAdPopup(true); }}
                />
            )}

            {showAddModal && (
                <AddStackModal
                    user={user}
                    stack={activeStack}
                    onClose={() => setShowAddModal(false)}
                    onSave={(updated, shouldClose = true, publishedToCommunity = false) => {
                        handleUpdateLocalStack(updated, publishedToCommunity);
                        if (shouldClose) setShowAddModal(false);
                    }}
                    onDuplicate={handleDuplicateStack}
                    onDelete={handleDeleteStack}
                    showAlert={(msg) => setNotification({ type: 'alert', message: msg })}
                    showConfirm={(msg, cb) => setNotification({ type: 'confirm', message: msg, onConfirm: cb })}
                    availableLabels={getAvailableLabels()}
                    allStacks={stacks}
                    publicFolderId={PUBLIC_FOLDER_ID}
                    activeTab={activeTab}
                    defaultMetadata={publicFilters}
                />
            )}

            {reviewStack && (
                <ReviewModal
                    stack={reviewStack}
                    user={user}
                    onClose={() => setReviewStack(null)}
                    onUpdate={(updated) => handleUpdateLocalStack(updated)}
                    onEdit={() => { setActiveStack(reviewStack); setReviewStack(null); setShowAddModal(true); }}
                    onDuplicate={handleDuplicateStack}
                    showAlert={(msg) => setNotification({ type: 'alert', message: msg })}
                />
            )}
            <AnimatePresence>
                {notification && (
                    <NotificationModal
                        type={notification.type}
                        message={notification.message}
                        onConfirm={notification.onConfirm}
                        onClose={() => setNotification(null)}
                    />
                )}
            </AnimatePresence>
            {showFeedback && (
                <FeedbackModal
                    user={user}
                    onClose={() => setShowFeedback(false)}
                    showAlert={(msg) => setNotification({ type: 'alert', message: msg })}
                />
            )}
            <KnowMoreModal
                isOpen={showKnowMore}
                onClose={() => setShowKnowMore(false)}
                onLogin={() => {
                    setShowKnowMore(false);
                    signIn();
                }}
            />

            {/* Ad System */}
            <AdPopup
                isOpen={showAdPopup}
                onClose={() => setShowAdPopup(false)}
                adConfig={adConfig}
                isInitialAd={isInitialAd}
                authIssue={authIssue}
                user={user}
            />

        </div>
    );
};

export default App;
