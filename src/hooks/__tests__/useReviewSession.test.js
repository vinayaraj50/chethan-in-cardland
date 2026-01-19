/**
 * @fileoverview Tests for useReviewSession hook
 * 
 * Tests cover:
 * 1. Start screen display with lesson title
 * 2. Resume functionality for interrupted sessions
 * 3. Section notes toggle
 * 4. Partial progress saving on abrupt close
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReviewSession } from '../useReviewSession';

// Mock sound effects
vi.mock('../../utils/soundEffects', () => ({
    playTada: vi.fn(),
    playSwoosh: vi.fn(),
    playTing: vi.fn(),
    playCompletion: vi.fn(),
    playDopamine: vi.fn(),
    playPartial: vi.fn()
}));

// Mock confetti
vi.mock('canvas-confetti', () => ({
    default: vi.fn()
}));

// Mock phrases
vi.mock('../../constants/phrases', () => ({
    getRandomPhrase: vi.fn(() => 'Great job!')
}));

const createMockLesson = (overrides = {}) => ({
    id: 'test-lesson-1',
    title: 'Test Lesson',
    questions: [
        { id: 'q1', question: { text: 'Question 1' }, answer: { text: 'Answer 1' } },
        { id: 'q2', question: { text: 'Question 2' }, answer: { text: 'Answer 2' } },
        { id: 'q3', question: { text: 'Question 3' }, answer: { text: 'Answer 3' } }
    ],
    isPublic: false,
    ...overrides
});

const createMockProps = (lesson = createMockLesson()) => ({
    lesson,
    user: { uid: 'test-user-123' },
    onUpdate: vi.fn(),
    onClose: vi.fn(),
    showAlert: vi.fn(),
    onReviewStart: vi.fn()
});

describe('useReviewSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Start Screen', () => {
        it('should always show start screen initially', () => {
            const props = createMockProps();
            const { result } = renderHook(() => useReviewSession(props));

            expect(result.current.showStartScreen).toBe(true);
            expect(result.current.lessonTitle).toBe('Test Lesson');
        });

        it('should return lesson title from hook', () => {
            const lesson = createMockLesson({ title: 'Custom Title' });
            const props = createMockProps(lesson);
            const { result } = renderHook(() => useReviewSession(props));

            expect(result.current.lessonTitle).toBe('Custom Title');
        });

        it('should default to "Untitled Lesson" if no title', () => {
            const lesson = createMockLesson({ title: undefined });
            const props = createMockProps(lesson);
            const { result } = renderHook(() => useReviewSession(props));

            expect(result.current.lessonTitle).toBe('Untitled Lesson');
        });
    });

    describe('Section Notes Toggle', () => {
        it('should default showSectionNotes to true', () => {
            const props = createMockProps();
            const { result } = renderHook(() => useReviewSession(props));

            expect(result.current.showSectionNotes).toBe(true);
        });

        it('should respect showSectionNotes from lesson', () => {
            const lesson = createMockLesson({ showSectionNotes: false });
            const props = createMockProps(lesson);
            const { result } = renderHook(() => useReviewSession(props));

            expect(result.current.showSectionNotes).toBe(false);
        });

        it('should allow toggling showSectionNotes', () => {
            const props = createMockProps();
            const { result } = renderHook(() => useReviewSession(props));

            expect(result.current.showSectionNotes).toBe(true);

            act(() => {
                result.current.setShowSectionNotes(false);
            });

            expect(result.current.showSectionNotes).toBe(false);
        });
    });

    describe('Resume Functionality', () => {
        it('should detect interrupted session when lastSessionIndex > 0', () => {
            const lesson = createMockLesson({ lastSessionIndex: 2 });
            const props = createMockProps(lesson);
            const { result } = renderHook(() => useReviewSession(props));

            expect(result.current.hasInterruptedSession).toBe(true);
            expect(result.current.lastSessionIndex).toBe(2);
        });

        it('should not detect interrupted session when lastSessionIndex is 0 or undefined', () => {
            const props = createMockProps();
            const { result } = renderHook(() => useReviewSession(props));

            expect(result.current.hasInterruptedSession).toBe(false);
        });

        it('should resume from correct index when mode is resume', () => {
            const lesson = createMockLesson({ lastSessionIndex: 2 });
            const props = createMockProps(lesson);
            const { result } = renderHook(() => useReviewSession(props));

            act(() => {
                result.current.handleStartReview('resume', { resumeFromIndex: 2 });
            });

            expect(result.current.showStartScreen).toBe(false);
            expect(result.current.currentIndex).toBe(2);
            expect(result.current.masteredCount).toBe(2);
        });
    });

    describe('Handle Start Review', () => {
        it('should start from beginning when mode is all', () => {
            const props = createMockProps();
            const { result } = renderHook(() => useReviewSession(props));

            act(() => {
                result.current.handleStartReview('all');
            });

            expect(result.current.showStartScreen).toBe(false);
            expect(result.current.currentIndex).toBe(0);
            expect(result.current.studyQuestions.length).toBe(3);
        });

        it('should filter only difficult questions when mode is difficult', () => {
            const lesson = createMockLesson({
                questions: [
                    { id: 'q1', question: { text: 'Q1' }, answer: { text: 'A1' }, lastRating: 0 },
                    { id: 'q2', question: { text: 'Q2' }, answer: { text: 'A2' }, lastRating: 2 },
                    { id: 'q3', question: { text: 'Q3' }, answer: { text: 'A3' }, lastRating: 1 }
                ]
            });
            const props = createMockProps(lesson);
            const { result } = renderHook(() => useReviewSession(props));

            act(() => {
                result.current.handleStartReview('difficult');
            });

            // Only questions with lastRating < 2 (i.e., 0 and 1)
            expect(result.current.studyQuestions.length).toBe(2);
        });

        it('should clear lastSessionIndex when starting fresh with all mode', () => {
            const lesson = createMockLesson({ lastSessionIndex: 2 });
            const props = createMockProps(lesson);
            const { result } = renderHook(() => useReviewSession(props));

            act(() => {
                result.current.handleStartReview('all');
            });

            // onUpdate should be called with cleared lastSessionIndex
            expect(props.onUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    lastSessionIndex: undefined
                })
            );
        });
    });

    describe('Difficult Questions Count', () => {
        it('should correctly count difficult questions', () => {
            const lesson = createMockLesson({
                questions: [
                    { id: 'q1', question: { text: 'Q1' }, answer: { text: 'A1' }, lastRating: 0 },
                    { id: 'q2', question: { text: 'Q2' }, answer: { text: 'A2' }, lastRating: 2 },
                    { id: 'q3', question: { text: 'Q3' }, answer: { text: 'A3' }, lastRating: 1 }
                ]
            });
            const props = createMockProps(lesson);
            const { result } = renderHook(() => useReviewSession(props));

            expect(result.current.difficultQuestionsCount).toBe(2);
        });

        it('should return 0 when no difficult questions', () => {
            const lesson = createMockLesson({
                questions: [
                    { id: 'q1', question: { text: 'Q1' }, answer: { text: 'A1' }, lastRating: 2 },
                    { id: 'q2', question: { text: 'Q2' }, answer: { text: 'A2' }, lastRating: 2 }
                ]
            });
            const props = createMockProps(lesson);
            const { result } = renderHook(() => useReviewSession(props));

            expect(result.current.difficultQuestionsCount).toBe(0);
        });
    });

    describe('Close with Save', () => {
        it('should call onClose when handleCloseWithSave is called', () => {
            const props = createMockProps();
            const { result } = renderHook(() => useReviewSession(props));

            act(() => {
                result.current.handleCloseWithSave();
            });

            expect(props.onClose).toHaveBeenCalled();
        });

        it('should NOT save progress for public lessons', () => {
            const lesson = createMockLesson({ isPublic: true });
            const props = createMockProps(lesson);
            const { result } = renderHook(() => useReviewSession(props));

            // Start review and complete a question
            act(() => {
                result.current.handleStartReview('all');
            });

            act(() => {
                result.current.handleRating(2); // By heart
            });

            act(() => {
                result.current.handleCloseWithSave();
            });

            // onUpdate should NOT be called with lastSessionIndex for public lessons
            expect(props.onUpdate).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    lastSessionIndex: expect.anything()
                })
            );
        });
    });
});
