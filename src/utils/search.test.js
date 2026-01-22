
import { describe, it, expect } from 'vitest';

// Refined search logic implementation for testing
const matchesPreciseQuery = (text, query) => {
    const lowerText = (text || '').toLowerCase();
    const lowerQuery = (query || '').toLowerCase().trim();
    if (!lowerQuery) return true;

    const isNumberedSearch = /^\d+\.$/.test(lowerQuery);
    if (isNumberedSearch) {
        const regex = new RegExp(`(^|\\s)${lowerQuery.replace('.', '\\.')}(\\s|$)`);
        return regex.test(lowerText);
    }
    return lowerText.includes(lowerQuery);
};

describe('Search Precision Logic', () => {
    it('should match exact numbered sections', () => {
        expect(matchesPreciseQuery('1. Introduction', '1.')).toBe(true);
        expect(matchesPreciseQuery('Lesson 1. Overview', '1.')).toBe(true);
    });

    it('should NOT match broader numbered sections', () => {
        expect(matchesPreciseQuery('10. Advanced Topic', '1.')).toBe(false);
        expect(matchesPreciseQuery('11. Another Topic', '1.')).toBe(false);
        expect(matchesPreciseQuery('21. Topic', '1.')).toBe(false);
    });

    it('should NOT match decimals if only single dot is searched', () => {
        expect(matchesPreciseQuery('1.1 Sub-topic', '1.')).toBe(false);
    });

    it('should match standard keyword searches', () => {
        expect(matchesPreciseQuery('Maths Lesson', 'Maths')).toBe(true);
        expect(matchesPreciseQuery('Social Science', 'social')).toBe(true);
    });

    it('should be case insensitive', () => {
        expect(matchesPreciseQuery('MATHS', 'maths')).toBe(true);
    });

    it('should handle empty or null values', () => {
        expect(matchesPreciseQuery('', '1.')).toBe(false);
        expect(matchesPreciseQuery(null, '1.')).toBe(false);
        expect(matchesPreciseQuery('Title', '')).toBe(true);
    });
});
