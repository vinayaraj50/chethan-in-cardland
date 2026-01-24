import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth, AuthProvider } from './components/AuthProvider';
import { LessonProvider, useLesson } from './context/LessonContext';
import { UIProvider, useUI } from './context/UIContext';
import { storage } from './utils/storage';
import { useUserProfile } from './hooks/useUserProfile';
import { useNavigationGuard } from './hooks/useNavigationGuard';
import { useTour, TourProvider } from './components/TourContext';
import { useEntitlementSync } from './hooks/useEntitlementSync';

// Components
import Home from './pages/Home';
import RootLayout from './components/layout/RootLayout';
import ModalRegistry from './components/layout/ModalRegistry';
import CoinRewardAnimation from './components/CoinRewardAnimation';
import FeatureTour from './components/FeatureTour';
import { useAppActions } from './hooks/useAppActions';


import { ADMIN_EMAIL } from './constants/config';

const AppContent = () => {
    const { user, signIn, signOut } = useAuth();
    const { allowExit: allowAppExit } = useNavigationGuard(!!user);
    const {
        lessons, setLessons, publicLessons, setPublicLessons,
        loading: hookLoading, publicLoading, fetchLessons, fetchPublicLessons,
        handleUpdateLocalLesson
    } = useLesson();

    const {
        modals, toggleModal,
        activeLesson, setActiveLesson,
        reviewLesson, setReviewLesson,
        noteLesson, setNoteLesson,
        showNotification,
        headerLoading
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
    const [activeTab, setActiveTab] = useState('my-lessons');
    const [publicFilters, setPublicFilters] = useState({ standard: '', syllabus: '', medium: '', subject: '' });
    const [soundsEnabled, setSoundsEnabled] = useState(localStorage.getItem('soundsEnabled') !== 'false');

    const [reviewStarted, setReviewStarted] = useState(false);

    // Domain Hooks
    const setNotificationAdapter = useCallback((n) => showNotification(n.type, n.message, n.onConfirm), [showNotification]);
    const {
        userProfile, setUserProfile, handleUpdateCoins,
        loadProfile: reloadProfile, isProfileLoading
    } = useUserProfile(user, setNotificationAdapter, setRewardData);

    const {
        handleImportLesson,
        handleDeleteLesson,
        handleDeleteAllData,
        handleEditLesson,
        handleReviewLaunch
    } = useAppActions();

    // Entitlement Sync - Auto-restore purchased lessons if missing locally
    const { performSync: handleRestorePurchases } = useEntitlementSync();

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

        fetchPublicLessons();
        if (user) {
            fetchLessons();
            toggleModal('showMenu', false);
        } else {
            setLessons([]);
            // Profile is cleared reactively by useUserProfile when user becomes null
        }
    }, [user, fetchLessons, fetchPublicLessons, setLessons, toggleModal]);

    useEffect(() => {
        if (isTourActive) {
            if (tourStep === 3) setActiveTab('lessons');
            if (tourStep === 4) setActiveTab('my-lessons');
            if (tourStep === 2 && user) setTourStep(3);
        }
    }, [isTourActive, tourStep, user, setTourStep]);

    useEffect(() => {
        if (isDemoGracePeriod && !reviewLesson) {
            setIsDemoGracePeriod(false);
            setTourStep(5);
            setActiveTab('my-lessons');
        }
    }, [reviewLesson, isDemoGracePeriod, setTourStep, setIsDemoGracePeriod]);

    useEffect(() => {
        const handlePopState = (e) => {
            if (rewardData) setRewardData(null);

            else if (noteLesson) setNoteLesson(null);
            else if (modals.showReferral) toggleModal('showReferral', false);
            else if (modals.showFeedback) toggleModal('showFeedback', false);
            else if (modals.showKnowMore) toggleModal('showKnowMore', false);
            else if (modals.showAdminPanel) toggleModal('showAdminPanel', false);
            else if (modals.showAdminQuickTools) toggleModal('showAdminQuickTools', false);
            else if (modals.showCoinModal) toggleModal('showCoinModal', false);
            else if (modals.showAddModal) toggleModal('showAddModal', false);
            else if (reviewLesson) {
                if (reviewStarted) {
                    window.history.pushState({ modalOpen: true }, '', window.location.pathname);
                    showNotification('confirm', "End session?", () => {
                        setReviewLesson(null);
                        setReviewStarted(false);
                        window.history.back();
                    });
                } else setReviewLesson(null);
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
    }, [rewardData, modals, noteLesson, reviewLesson, reviewStarted, user, signOut, allowAppExit, toggleModal, setNoteLesson, setReviewLesson, showNotification]);

    const sortedLessons = useMemo(() => {
        let filtered = filterLabel ? lessons.filter(s => s.label === filterLabel) : lessons;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const isNumberedSearch = /^\d+\.$/.test(query);

            filtered = filtered.filter(s => {
                const title = (s.title || '').toLowerCase();
                if (isNumberedSearch) {
                    const regex = new RegExp(`(^|\\s)${query.replace('.', '\\.')}(\\s|$)`);
                    return regex.test(title);
                }
                return title.includes(query);
            });
        }

        return [...filtered].sort((a, b) => {
            if (isTourActive) {
                if (a.id === 'demo-lesson') return -1;
                if (b.id === 'demo-lesson') return 1;
            }
            return (b.id || 0) - (a.id || 0);
        });
    }, [lessons, filterLabel, searchQuery, isTourActive]);

    const isUnlimited = userProfile?.unlimitedCoinsExpiry && new Date(userProfile.unlimitedCoinsExpiry).getTime() > Date.now();

    return (
        <RootLayout
            user={user}
            userProfile={userProfile}
            isUnlimited={isUnlimited}
            isProfileLoading={isProfileLoading}
            isAdmin={user?.email === ADMIN_EMAIL}
            isTourActive={isTourActive}

            onShowCoinModal={() => { window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showCoinModal', true); }}
            onShowMenu={() => toggleModal('showMenu', true)}
            onAddLesson={() => {
                if (!user) { signIn('consent'); return; }
                setActiveLesson(null);
                window.history.pushState({ modal: 'active' }, '', window.location.pathname);
                toggleModal('showAddModal', true);
            }}
            headerLoading={headerLoading || isGlobalLoading}
        >
            <Home
                activeTab={activeTab} setActiveTab={setActiveTab}
                lessons={sortedLessons}
                publicLessons={publicLessons} user={user}
                onLogin={(prompt) => signIn(prompt || 'consent')}
                loading={isGlobalLoading} publicLoading={publicLoading}
                userCoins={userProfile?.coins || 0}
                onReview={handleReviewLaunch}
                onEdit={handleEditLesson}
                onImport={(s) => handleImportLesson(s, userProfile, handleUpdateCoins)}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                onShowFeedback={() => { window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showFeedback', true); }}
                filters={publicFilters} setFilters={setPublicFilters}
                sortBy={sortBy} onSortChange={setSortBy}
                filterLabel={filterLabel} onLabelChange={setFilterLabel}
                availableLabels={[...new Set(lessons.map(s => s.label).filter(l => l))]}
                onShowKnowMore={() => { window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showKnowMore', true); }}
                onDelete={handleDeleteLesson} showConfirm={(msg, cb) => showNotification('confirm', msg, cb)}
                onAddLesson={() => { setActiveLesson(null); window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showAddModal', true); }}
                onRefresh={() => {
                    if (activeTab === 'my-lessons' && user) {
                        fetchLessons();
                        reloadProfile(); // Also refresh user profile (coins)
                    } else {
                        fetchPublicLessons();
                    }
                }}
            />

            <ModalRegistry
                user={user}
                lessons={lessons}
                publicLessons={publicLessons}
                userProfile={userProfile}
                activeLesson={activeLesson}
                reviewLesson={reviewLesson}
                noteLesson={noteLesson}
                theme={theme}
                onToggleTheme={() => setTheme(p => p === 'light' ? 'dark' : 'light')}
                soundsEnabled={soundsEnabled}
                onToggleSounds={() => { const v = !soundsEnabled; setSoundsEnabled(v); localStorage.setItem('soundsEnabled', v); return v; }}
                onLogout={() => { allowAppExit(); signOut(); }}
                onDeleteData={() => handleDeleteAllData(allowAppExit)}
                onShowTour={() => { toggleModal('showMenu', false); handleTourEnd(); setTimeout(() => startTour(), 300); }}
                onSaveLesson={(upd, sc, ip) => { handleUpdateLocalLesson(upd); if (upd.isPublic || ip) fetchPublicLessons(); if (sc !== false) window.history.back(); }}
                onDeleteLesson={handleDeleteLesson}
                onImportLesson={(s) => handleImportLesson(s, userProfile, handleUpdateCoins)}
                onUpdateCoins={handleUpdateCoins}
                isUnlimited={isUnlimited}

                signIn={signIn}  // Pass direct sign-in handler

                onReviewStart={() => setReviewStarted(true)}
                handleEditLesson={handleEditLesson}
                handleReviewLaunch={handleReviewLaunch}
                activeTab={activeTab}
                fetchPublicLessons={fetchPublicLessons}
                fetchLessons={fetchLessons}
                ADMIN_EMAIL={ADMIN_EMAIL}
                APP_VERSION={APP_VERSION}
                showNotification={showNotification}
                setUserProfile={setUserProfile}
                refreshProfile={reloadProfile}
                onRestorePurchases={() => handleRestorePurchases(true, fetchLessons)}
            />

            <FeatureTour
                userName={userProfile?.displayName}
                onLogin={() => signIn('consent')}
                onAddLesson={() => {
                    setActiveLesson(null);
                    window.history.pushState({ modal: 'active' }, '', window.location.pathname);
                    toggleModal('showAddModal', true);
                }}
                onStartDemo={() => {
                    const demo = lessons.find(s => s.id === 'demo-lesson') || DEMO_LESSON;
                    handleReviewLaunch(demo);
                    setIsDemoGracePeriod(true);
                }}
                onGoToMyLessons={() => {
                    setActiveTab('my-lessons');
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
        </RootLayout >
    );
};

const App = () => {
    return (
        <AuthProvider>
            <UIProvider>
                <TourProvider>
                    <LessonProvider>
                        <AppContent />
                    </LessonProvider>
                </TourProvider>
            </UIProvider>
        </AuthProvider>
    );
};

export default App;
