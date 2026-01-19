import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUI } from '../../context/UIContext';
import { useTour } from '../TourContext';

// Components - Standard imports for stability
import HamburgerMenu from '../HamburgerMenu';
import AddLessonModal from '../AddLessonModal';
import ReviewModal from '../ReviewModal';
import FeedbackModal from '../FeedbackModal';
import KnowMoreModal from '../KnowMoreModal';
import CoinPurchaseModal from '../CoinPurchaseModal';
import ReferralModal from '../ReferralModal';
import AdminPanel from '../AdminPanel';

import ImportantNotePopup from '../ImportantNotePopup';
import NamePromptModal from '../NamePromptModal';

/**
 * ModalRegistry Component
 * Declarative modal management system. Subscribes to UIContext and renders
 * active modals, preventing duplicate orchestration in App.jsx.
 */
const ModalRegistry = ({
    user,
    lessons,
    publicLessons,
    userProfile,
    activeLesson,
    reviewLesson,
    noteLesson,
    theme,
    onToggleTheme,
    soundsEnabled,
    onToggleSounds,
    onLogout,
    onDeleteData,
    onShowTour,
    onSaveLesson,
    onDeleteLesson,
    onImportLesson,
    onUpdateCoins,
    isUnlimited,
    signIn,
    onReviewStart,
    handleEditLesson,
    handleReviewLaunch,
    activeTab,
    fetchPublicLessons,
    fetchLessons,
    ADMIN_EMAIL,
    APP_VERSION,
    showNotification,
    setUserProfile,
    saveUserProfile,
    refreshProfile
}) => {
    const { modals, toggleModal, setReviewLesson: setUIReviewLesson, setNoteLesson: setUINoteLesson, setActiveLesson } = useUI();
    const { isActive: isTourActive, endTour, startTour } = useTour();

    const safelyCloseReview = () => {
        setUIReviewLesson(null);
        setUINoteLesson(null);
        toggleModal('showAddModal', false);
    };

    // Atomic Sync Pattern
    const prevModalsRef = React.useRef({});

    React.useEffect(() => {
        const sensitiveModals = ['showMenu', 'showCoinModal', 'showReferral', 'showAdminPanel'];
        let needsRefresh = false;

        sensitiveModals.forEach(key => {
            const isOpen = modals[key];
            const wasOpen = prevModalsRef.current[key];

            if (isOpen && !wasOpen) {
                needsRefresh = true;
            }
        });

        prevModalsRef.current = { ...modals };

        if (needsRefresh && refreshProfile) {
            console.log('[ModalRegistry] Syncing profile on modal open.');
            refreshProfile();
        }
    }, [modals, refreshProfile]);

    return (
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
                    onLogin={() => { toggleModal('showMenu', false); signIn('consent'); }}
                    onDeleteData={onDeleteData}
                    onShowAdminPanel={() => { toggleModal('showMenu', false); window.history.pushState({ modal: 'active' }, '', window.location.pathname); toggleModal('showAdminPanel', true); }}
                    onShowTour={() => { toggleModal('showMenu', false); endTour(); setTimeout(() => startTour(), 300); }}
                    appVersion={APP_VERSION}
                />
            )}

            {modals.showAddModal && (
                <AddLessonModal
                    user={user}
                    lesson={activeLesson}
                    onClose={() => window.history.back()}
                    onSave={onSaveLesson}
                    onDelete={onDeleteLesson}
                    showAlert={m => showNotification('alert', m)}
                    showConfirm={(m, c) => showNotification('confirm', m, c)}
                    availableLabels={[...new Set(lessons.map(s => s.label).filter(l => l))]}
                    allLessons={lessons}
                    activeTab={activeTab}
                />
            )}

            {reviewLesson && (
                <ReviewModal
                    lesson={reviewLesson}
                    user={user}
                    onClose={safelyCloseReview}
                    onUpdate={(upd) => onSaveLesson(upd, false)}
                    onEdit={() => { handleEditLesson(reviewLesson); setUIReviewLesson(null); }}
                    showAlert={o => typeof o === 'string' ? showNotification('alert', o) : showNotification(o.type, o.message, o.onConfirm)}
                    userCoins={userProfile?.coins || 0}
                    onDeductCoins={a => { if (!isUnlimited) onUpdateCoins((userProfile?.coins || 0) - a); }}
                    isUnlimited={isUnlimited}
                    onReviewStart={onReviewStart}
                    displayName={userProfile?.displayName}
                />
            )}

            {noteLesson && (
                <ImportantNotePopup
                    lesson={noteLesson}
                    user={user}
                    onStart={() => { setUIReviewLesson(noteLesson); setUINoteLesson(null); }}
                    onClose={() => window.history.back()}
                    onEdit={() => { handleEditLesson(noteLesson); setUINoteLesson(null); }}
                    onDelete={() => onDeleteLesson(noteLesson)}
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
                    publicLessons={publicLessons}
                    onRefreshPublic={fetchPublicLessons}
                    showAlert={m => showNotification('alert', m)}
                    showConfirm={(m, c) => showNotification('confirm', m, c)}
                    onEditLesson={handleEditLesson}
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
    );
};

export default ModalRegistry;
