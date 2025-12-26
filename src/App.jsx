import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Home as HomeIcon, Plus, Menu, X, LogOut, Trash2, Sun, Moon, Share2, Copy, Github, Maximize, Minimize } from 'lucide-react';
import { initGoogleAuth, signIn, signOut } from './services/googleAuth';
import { listStacks, saveStack, deleteStack, deleteAllData } from './services/googleDrive';

// Components
import logo from './assets/logo.png';
import HamburgerMenu from './components/HamburgerMenu';
import AddStackModal from './components/AddStackModal';
import ReviewModal from './components/ReviewModal';
import NotificationModal from './components/NotificationModal';
import Home from './pages/Home';
import FeedbackModal from './components/FeedbackModal';
import { loadPicker, showPicker } from './services/googlePicker';

const App = () => {
    const [user, setUser] = useState(null);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [stacks, setStacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sortBy, setSortBy] = useState('Creation Date');
    const [filterLabel, setFilterLabel] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [showMenu, setShowMenu] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeStack, setActiveStack] = useState(null);
    const [reviewStack, setReviewStack] = useState(null);
    const [notification, setNotification] = useState(null); // { type, message, onConfirm }
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [soundsEnabled, setSoundsEnabled] = useState(localStorage.getItem('soundsEnabled') !== 'false');
    const [showFeedback, setShowFeedback] = useState(false);

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

    const fetchStacks = async (token) => {
        setLoading(true);
        try {
            const data = await listStacks(token);
            setStacks(data);
        } catch (error) {
            console.error('Failed to fetch stacks:', error);
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
                    console.error('Failed to delete stack:', error);
                    setNotification({ type: 'alert', message: 'Failed to delete stack.' });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleUpdateLocalStack = (updatedStack) => {
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
            console.error('Failed to duplicate stack:', error);
            setNotification({ type: 'alert', message: 'Failed to duplicate stack.' });
        } finally {
            setLoading(false);
        }
    };



    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
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

    if (!user) {
        return (
            <div className="login-screen" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '2rem'
            }}>
                <img src={logo} alt="Chethan in Cardland" style={{ height: '180px', objectFit: 'contain' }} />
                <p style={{ textAlign: 'center', padding: '0 1rem' }}>Your personal flashcard vault, powered by Google Drive.</p>
                <button className="neo-button" onClick={signIn} style={{ padding: '15px 30px', fontSize: '1.1rem' }}>
                    Sign in with Google
                </button>
            </div>
        );
    }

    return (
        <div className="app-container">
            {/* Header */}
            <header style={{ padding: '1rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <img src={logo} alt="Chethan in Cardland" style={{ height: '90px', objectFit: 'contain' }} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="neo-button icon-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                        <button className="neo-button icon-btn" onClick={() => setShowMenu(true)}>
                            <Menu size={24} />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                {stacks.length > 0 && (
                    <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
                        <input
                            className="neo-input"
                            placeholder="Search stacks by title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', fontSize: '0.95rem' }}
                        />
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main style={{ padding: '0 2rem 2rem' }}>
                <Home
                    stacks={getSortedStacks()}
                    loading={loading}
                    onReview={(stack) => setReviewStack(stack)}
                    onEdit={(stack) => { setActiveStack(stack); setShowAddModal(true); }}
                />
            </main>

            {/* Floating Action Button */}
            <button
                className="neo-button neo-glow-blue"
                style={{
                    position: 'fixed', bottom: '2rem', right: '2rem', borderRadius: '50%', width: '60px', height: '60px',
                    justifyContent: 'center', background: 'var(--accent-color)', color: 'white', border: 'none'
                }}
                onClick={() => { setActiveStack(null); setShowAddModal(true); }}
            >
                <Plus size={32} />
            </button>

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
                    onDeleteData={handleDeleteAll}
                    onDeleteAndLogout={handleLogoutAndClear}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    filterLabel={filterLabel}
                    onLabelChange={setFilterLabel}
                    availableLabels={getAvailableLabels()}
                />
            )}

            {showAddModal && (
                <AddStackModal
                    user={user}
                    stack={activeStack}
                    onClose={() => setShowAddModal(false)}
                    onSave={(updated) => { handleUpdateLocalStack(updated); setShowAddModal(false); }}
                    onDuplicate={handleDuplicateStack}
                    onDelete={handleDeleteStack}
                    showAlert={(msg) => setNotification({ type: 'alert', message: msg })}
                    showConfirm={(msg, cb) => setNotification({ type: 'confirm', message: msg, onConfirm: cb })}
                    availableLabels={getAvailableLabels()}
                    allStacks={stacks}
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
        </div>
    );
};

export default App;
