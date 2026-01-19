import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ReviewQuestion from '../ReviewQuestion';

// Mock dependencies
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, style, animate, ...props }) => (
            <div style={style} data-testid="motion-div" {...props}>{children}</div>
        )
    }
}));

vi.mock('../common/AudioPlayer', () => ({
    default: () => <div data-testid="audio-player">Audio Player</div>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Brain: () => <span data-testid="icon-brain" />,
    BookOpen: () => <span data-testid="icon-book-open" />,
    FileText: () => <span data-testid="icon-file-text" />,
    ArrowRight: () => <span data-testid="icon-arrow-right" />
}));

describe('ReviewQuestion Component', () => {
    const mockMCQQuestion = {
        id: 'q1',
        type: 'mcq',
        isFirstInSection: true,
        sectionNoteSegment: 'This is a **section note** text.',
        question: {
            text: 'What is 2+2?',
            image: null,
            audio: null
        },
        options: [
            { id: 'opt1', text: '4', isCorrect: true },
            { id: 'opt2', text: '5', isCorrect: false }
        ]
    };

    const mockProps = {
        currentQuestion: mockMCQQuestion,
        isFlipped: false,
        setIsFlipped: vi.fn(),
        setViewingImage: vi.fn(),
        onRateMCQ: vi.fn(),
        feedback: null
    };

    it('displays Section Note Card when isFirstInSection is true and not acknowledged', () => {
        render(<ReviewQuestion {...mockProps} />);

        // Check for Section Note specific elements using test id
        expect(screen.getByTestId('section-note-card')).toBeInTheDocument();
        expect(screen.getByText('Start Questions')).toBeInTheDocument();

        // Ensure Question content is NOT visible yet
        expect(screen.queryByTestId('question-card-mcq')).not.toBeInTheDocument();
    });

    it('transitions to Question content when "Start Questions" is clicked', () => {
        render(<ReviewQuestion {...mockProps} />);

        // Click the start button
        const startButton = screen.getByText('Start Questions');
        fireEvent.click(startButton);

        // Section Note should disappear
        expect(screen.queryByTestId('section-note-card')).not.toBeInTheDocument();

        // Question content should appear
        expect(screen.getByTestId('question-card-mcq')).toBeInTheDocument();
    });

    it('does NOT display Section Note if it is not the first question in section', () => {
        const notFirstQuestion = {
            ...mockMCQQuestion,
            isFirstInSection: false
        };

        render(<ReviewQuestion {...mockProps} currentQuestion={notFirstQuestion} />);

        // Section Note should definitely not be there
        expect(screen.queryByTestId('section-note-card')).not.toBeInTheDocument();

        // Question should be immediately visible
        expect(screen.getByTestId('question-card-mcq')).toBeInTheDocument();
    });

    it('resets acknowledgement when question changes to a new section start', () => {
        const { rerender } = render(<ReviewQuestion {...mockProps} />);

        // 1. Initial State: Showing Note
        expect(screen.getByTestId('section-note-card')).toBeInTheDocument();

        // 2. User acknowledges
        fireEvent.click(screen.getByText('Start Questions'));
        expect(screen.queryByTestId('section-note-card')).not.toBeInTheDocument();
        expect(screen.getByTestId('question-card-mcq')).toBeInTheDocument();

        // 3. Navigate to NEXT question (same section) -> No note
        const q2SameSection = {
            ...mockMCQQuestion,
            id: 'q2',
            isFirstInSection: false
        };
        rerender(<ReviewQuestion {...mockProps} currentQuestion={q2SameSection} />);
        expect(screen.queryByTestId('section-note-card')).not.toBeInTheDocument();

        // 4. Navigate to NEW section key question -> Note appears again
        const q3NewSection = {
            ...mockMCQQuestion,
            id: 'q3',
            isFirstInSection: true,
            sectionNoteSegment: 'New Section Note'
        };
        rerender(<ReviewQuestion {...mockProps} currentQuestion={q3NewSection} />);

        // Should show the new note
        expect(screen.getByTestId('section-note-card')).toBeInTheDocument();
    });
});
