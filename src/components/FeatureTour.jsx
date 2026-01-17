import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import avatar from '../assets/avatar_guide_new.png';
import { X, ArrowRight, Play } from 'lucide-react';
import { useTour } from './TourContext';

/**
 * FeatureTour Component
 * High-available guidance system with dynamic positioning and context-aware flow.
 */
const FeatureTour = ({ onStartDemo, onGoToMyCards, userName, onLogin, onAddStack }) => {
    const { isActive, currentStep, nextStep, setStep, endTour, isDemoGracePeriod } = useTour();

    const [targetRect, setTargetRect] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const containerRef = useRef(null);

    // Responsive state synchronization
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Step Configuration with soft-locks and conditional flow
    const steps = useMemo(() => [
        {
            id: 1,
            targetId: null,
            mobilePos: { bottom: '20px', left: 0, right: 0, margin: '0 auto', width: '90%' },
            desktopPos: { bottom: '50px', left: '50px' },
            text: `Welcome${userName ? ' ' + userName : ''}! I’m Chethan.\nI’m here to guide you through a more efficient way to learn and retain information.`,
            actionLabel: "Begin Tour",
            layout: 'duo-card',
            canSkip: true
        },
        {
            id: 2,
            targetId: null,
            mobilePos: { bottom: '20px', left: 0, right: 0, margin: '0 auto', width: '90%' },
            desktopPos: { bottom: '20px', left: '20px' },
            text: "Your progress and lessons are stored securely in your personal Google Drive, ensuring your data remains private and under your exclusive control.",
            actionLabel: "Sign in with Google",
            onAction: onLogin,
            layout: 'duo-card',
            isLoginStep: true,
            canSkip: true,
            onSkip: () => setStep(3),
            extraContent: (
                <div style={{ marginTop: '12px', padding: '14px', background: 'var(--accent-soft)', borderRadius: '16px', border: '1px solid var(--tour-border)', fontSize: '0.85rem', color: 'var(--tour-text)', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '700' }}>
                        <div style={{ background: 'var(--accent-color)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>!</div>
                        Setup Requirement
                    </div>
                    To enable synchronization, please ensure you <strong>check the permission box</strong> during sign-in.
                </div>
            )
        },
        {
            id: 3,
            targetId: 'tab-ready-made',
            text: "Explore our collection of professionally curated lessons. You can easily add any of these to your personal library.",
            actionLabel: "Next",
            layout: 'tooltip',
            placement: 'bottom',
            canSkip: true
        },
        {
            id: 4,
            targetId: 'stack-card-demo-stack',
            text: "This is a sample stack. We recommend starting here to experience our active recall methodology first-hand.",
            actionLabel: "Launch Demo",
            actionIcon: <Play size={16} fill="white" />,
            onAction: onStartDemo,
            layout: 'tooltip',
            placement: 'top',
            canSkip: true,
            onSkip: () => setStep(6) // Conditional Branching: Skip timing tip if demo skipped
        },
        {
            id: 5,
            targetId: 'stack-card-demo-stack',
            highlightId: 'next-review-indicator-demo-stack',
            text: "Our intelligent algorithm calculates the optimal moment for your next review to ensure long-term retention.",
            actionLabel: "Continue",
            layout: 'tooltip',
            placement: 'bottom',
            canSkip: true
        },
        {
            id: 6,
            targetId: 'fab-add-stack',
            text: "Ready to create your own? Click the '+' button to start building your personal lesson stack.",
            onAction: () => {
                onAddStack?.();
                nextStep();
            },
            layout: 'tooltip',
            placement: 'top',
            canSkip: true
        },
        {
            id: 7,
            targetId: 'modal-title-input',
            text: "Give your stack a catchy title and start adding cards. You can use text, images, and even voice recordings!",
            actionLabel: "Got it",
            layout: 'tooltip',
            placement: 'bottom',
            canSkip: false
        },
        {
            id: 8,
            targetId: null,
            text: "You are now fully equipped for success. Start creating your own personalized lesson stacks whenever you're ready.",
            actionLabel: "Get Started",
            onAction: onGoToMyCards,
            layout: 'duo-card',
            isFinalAction: true,
            canSkip: false
        }
    ], [userName, onLogin, onStartDemo, onGoToMyCards, setStep, isMobile, onAddStack]);

    const currentStepIndex = steps.findIndex(s => s.id === currentStep);
    const currentConfig = steps[currentStepIndex] || steps[0];

    // Coordinate Tracking with Viewport Awareness
    useEffect(() => {
        if (!isActive) return;

        const updateCoordinates = () => {
            if (currentConfig.targetId) {
                const el = document.getElementById(currentConfig.targetId);
                const hlEl = currentConfig.highlightId ? document.getElementById(currentConfig.highlightId) : null;
                const targetEl = hlEl || el;

                if (targetEl) {
                    const rect = targetEl.getBoundingClientRect();
                    setTargetRect(rect);

                    // Intelligent scrolling: Only scroll if target is partially obscured
                    const isFullyVisible = (
                        rect.top >= 0 &&
                        rect.left >= 0 &&
                        rect.bottom <= window.innerHeight &&
                        rect.right <= window.innerWidth
                    );

                    if (!isFullyVisible) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    setTargetRect(null);
                }
            } else {
                setTargetRect(null);
            }
        };

        updateCoordinates();
        window.addEventListener('resize', updateCoordinates);
        window.addEventListener('scroll', updateCoordinates);
        const poll = setInterval(updateCoordinates, 500);

        return () => {
            window.removeEventListener('resize', updateCoordinates);
            window.removeEventListener('scroll', updateCoordinates);
            clearInterval(poll);
        };
    }, [currentStep, currentConfig, isActive]);

    const handleAction = () => {
        if (currentConfig.onAction) {
            currentConfig.onAction();
        } else if (currentConfig.isFinalAction) {
            endTour();
        } else {
            nextStep();
        }
    };

    const handleSkip = (e) => {
        e.stopPropagation();
        if (currentConfig.onSkip) {
            currentConfig.onSkip();
        } else {
            nextStep();
        }
    };

    if (!isActive) return null;

    /**
     * Advanced Tooltip Layout Calculator
     * Ensures tooltip stays within viewport 10px safe-zone.
     */
    const getLayoutStyles = () => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isSmallScreen = viewportWidth < 768;

        let width = isSmallScreen ? Math.min(viewportWidth - 32, 340) : (currentConfig.layout === 'duo-card' ? 550 : 380);
        const safePadding = 16;
        const gap = 16;

        const styles = {
            position: 'fixed',
            width,
            zIndex: 'var(--tour-z-index)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        };

        if (!targetRect) {
            return {
                ...styles,
                left: (viewportWidth - width) / 2,
                top: isSmallScreen ? 'auto' : (viewportHeight - 200) / 2,
                bottom: isSmallScreen ? '24px' : 'auto',
                maxWidth: `calc(100vw - ${safePadding * 2}px)`
            };
        }

        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        let placement = currentConfig.placement || 'bottom';
        if (isSmallScreen) {
            if (placement === 'left' || placement === 'right') {
                placement = targetRect.top > viewportHeight / 2 ? 'top' : 'bottom';
            }
            // Auto-flip if too close to edges
            if (placement === 'bottom' && targetRect.bottom + 220 > viewportHeight) placement = 'top';
            if (placement === 'top' && targetRect.top < 220) placement = 'bottom';
        }

        if (placement === 'top') {
            styles.left = targetCenterX - width / 2;
            styles.bottom = (viewportHeight - targetRect.top) + gap;
        } else if (placement === 'bottom') {
            styles.left = targetCenterX - width / 2;
            styles.top = targetRect.bottom + gap;
        } else if (placement === 'left') {
            styles.left = targetRect.left - width - gap;
            styles.top = targetCenterY - 100;
        } else { // right
            styles.left = targetRect.right + gap;
            styles.top = targetCenterY - 100;
        }

        // Clamping to viewport
        if (styles.left < safePadding) styles.left = safePadding;
        else if (styles.left + width > viewportWidth - safePadding) styles.left = viewportWidth - width - safePadding;

        if (styles.top !== undefined) {
            if (styles.top < safePadding) styles.top = safePadding;
            else if (styles.top + 200 > viewportHeight) styles.top = viewportHeight - 200 - safePadding;
        } else if (styles.bottom !== undefined) {
            if (styles.bottom < safePadding) styles.bottom = safePadding;
        }

        styles.activePlacement = placement;
        styles.arrowLeft = targetCenterX - styles.left;
        return styles;
    };

    if (!isActive || isDemoGracePeriod) return null;

    const layoutStyle = getLayoutStyles();
    const finalStyles = (isMobile && currentConfig.mobilePos)
        ? currentConfig.mobilePos
        : (!isMobile && currentConfig.desktopPos)
            ? currentConfig.desktopPos
            : layoutStyle;

    return (
        <div className="feature-tour-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 'var(--tour-z-index)', pointerEvents: 'none'
        }}>
            {/* High-visibility backdrop for intro phases */}
            <AnimatePresence>
                {!currentConfig.targetId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'absolute', inset: 0,
                            background: 'var(--tour-overlay-bg)', backdropFilter: 'blur(4px)',
                            pointerEvents: 'auto'
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    style={{
                        position: 'fixed',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        pointerEvents: 'auto',
                        ...finalStyles
                    }}
                >
                    <div className="neo-flat tour-glass" style={{
                        background: 'var(--tour-bg)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        color: 'var(--tour-text)',
                        borderRadius: '24px',
                        border: '1px solid var(--tour-border)',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: 'center',
                        gap: '1.25rem',
                        overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                        width: '100%',
                        position: 'relative'
                    }}>
                        {/* Avatar Section */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minWidth: isMobile ? '60px' : (currentConfig.layout === 'duo-card' ? '140px' : '90px'),
                            width: isMobile ? '60px' : (currentConfig.layout === 'duo-card' ? '140px' : '90px'),
                            flexShrink: 0
                        }}>
                            <img src={avatar} alt="Guide" style={{ width: '100%', height: 'auto', maxWidth: '120px' }} />
                        </div>

                        {/* Content Section */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6', fontWeight: '600', whiteSpace: 'pre-line' }}>
                                    {currentConfig.text}
                                </p>
                                <button onClick={endTour} style={{ background: 'none', border: 'none', color: 'var(--tour-text-muted)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                                    <X size={18} />
                                </button>
                            </div>

                            {currentConfig.extraContent}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                {currentConfig.canSkip && (
                                    <button
                                        onClick={handleSkip}
                                        style={{
                                            padding: '0.6rem 1rem', background: 'transparent',
                                            color: 'var(--tour-text-muted)', fontWeight: '600',
                                            borderRadius: '12px', border: '1px solid var(--tour-border)',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Skip
                                    </button>
                                )}
                                <button
                                    onClick={handleAction}
                                    style={{
                                        flex: 2, padding: '0.6rem 1.25rem', background: 'var(--tour-accent)',
                                        color: 'white', fontWeight: '700', borderRadius: '12px',
                                        boxShadow: `0 4px 0 var(--tour-accent-dark)`, border: 'none',
                                        fontSize: '0.9rem', display: 'flex', justifyContent: 'center',
                                        alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    {currentConfig.isLoginStep && (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18px" height="18px" style={{ flexShrink: 0 }}>
                                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                                            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                                            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                                            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C40.483,35.58,44,30.2,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                                        </svg>
                                    )}
                                    {currentConfig.actionLabel}
                                    {currentConfig.actionIcon || <ArrowRight size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Speech Bubble Indicator */}
                        {currentConfig.targetId && layoutStyle.activePlacement && (layoutStyle.activePlacement === 'top' || layoutStyle.activePlacement === 'bottom') && (
                            <div style={{
                                position: 'absolute',
                                [layoutStyle.activePlacement === 'top' ? 'bottom' : 'top']: '-8px',
                                left: `${layoutStyle.arrowLeft}px`,
                                transform: 'translateX(-50%)',
                                borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
                                [layoutStyle.activePlacement === 'top' ? 'borderTop' : 'borderBottom']: '8px solid var(--tour-bg)',
                                zIndex: 1
                            }} />
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default FeatureTour;
