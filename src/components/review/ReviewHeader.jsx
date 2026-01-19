import React from 'react';
import { motion } from 'framer-motion';
import { Brain, BookOpen } from 'lucide-react';
import CloseButton from '../common/CloseButton'; // Adjust path
import { ADMIN_EMAIL } from '../../constants/config';

const ReviewHeader = ({
    currentIndex,
    totalQuestions,
    masteredCount,
    totalOriginalQuestions,
    rating,
    onClose,
    user,
    lesson
}) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="neo-button" style={{ height: '2.25rem', padding: '0 1rem', fontSize: '1rem', justifyContent: 'center', minWidth: '5rem' }}>
                {currentIndex + 1} / {totalQuestions}
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
                {/* Progress Bar */}
                <div style={{
                    width: '100%', maxWidth: '14rem', height: '1rem', background: 'rgba(0,0,0,0.05)',
                    borderRadius: '0.625rem', position: 'relative', display: 'flex', alignItems: 'center',
                    boxShadow: 'inset 0.125rem 0.125rem 0.25rem var(--shadow-dark), inset -0.1rem -0.1rem 0.2rem var(--shadow-light)'
                }}>

                    <motion.div
                        animate={{
                            left: `${totalOriginalQuestions > 0 ? (masteredCount / totalOriginalQuestions) * 100 : 0}%`,
                            y: rating === 2 ? [0, -15, 0] : rating === 1 ? [0, -5, 0] : 0
                        }}
                        transition={{
                            left: { type: "spring", stiffness: 50, damping: 15 },
                            y: { duration: 0.4, ease: "easeOut" }
                        }}
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: -4,
                            zIndex: 10,
                            x: '-50%'
                        }}
                    >
                        <Brain size={24} color={rating === 2 ? '#22c55e' : 'var(--accent-color)'} fill={rating === 2 ? '#dcfce7' : 'none'} />
                    </motion.div>

                    <div style={{
                        width: `${totalOriginalQuestions > 0 ? (masteredCount / totalOriginalQuestions) * 100 : 0}%`,
                        height: '100%',
                        background: rating === 2 ? 'linear-gradient(90deg, var(--accent-color), #22c55e)' : 'var(--accent-color)',
                        borderRadius: '10px',
                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }} />

                    <div style={{ position: 'absolute', right: -12, top: -4, opacity: 0.9 }}>
                        <BookOpen size={24} color="var(--accent-color)" fill="var(--bg-color)" />
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <CloseButton onClick={onClose} size={18} />
            </div>
        </div>
    );
};

export default ReviewHeader;
