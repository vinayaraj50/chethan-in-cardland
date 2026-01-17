import { describe, it, expect } from 'vitest';
import { 
    validateDataURI, 
    sanitizeText, 
    sanitizeStackTitle, 
    isValidHttpsUrl, 
    sanitizeFeedbackText, 
    isValidEmail 
} from './securityUtils';

describe('securityUtils', () => {
    describe('validateDataURI', () => {
        it('should return false for non-string inputs', () => {
            expect(validateDataURI(null)).toBe(false);
            expect(validateDataURI(123)).toBe(false);
            expect(validateDataURI({})).toBe(false);
        });

        it('should reject javascript: URIs', () => {
            expect(validateDataURI('javascript:alert(1)')).toBe(false);
            expect(validateDataURI('JAVASCRIPT:alert(1)')).toBe(false);
        });

        it('should reject data:text/html URIs', () => {
            expect(validateDataURI('data:text/html,<html></html>')).toBe(false);
        });

        it('should allow valid image data URIs', () => {
            expect(validateDataURI('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR42mP8/mwAAAIBAPfMhtLSAAAAAElFTkSuQmCC')).toBe(true);
        });

        it('should allow valid audio data URIs', () => {
            expect(validateDataURI('data:audio/mp3;base64,SUQzBAAAAAAA')).toBe(true);
        });

        it('should reject MIME types not in allowedTypes', () => {
            expect(validateDataURI('data:application/pdf;base64,abc', ['image/'])).toBe(false);
        });

        it('should return true for normal HTTPS URLs as they are not data URIs', () => {
            expect(validateDataURI('https://example.com/image.png')).toBe(true);
        });
    });

    describe('sanitizeText', () => {
        it('should return empty string for non-string inputs', () => {
            expect(sanitizeText(null)).toBe('');
            expect(sanitizeText(undefined)).toBe('');
        });

        it('should remove control characters except newlines and tabs', () => {
            const input = 'Hello\x00World\nTab\tBack\x08';
            expect(sanitizeText(input)).toBe('HelloWorld\nTab\tBack');
        });

        it('should limit length', () => {
            const longText = 'a'.repeat(20);
            expect(sanitizeText(longText, 10)).toBe('aaaaaaaaaa');
        });
    });

    describe('sanitizeStackTitle', () => {
        it('should return "Untitled" for invalid inputs', () => {
            expect(sanitizeStackTitle(null)).toBe('Untitled');
            expect(sanitizeStackTitle('')).toBe('Untitled');
        });

        it('should remove characters that break URL structure', () => {
            expect(sanitizeStackTitle('Math & Science? #1')).toBe('Math  Science 1');
        });

        it('should trim whitespace and limit length', () => {
            const longTitle = '   ' + 'a'.repeat(60) + '   ';
            const result = sanitizeStackTitle(longTitle);
            expect(result).toHaveLength(50);
            expect(result).not.toMatch(/^\s/);
            expect(result).not.toMatch(/\s$/);
        });
    });

    describe('isValidHttpsUrl', () => {
        it('should return true for valid HTTPS URLs', () => {
            expect(isValidHttpsUrl('https://example.com')).toBe(true);
            expect(isValidHttpsUrl('https://sub.example.com/path?q=1')).toBe(true);
        });

        it('should return false for HTTP URLs', () => {
            expect(isValidHttpsUrl('http://example.com')).toBe(false);
        });

        it('should return false for invalid URLs', () => {
            expect(isValidHttpsUrl('not-a-url')).toBe(false);
            expect(isValidHttpsUrl('ftp://example.com')).toBe(false);
        });
    });

    describe('sanitizeFeedbackText', () => {
        it('should remove markdown-like formatting characters', () => {
            expect(sanitizeFeedbackText('Hello *World* _Test_ ~Strike~ `Code`')).toBe('Hello World Test Strike Code');
        });

        it('should trim and limit length to 500', () => {
            const longText = 'a'.repeat(600);
            expect(sanitizeFeedbackText(longText)).toHaveLength(500);
        });
    });

    describe('isValidEmail', () => {
        it('should return true for valid emails', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
        });

        it('should return false for invalid emails', () => {
            expect(isValidEmail('invalid-email')).toBe(false);
            expect(isValidEmail('test@domain')).toBe(false);
            expect(isValidEmail('@domain.com')).toBe(false);
        });
    });
});
