import React, { Suspense, lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUI } from '../../context/UIContext';
import { useTour } from '../TourContext';

// Components - Consider lazy loading for performance (Staff Pattern)
const HamburgerMenu = lazy(() => import('../HamburgerMenu'));
const AddStackModal = lazy(() => import('../AddStackModal'));
const ReviewModal = lazy(() => import('../ReviewModal'));
const FeedbackModal = lazy(() => import('../FeedbackModal'));
const KnowMoreModal = lazy(() => import('../KnowMoreModal'));
const CoinPurchaseModal = lazy(() => import('../CoinPurchaseModal'));
const ReferralModal = lazy(() => import('../ReferralModal'));
const AdminPanel = lazy(() => import('../AdminPanel'));
const LoginPromptModal = lazy(() => import('../LoginPromptModal'));
const ImportantNotePopup = lazy(() => import('../ImportantNotePopup'));
const NamePromptModal = lazy(() => import('../NamePromptModal'));

/**
 * ModalRegistry Component
 * Declarative modal management system. Subscribes to UIContext and renders
 * active modals, preventing duplicate orchestration in App.jsx.
 */
const ModalRegistry = ({
    user,
    stacks,
    publicStacks,
    userProfile,
    activeStack,
    reviewStack,
    noteStack,
    theme,
    onToggleTheme,
    soundsEnabled,
    onToggleSounds,
    onLogout,
    onDeleteData,
    onShowTour,
    onSaveStack,
    onDeleteStack,
    onImportStack,
    onUpdateCoins,
    isUnlimited,
    onLoginRequired,
    previewSession,
    onReviewStart,
    handleEditStack,
    handleReviewLaunch,
    activeTab,
    fetchPublicStacks,
    fetchStacks,
    ADMIN_EMAIL,
    APP_VERSION,
    showNotification,
    setUserProfile,
    saveUserProfile,
    refreshProfile
}) => {
    const { modals, toggleModal, setReviewStack: setUIReviewStack, setNoteStack: setUINoteStack, setActiveStack } = useUI();
    const { isActive: isTourActive, endTour, startTour } = useTour();

    const safelyCloseReview = () => {
        setUIReviewStack(null);
        setUINoteStack(null);
        toggleModal('showAddModal', false);
    };

    // Atomic Sync Pattern: Ensures profile synchronization occurs exactly once per modal open event.
    // This prevents state-feedback loops while maintaining authoritative data freshness.
    // We use a ref to track previous modal states to detect open *transitions* only.
    const prevModalsRef = React.useRef({});

    React.useEffect(() => {
        const sensitiveModals = ['showMenu', 'showCoinModal', 'showReferral', 'showAdminPanel'];
        let needsRefresh = false;

        sensitiveModals.forEach(key => {
            const isOpen = modals[key];
            const wasOpen = prevModalsRef.current[key];

            // Only trigger refresh on a closed -> open transition
            if (isOpen && !wasOpen) {
                needsRefresh = true;
            }
        });

        // Update the ref AFTER checking, so next render has proper "previous" state
        prevModalsRef.current = { ...modals };

        if (needsRefresh && refreshProfile) {
            console.log('[ModalRegistry] Syncing profile on modal open.');
            refreshProfile();
        }
    }, [modals, refreshProfile]);

    return (
        <Suspense fallback={null}>
            <AnimatePresence>
                {modals.showMenu && (
                    <HamburgerMenu
                        user={user}
                        theme={theme}
                        onToggleTheme={onToggleTheme}
                        soundsEnabled={soundsEnabled}
                        onToggleSounds={onToggleSounds}
                        onShowFeedback={() => { toggleModal('showMenu', false); window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showFeedback', true); }}
                        onShowReferral={() => { toggleModal('showMenu', false); window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showReferral', true); }}
                        onClose={() => toggleModal('showMenu', false)}
                        onLogout={onLogout}
                        onLogin={() => onLoginRequired(null)}
                        onDeleteData={onDeleteData}
                        onShowAdminPanel={() => { toggleModal('showMenu', false); window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showAdminPanel', true); }}
                        onShowTour={() => { toggleModal('showMenu', false); endTour(); setTimeout(() => startTour(), 300); }}
                        appVersion={APP_VERSION}
                    />
                )}

                {modals.showAddModal && (
                    <AddStackModal
                        user={user}
                        stack={activeStack}
                        onClose={() => window.history.back()}
                        onSave={onSaveStack}
                        onDelete={onDeleteStack}
                        showAlert={m => showNotification('alert', m)}
                        showConfirm={(m, c) => showNotification('confirm', m, c)}
                        availableLabels={[...new Set(stacks.map(s => s.label).filter(l => l))]}
                        allStacks={stacks}
                        activeTab={activeTab}
                    />
                )}

                {reviewStack && (
                    <ReviewModal
                        stack={reviewStack}
                        user={user}
                        onClose={safelyCloseReview}
                        onUpdate={(upd) => onSaveStack(upd, false)}
                        onEdit={() => { handleEditStack(reviewStack); setUIReviewStack(null); }}
                        onDuplicate={onImportStack}
                        showAlert={o => typeof o === 'string' ? showNotification('alert', o) : showNotification(o.type, o.message, o.onConfirm)}
                        userCoins={userProfile?.coins || 0}
                        onDeductCoins={a => { if (!isUnlimited) onUpdateCoins((userProfile?.coins || 0) - a); }}
                        isPreviewMode={!user && reviewStack.isPublic}
                        onLoginRequired={onLoginRequired}
                        previewProgress={previewSession}
                        isUnlimited={isUnlimited}
                        onReviewStart={onReviewStart}
                        displayName={userProfile?.displayName}
                    />
                )}

                {noteStack && (
                    <ImportantNotePopup
                        stack={noteStack}
                        user={user}
                        onStart={() => { setUIReviewStack(noteStack); setUINoteStack(null); }}
                        onClose={() => window.history.back()}
                        onEdit={() => { handleEditStack(noteStack); setUINoteStack(null); }}
                        onDelete={() => onDeleteStack(noteStack)}
                        showConfirm={(msg, cb) => showNotification('confirm', msg, cb)}
                    />
                )}

                {modals.showFeedback && <FeedbackModal user={user} onClose={() => window.history.back()} showAlert={m => showNotification('alert', m)} />}

                {modals.showKnowMore && <KnowMoreModal isOpen={modals.showKnowMore} onClose={() => window.history.back()} onLogin={() => { toggleModal('showKnowMore', false); onLoginRequired(null); }} />}

                {modals.showCoinModal && (
                    <CoinPurchaseModal
                        user={user}
                        userCoins={userProfile?.coins || 0}
                        onClose={() => window.history.back()}
                        onShare={() => { toggleModal('showCoinModal', false); window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showReferral', true); }}
                        onShowFeedback={() => { toggleModal('showCoinModal', false); window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showFeedback', true); }}
                    />
                )}

                {modals.showReferral && (
                    <ReferralModal
                        user={user}
                        userProfile={userProfile}
                        onClose={() => window.history.back()}
                        onUpdateProfile={upd => { setUserProfile(upd); saveUserProfile(user.token, upd); }}
                        showAlert={m => showNotification('alert', m)}
                        onShowFeedback={() => { toggleModal('showReferral', false); window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showFeedback', true); }}
                    />
                )}

                {modals.showAdminPanel && (
                    <AdminPanel
                        user={user}
                        onClose={() => window.history.back()}
                        publicStacks={publicStacks}
                        onRefreshPublic={fetchPublicStacks}
                        showAlert={m => showNotification('alert', m)}
                        showConfirm={(m, c) => showNotification('confirm', m, c)}
                        onEditStack={handleEditStack}
                    />
                )}

                {modals.showAdminQuickTools && (
                    <AdminPanel
                        user={user}
                        onClose={() => toggleModal('showAdminQuickTools', false)}
                        publicStacks={publicStacks}
                        onRefreshPublic={fetchPublicStacks}
                        showAlert={m => showNotification('alert', m)}
                        showConfirm={(m, c) => showNotification('confirm', m, c)}
                        onEditStack={handleEditStack}
                        initialSection="smart_paste"
                    />
                )}

                {modals.showLoginPrompt && previewSession && (
                    <LoginPromptModal
                        onLogin={() => { toggleModal('showLoginPrompt', false); onLoginRequired(null); }}
                        onCancel={() => { toggleModal('showLoginPrompt', false); safelyCloseReview(); }}
                        cardsReviewed={previewSession.sessionRatings?.length || 0}
                        totalCards={previewSession.stack?.cards?.length || 0}
                    />
                )}

                {modals.showNamePrompt && !isTourActive && (
                    <NamePromptModal
                        onSave={async n => {
                            const u = { ...userProfile, displayName: n };
                            setUserProfile(u);
                            toggleModal('showNamePrompt', false);
                            await saveUserProfile(user.token, u);
                        }}
                    />
                )}
            </AnimatePresence>
        </Suspense>
    );
};

export default ModalRegistry;
