/**
 * @fileoverview Local Stacks Service
 * Loads flashcard stacks from local JSON files in the public/stacks directory.
 * Extracts metadata for filtering compatibility.
 */

// Manifest of local stack files - add new files here
const LOCAL_STACK_FILES = [
    // 'example-stack.json'
];

/**
 * Extracts metadata from a stack JSON structure
 * @param {Object} stackData - Raw stack data from JSON file
 * @param {string} filename - Source filename
 * @returns {Object} Normalized stack with metadata
 */
const extractStackMetadata = (stackData, filename) => {
    // Normalize function for consistent casing
    const normalize = (val) => {
        if (!val) return val;
        return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    };

    // Extract core metadata fields
    const metadata = {
        id: stackData.id || filename.replace('.json', ''),
        title: stackData.title || 'Untitled Stack',
        titleImage: stackData.titleImage || '',
        label: stackData.label || 'No Label',
        standard: stackData.standard?.toUpperCase() || null,
        syllabus: normalize(stackData.syllabus),
        medium: normalize(stackData.medium),
        subject: normalize(stackData.subject),
        cost: parseInt(stackData.cost || 0),
        importantNote: stackData.importantNote || '',
        cards: stackData.cards || [],
        cardCount: stackData.cards?.length || 0,
        owner: stackData.owner || null,
        avgRating: stackData.avgRating || null,
        lastReviewed: stackData.lastReviewed || null,
        source: 'local',
        isLocal: true,
        isPublic: true,
        isPremium: (parseInt(stackData.cost || 0)) > 0
    };

    return metadata;
};

/**
 * Loads a single stack JSON file from the public/stacks directory
 * @param {string} filename - Name of the JSON file
 * @returns {Promise<Object|null>} Stack data or null if failed
 */
const loadStackFile = async (filename) => {
    try {
        const response = await fetch(`/stacks/${filename}`);
        if (!response.ok) {
            console.warn(`[LocalStacks] Failed to load ${filename}: HTTP ${response.status}`);
            return null;
        }
        const data = await response.json();
        return extractStackMetadata(data, filename);
    } catch (error) {
        console.error(`[LocalStacks] Error loading ${filename}:`, error);
        return null;
    }
};

/**
 * Lists all local stacks from the public/stacks directory
 * @returns {Promise<Array>} Array of stack metadata objects
 */
export const listLocalStacks = async () => {
    console.log('[LocalStacks] Loading local stacks from public/stacks...');

    try {
        const results = await Promise.allSettled(
            LOCAL_STACK_FILES.map(file => loadStackFile(file))
        );

        const stacks = results
            .filter(r => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value);

        console.log(`[LocalStacks] Loaded ${stacks.length} local stacks`);
        return stacks;
    } catch (error) {
        console.error('[LocalStacks] Failed to load local stacks:', error);
        return [];
    }
};

/**
 * Gets full content of a local stack (includes cards array)
 * @param {string} stackIdOrFilename - Stack ID or filename
 * @returns {Promise<Object|null>} Full stack data or null
 */
export const getLocalStackContent = async (stackIdOrFilename) => {
    // Find matching filename
    const filename = LOCAL_STACK_FILES.find(f =>
        f.includes(stackIdOrFilename) || f.replace('.json', '') === stackIdOrFilename
    );

    if (!filename) {
        console.warn(`[LocalStacks] Stack not found: ${stackIdOrFilename}`);
        return null;
    }

    try {
        const response = await fetch(`/stacks/${filename}`);
        if (!response.ok) return null;
        const data = await response.json();
        return { ...data, source: 'local', isLocal: true };
    } catch (error) {
        console.error(`[LocalStacks] Error getting content for ${stackIdOrFilename}:`, error);
        return null;
    }
};

/**
 * Extracts unique filter options from a collection of stacks
 * @param {Array} stacks - Array of stack objects with metadata
 * @returns {Object} Filter options for standard, syllabus, medium, subject
 */
export const extractFilterOptions = (stacks) => {
    const options = {
        standards: new Set(),
        syllabuses: new Set(),
        mediums: new Set(),
        subjects: new Set()
    };

    stacks.forEach(stack => {
        if (stack.standard) options.standards.add(stack.standard);
        if (stack.syllabus) options.syllabuses.add(stack.syllabus);
        if (stack.medium) options.mediums.add(stack.medium);
        if (stack.subject) options.subjects.add(stack.subject);
    });

    return {
        standards: Array.from(options.standards).sort(),
        syllabuses: Array.from(options.syllabuses).sort(),
        mediums: Array.from(options.mediums).sort(),
        subjects: Array.from(options.subjects).sort()
    };
};

export default {
    listLocalStacks,
    getLocalStackContent,
    extractFilterOptions
};
