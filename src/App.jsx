import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth, AuthProvider } from './components/AuthProvider';
import { StackProvider, useStack } from './context/StackContext';
import { UIProvider, useUI } from './context/UIContext';
import { storage } from './utils/storage';
import { useUserProfile } from './hooks/useUserProfile';
import { useNavigationGuard } from './hooks/useNavigationGuard';
import { useTour, TourProvider } from './components/TourContext';

// Components
import Home from './pages/Home';
import RootLayout from './components/layout/RootLayout';
import ModalRegistry from './components/layout/ModalRegistry';
import CoinRewardAnimation from './components/CoinRewardAnimation';
import FeatureTour from './components/FeatureTour';
import { useAppActions } from './hooks/useAppActions';

import { DEMO_STACK } from './constants/data';
import { ADMIN_EMAIL } from './constants/config';

const AppContent = () => {
    const { user, signIn, signOut } = useAuth();
    const { allowExit: allowAppExit } = useNavigationGuard(!!user);
    const {
        stacks, setStacks, publicStacks, setPublicStacks,
        loading: hookLoading, publicLoading, fetchStacks, fetchPublicStacks,
        handleUpdateLocalStack
    } = useStack();

    const {
        modals, toggleModal,
        activeStack, setActiveStack,
        reviewStack, setReviewStack,
        noteStack, setNoteStack,
        showNotification
    } = useUI();

    const {
        isActive: isTourActive,
        currentStep: tourStep,
        setStep: setTourStep,
        startTour,
        endTour: handleTourEnd,
        isDemoGracePeriod,
        setIsDemoGracePeriod,
    } = useTour();

    // Local UI State
    const [loading, setLoading] = useState(false);
    const [rewardData, setRewardData] = useState(null);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [sortBy, setSortBy] = useState('Creation Date');
    const [filterLabel, setFilterLabel] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('my');
    const [publicFilters, setPublicFilters] = useState({ standard: '', syllabus: '', medium: '', subject: '' });
    const [soundsEnabled, setSoundsEnabled] = useState(localStorage.getItem('soundsEnabled') !== 'false');
    const [previewSession, setPreviewSession] = useState(null);
    const [reviewStarted, setReviewStarted] = useState(false);

    // Domain Hooks
    const setNotificationAdapter = useCallback((n) => showNotification(n.type, n.message, n.onConfirm), [showNotification]);
    const {
        userProfile, setUserProfile, handleUpdateCoins,
        loadProfile: reloadProfile, isProfileLoading
    } = useUserProfile(user, setNotificationAdapter, setRewardData);

    const {
        handleImportStack,
        handleDeleteStack,
        handleDeleteAllData,
        handleEditStack,
        handleReviewLaunch
    } = useAppActions();

    const isGlobalLoading = loading || hookLoading;

    // Version Check
    const APP_VERSION = '1.1.4'; // Refactor version
    useEffect(() => {
        const lastVersion = storage.get('app_version');
        if (lastVersion && lastVersion !== APP_VERSION) {
            console.log(`[VersionControl] Upgrading to ${APP_VERSION}.`);
            const themeSave = storage.get('theme');
            const sounds = storage.get('soundsEnabled');
            storage.purge();
            if (themeSave) storage.set('theme', themeSave);
            if (sounds) storage.set('soundsEnabled', sounds);
            storage.set('app_version', APP_VERSION);
            window.location.reload(true);
        } else {
            storage.set('app_version', APP_VERSION);
        }
    }, []);

    // Handlers
    const handleLoginRequired = useCallback((sessionData) => {
        setPreviewSession(sessionData);
        toggleModal('showLoginPrompt', true);
    }, [toggleModal]);

    // Effects
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        // Deep Link Handling
        if (window.location.pathname.includes('/admin')) {
            toggleModal('showAdminPanel', true);
        }

        fetchPublicStacks();
        if (user) {
            fetchStacks();
            toggleModal('showMenu', false);
        } else {
            setStacks([DEMO_STACK]);
            // Profile is cleared reactively by useUserProfile when user becomes null
        }
    }, [user, fetchStacks, fetchPublicStacks, setStacks, toggleModal]);

    useEffect(() => {
        if (isTourActive) {
            if (tourStep === 3) setActiveTab('ready-made');
            if (tourStep === 4) setActiveTab('my');
            if (tourStep === 2 && user) setTourStep(3);
        }
    }, [isTourActive, tourStep, user, setTourStep]);

    useEffect(() => {
        if (isDemoGracePeriod && !reviewStack) {
            setIsDemoGracePeriod(false);
            setTourStep(5);
            setActiveTab('my');
        }
    }, [reviewStack, isDemoGracePeriod, setTourStep, setIsDemoGracePeriod]);

    useEffect(() => {
        const handlePopState = (e) => {
            if (rewardData) setRewardData(null);
            else if (modals.showLoginPrompt) toggleModal('showLoginPrompt', false);
            else if (noteStack) setNoteStack(null);
            else if (modals.showReferral) toggleModal('showReferral', false);
            else if (modals.showFeedback) toggleModal('showFeedback', false);
            else if (modals.showKnowMore) toggleModal('showKnowMore', false);
            else if (modals.showAdminPanel) toggleModal('showAdminPanel', false);
            else if (modals.showAdminQuickTools) toggleModal('showAdminQuickTools', false);
            else if (modals.showCoinModal) toggleModal('showCoinModal', false);
            else if (modals.showAddModal) toggleModal('showAddModal', false);
            else if (reviewStack) {
                if (reviewStarted) {
                    window.history.pushState({ modalOpen: true }, '', window.location.pathname);
                    showNotification('confirm', "End session?", () => {
                        setReviewStack(null);
                        setReviewStarted(false);
                        window.history.back();
                    });
                } else setReviewStack(null);
            }
            else if (modals.showMenu) toggleModal('showMenu', false);
            else if (user && (!e.state || e.state.guard !== 'active')) {
                window.history.pushState({ guard: 'active' }, '', window.location.pathname);
                showNotification('confirm', "Sign out and exit?", () => {
                    allowAppExit();
                    signOut();
                    window.history.back();
                });
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [rewardData, modals, noteStack, reviewStack, reviewStarted, user, signOut, allowAppExit, toggleModal, setNoteStack, setReviewStack, showNotification]);

    const sortedStacks = useMemo(() => {
        let filtered = filterLabel ? stacks.filter(s => s.label === filterLabel) : stacks;
        if (searchQuery.trim()) filtered = filtered.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

        return [...filtered].sort((a, b) => {
            if (isTourActive) {
                if (a.id === 'demo-stack') return -1;
                if (b.id === 'demo-stack') return 1;
            }
            return (b.id || 0) - (a.id || 0);
        });
    }, [stacks, filterLabel, searchQuery, isTourActive]);

    const isUnlimited = userProfile?.unlimitedCoinsExpiry && new Date(userProfile.unlimitedCoinsExpiry).getTime() > Date.now();

    return (
        <RootLayout
            user={user}
            userProfile={userProfile}
            isUnlimited={isUnlimited}
            isProfileLoading={isProfileLoading}
            isAdmin={user?.email === ADMIN_EMAIL}
            isTourActive={isTourActive}
            showAdminQuickTools={modals.showAdminQuickTools}
            onToggleAdminQuickTools={() => {
                if (!modals.showAdminQuickTools) window.history.pushState({ modal: 'active' }, '', window.location.pathname);
                toggleModal('showAdminQuickTools', !modals.showAdminQuickTools);
            }}
            onShowCoinModal={() => { window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showCoinModal', true); }}
            onShowMenu={() => toggleModal('showMenu', true)}
            onAddStack={() => {
                if (!user) { signIn('consent'); return; }
                setActiveStack(null);
                window.history.pushState({ modal: 'active' }, '', window.location.pathname);
                toggleModal('showAddModal', true);
            }}
        >
            <Home
                activeTab={activeTab} setActiveTab={setActiveTab}
                stacks={sortedStacks}
                publicStacks={publicStacks} user={user}
                onLogin={(prompt) => signIn(prompt || 'consent')}
                loading={isGlobalLoading} publicLoading={publicLoading}
                userCoins={userProfile?.coins || 0}
                onReview={handleReviewLaunch}
                onEdit={handleEditStack}
                onImport={(s) => handleImportStack(s, userProfile, handleUpdateCoins)}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                onShowFeedback={() => { window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showFeedback', true); }}
                filters={publicFilters} setFilters={setPublicFilters}
                sortBy={sortBy} onSortChange={setSortBy}
                filterLabel={filterLabel} onLabelChange={setFilterLabel}
                availableLabels={[...new Set(stacks.map(s => s.label).filter(l => l))]}
                onShowKnowMore={() => { window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showKnowMore', true); }}
                onDelete={handleDeleteStack} showConfirm={(msg, cb) => showNotification('confirm', msg, cb)}
                onAddStack={() => { setActiveStack(null); window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showAddModal', true); }}
                onRefresh={() => {
                    if (activeTab === 'my' && user) {
                        fetchStacks();
                        reloadProfile(); // Also refresh user profile (coins)
                    } else {
                        fetchPublicStacks();
                    }
                }}
            />

            <ModalRegistry
                user={user}
                stacks={stacks}
                publicStacks={publicStacks}
                userProfile={userProfile}
                activeStack={activeStack}
                reviewStack={reviewStack}
                noteStack={noteStack}
                theme={theme}
                onToggleTheme={() => setTheme(p => p === 'light' ? 'dark' : 'light')}
                soundsEnabled={soundsEnabled}
                onToggleSounds={() => { const v = !soundsEnabled; setSoundsEnabled(v); localStorage.setItem('soundsEnabled', v); return v; }}
                onLogout={() => { allowAppExit(); signOut(); }}
                onDeleteData={() => handleDeleteAllData(allowAppExit)}
                onShowTour={() => { toggleModal('showMenu', false); handleTourEnd(); setTimeout(() => startTour(), 300); }}
                onSaveStack={(upd, sc, ip) => { handleUpdateLocalStack(upd); if (upd.isPublic || ip) fetchPublicStacks(); if (sc !== false) window.history.back(); }}
                onDeleteStack={handleDeleteStack}
                onImportStack={(s) => handleImportStack(s, userProfile, handleUpdateCoins)}
                onUpdateCoins={handleUpdateCoins}
                isUnlimited={isUnlimited}
                onLoginRequired={handleLoginRequired}
                previewSession={previewSession}
                onReviewStart={() => setReviewStarted(true)}
                handleEditStack={handleEditStack}
                handleReviewLaunch={handleReviewLaunch}
                activeTab={activeTab}
                fetchPublicStacks={fetchPublicStacks}
                fetchStacks={fetchStacks}
                ADMIN_EMAIL={ADMIN_EMAIL}
                APP_VERSION={APP_VERSION}
                showNotification={showNotification}
                setUserProfile={setUserProfile}
                refreshProfile={reloadProfile}
            />

            <FeatureTour
                userName={userProfile?.displayName}
                onLogin={() => signIn('consent')}
                onAddStack={() => {
                    setActiveStack(null);
                    window.history.pushState({ modal: 'active' }, '', window.location.pathname);
                    toggleModal('showAddModal', true);
                }}
                onStartDemo={() => {
                    const demo = stacks.find(s => s.id === 'demo-stack') || DEMO_STACK;
                    handleReviewLaunch(demo);
                    setIsDemoGracePeriod(true);
                }}
                onGoToMyCards={() => {
                    setActiveTab('my');
                    handleTourEnd();
                }}
            />

            <AnimatePresence>
                {rewardData && !isTourActive && (
                    <CoinRewardAnimation
                        amount={rewardData.amount}
                        type={rewardData.type}
                        onClose={() => setRewardData(null)}
                    />
                )}
            </AnimatePresence>
        </RootLayout>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <UIProvider>
                <TourProvider>
                    <StackProvider>
                        <AppContent />
                    </StackProvider>
                </TourProvider>
            </UIProvider>
        </AuthProvider>
    );
};

export default App;
