import {
    getRandomPhrase,
    FIRST_QUESTION_SUCCESS,
    STREAK_SUCCESS,
    GENERIC_SUCCESS,
    PARTIAL_SUCCESS,
    RETRY_PHRASES
} from '../phrases';

describe('phrases.js', () => {
    test('returns first question success phrase when isFirstQuestion is true', () => {
        for (let i = 0; i < 20; i++) {
            const phrase = getRandomPhrase({ type: 'success', isFirstQuestion: true, streakCount: 0 });
            expect(FIRST_QUESTION_SUCCESS).toContain(phrase);
            expect(GENERIC_SUCCESS).not.toContain(phrase);
        }
    });

    test('returns streak phrase or generic phrase when streakCount >= 3', () => {
        // Since it's random, we check if we get at least one from each over many trials, 
        // OR just ensure it returns something valid (either streak or generic).
        const results = [];
        for (let i = 0; i < 100; i++) {
            results.push(getRandomPhrase({ type: 'success', isFirstQuestion: false, streakCount: 3 }));
        }

        const hasStreak = results.some(r => STREAK_SUCCESS.includes(r));
        const hasGeneric = results.some(r => GENERIC_SUCCESS.includes(r));

        // It's probabilistic (40% streak), but 100 trials is enough to be very certain
        // Note: The logic in phrases.js says: Math.random() > 0.4 ? STREAK : GENERIC
        // So ~60% chance of streak phrases.
        expect(hasStreak).toBe(true);
        expect(hasGeneric).toBe(true);
    });

    test('returns generic success phrase when not first question and short streak', () => {
        for (let i = 0; i < 20; i++) {
            const phrase = getRandomPhrase({ type: 'success', isFirstQuestion: false, streakCount: 1 });
            expect(GENERIC_SUCCESS).toContain(phrase);
            expect(STREAK_SUCCESS).not.toContain(phrase);
        }
    });

    test('returns partial success phrase when type is partial', () => {
        for (let i = 0; i < 20; i++) {
            const phrase = getRandomPhrase({ type: 'partial' });
            expect(PARTIAL_SUCCESS).toContain(phrase);
        }
    });

    test('returns retry phrase when type is retry', () => {
        for (let i = 0; i < 20; i++) {
            const phrase = getRandomPhrase({ type: 'retry' });
            expect(RETRY_PHRASES).toContain(phrase);
        }
    });

    test('handles missing options gracefully', () => {
        const phrase = getRandomPhrase();
        expect(RETRY_PHRASES).toContain(phrase); // Default is retry logic potentially
    });
});
