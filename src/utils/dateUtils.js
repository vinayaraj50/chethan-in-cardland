/**
 * @fileoverview Date utilities for consistent, standard time formatting.
 * Adheres to 2026 standards using Intl.RelativeTimeFormat.
 */

/**
 * Returns a standardized relative time string and status object.
 * 
 * @param {Date|string} targetDate - The date to compare against.
 * @returns {{ text: string, isOverdue: boolean, color: string }}
 * 
 * Logic:
 * - If date is in the past: "Due: X days ago" (Red)
 * - If date is today: "Due: Today" (Red/Orange)
 * - If date is future: "Review in X days" (Normal)
 */
export const getRelativeTimeStatus = (targetDate) => {
    if (!targetDate) {
        return { text: 'New', isOverdue: false, color: 'inherit' };
    }

    const now = new Date();
    const target = new Date(targetDate);
    const diffMs = target - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Using Intl.RelativeTimeFormat for localized strings
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    // Thresholds
    // < 0 means past.
    // We treat anything "Today" (within -24h to +24h boundary overlap) carefully, 
    // but usually user wants "Due" if it's effectively today or past.

    if (diffDays < 0) {
        // Overdue
        // If it's effectively "today" (e.g. -0.5 days), rtf might say "yesterday" or "today" depending on rounding.
        // We force "Overdue" logic for anything clearly in the past.

        // Round to nearest day for cleaner display
        const absDays = Math.ceil(Math.abs(diffDays));

        if (absDays === 0) {
            return { text: 'Due: Today', isOverdue: true, color: '#ef4444' };
        }

        return {
            text: `Due: ${absDays} day${absDays === 1 ? '' : 's'} ago`,
            isOverdue: true,
            color: '#ef4444' // Red
        };
    } else {
        // Future
        const days = Math.ceil(diffDays);

        if (days === 0) {
            return { text: 'Due: Today', isOverdue: true, color: '#ef4444' };
        }

        if (days === 1) {
            return { text: 'Review: Tomorrow', isOverdue: false, color: 'var(--text-color)' };
        }

        return {
            text: `Review: in ${days} days`,
            isOverdue: false,
            color: 'var(--text-color)'
        };
    }
};
