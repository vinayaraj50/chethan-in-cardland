/**
 * Security Utilities
 * Centralized validation and sanitization functions
 */

/**
 * Validates a data URI to ensure it's safe to render
 * @param {string} dataURI - The data URI to validate
 * @param {string[]} allowedTypes - Array of allowed MIME type prefixes (e.g., ['image/', 'audio/'])
 * @returns {boolean} - True if valid and safe, false otherwise
 */
export const validateDataURI = (dataURI, allowedTypes = ['image/', 'audio/']) => {
    if (!dataURI || typeof dataURI !== 'string') {
        return false;
    }

    // Reject javascript: URIs
    if (dataURI.toLowerCase().startsWith('javascript:')) {
        return false;
    }

    // Reject data:text/html URIs (XSS vector)
    if (dataURI.toLowerCase().startsWith('data:text/html')) {
        return false;
    }

    // If it's a data URI, validate the MIME type
    if (dataURI.startsWith('data:')) {
        const mimeTypeMatch = dataURI.match(/^data:([^;,]+)/);
        if (!mimeTypeMatch) {
            return false;
        }

        const mimeType = mimeTypeMatch[1].toLowerCase();
        const isAllowed = allowedTypes.some(type => mimeType.startsWith(type));

        if (!isAllowed) {
            return false;
        }
    }

    return true;
};

/**
 * Sanitizes text input by removing control characters and limiting length
 * @param {string} text - The text to sanitize
 * @param {number} maxLength - Maximum allowed length (default: 10000)
 * @returns {string} - Sanitized text
 */
export const sanitizeText = (text, maxLength = 10000) => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Remove control characters (except newlines and tabs)
    let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
};

/**
 * Sanitizes lesson title for safe use in URLs
 * @param {string} title - The lesson title
 * @returns {string} - Sanitized title
 */
export const sanitizeLessonTitle = (title) => {
    if (!title || typeof title !== 'string') {
        return 'Untitled';
    }

    // Remove control characters
    let sanitized = title.replace(/[\x00-\x1F\x7F]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length for URL usage
    if (sanitized.length > 50) {
        sanitized = sanitized.substring(0, 50);
    }

    // Remove characters that could break URL structure
    sanitized = sanitized.replace(/[&=?#]/g, '');

    return sanitized || 'Untitled';
};

// Backward compatibility alias
export const sanitizeStackTitle = sanitizeLessonTitle;

/**
 * Validates if a URL is a valid HTTPS URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid HTTPS URL, false otherwise
 */
export const isValidHttpsUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'https:';
    } catch (e) {
        return false;
    }
};

/**
 * Sanitizes feedback text for WhatsApp URL
 * Removes markdown special characters that could be exploited
 * @param {string} text - The feedback text
 * @returns {string} - Sanitized text
 */
export const sanitizeFeedbackText = (text) => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Limit length
    let sanitized = text.substring(0, 500);

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Escape markdown special characters to prevent injection
    // WhatsApp uses markdown-like formatting
    sanitized = sanitized.replace(/[*_~`]/g, '');

    return sanitized.trim();
};


/**
 * Validates email format
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid email format
 */
export const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return false;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
