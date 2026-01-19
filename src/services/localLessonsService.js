/**
 * @fileoverview Local Lessons Service
 * Loads lessons from local JSON files in the public/lessons directory.
 * Extracts metadata for filtering compatibility.
 */

// Manifest of local lesson files - add new files here
const LOCAL_LESSON_FILES = [
    // 'example-lesson.json'
];

/**
 * Extracts metadata from a lesson JSON structure
 * @param {Object} lessonData - Raw lesson data from JSON file
 * @param {string} filename - Source filename
 * @returns {Object} Normalized lesson with metadata
 */
const extractLessonMetadata = (lessonData, filename) => {
    // Normalize function for consistent casing
    const normalize = (val) => {
        if (!val) return val;
        return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    };

    // Extract core metadata fields
    const metadata = {
        id: lessonData.id || filename.replace('.json', ''),
        title: lessonData.title || 'Untitled Lesson',
        titleImage: lessonData.titleImage || '',
        label: lessonData.label || 'No Label',
        standard: lessonData.standard?.toUpperCase() || null,
        syllabus: normalize(lessonData.syllabus),
        medium: normalize(lessonData.medium),
        subject: normalize(lessonData.subject),
        cost: parseInt(lessonData.cost || 0),
        importantNote: lessonData.importantNote || '',
        questions: lessonData.questions || lessonData.cards || [],
        questionCount: lessonData.questions?.length || lessonData.cards?.length || 0,
        owner: lessonData.owner || null,
        avgRating: lessonData.avgRating || null,
        lastReviewed: lessonData.lastReviewed || null,
        source: 'local',
        isLocal: true,
        isPublic: true,
        isPremium: (parseInt(lessonData.cost || 0)) > 0
    };

    return metadata;
};

/**
 * Loads a single lesson JSON file from the public/lessons directory
 * @param {string} filename - Name of the JSON file
 * @returns {Promise<Object|null>} Lesson data or null if failed
 */
const loadLessonFile = async (filename) => {
    try {
        const response = await fetch(`/lessons/${filename}`);
        if (!response.ok) {
            console.warn(`[LocalLessons] Failed to load ${filename}: HTTP ${response.status}`);
            return null;
        }
        const data = await response.json();
        return extractLessonMetadata(data, filename);
    } catch (error) {
        console.error(`[LocalLessons] Error loading ${filename}:`, error);
        return null;
    }
};

/**
 * Lists all local lessons from the public/lessons directory
 * @returns {Promise<Array>} Array of lesson metadata objects
 */
export const listLocalLessons = async () => {
    console.log('[LocalLessons] Loading local lessons from public/lessons...');

    try {
        const results = await Promise.allSettled(
            LOCAL_LESSON_FILES.map(file => loadLessonFile(file))
        );

        const lessons = results
            .filter(r => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value);

        console.log(`[LocalLessons] Loaded ${lessons.length} local lessons`);
        return lessons;
    } catch (error) {
        console.error('[LocalLessons] Failed to load local lessons:', error);
        return [];
    }
};

/**
 * Gets full content of a local lesson (includes questions array)
 * @param {string} lessonIdOrFilename - Lesson ID or filename
 * @returns {Promise<Object|null>} Full lesson data or null
 */
export const getLocalLessonContent = async (lessonIdOrFilename) => {
    // Find matching filename
    const filename = LOCAL_LESSON_FILES.find(f =>
        f.includes(lessonIdOrFilename) || f.replace('.json', '') === lessonIdOrFilename
    );

    if (!filename) {
        console.warn(`[LocalLessons] Lesson not found: ${lessonIdOrFilename}`);
        return null;
    }

    try {
        const response = await fetch(`/lessons/${filename}`);
        if (!response.ok) return null;
        const data = await response.json();
        return { ...data, source: 'local', isLocal: true };
    } catch (error) {
        console.error(`[LocalLessons] Error getting content for ${lessonIdOrFilename}:`, error);
        return null;
    }
};

/**
 * Extracts unique filter options from a collection of lessons
 * @param {Array} lessons - Array of lesson objects with metadata
 * @returns {Object} Filter options for standard, syllabus, medium, subject
 */
export const extractFilterOptions = (lessons) => {
    const options = {
        standards: new Set(),
        syllabuses: new Set(),
        mediums: new Set(),
        subjects: new Set()
    };

    lessons.forEach(lesson => {
        if (lesson.standard) options.standards.add(lesson.standard);
        if (lesson.syllabus) options.syllabuses.add(lesson.syllabus);
        if (lesson.medium) options.mediums.add(lesson.medium);
        if (lesson.subject) options.subjects.add(lesson.subject);
    });

    return {
        standards: Array.from(options.standards).sort(),
        syllabuses: Array.from(options.syllabuses).sort(),
        mediums: Array.from(options.mediums).sort(),
        subjects: Array.from(options.subjects).sort()
    };
};

export default {
    listLocalLessons,
    getLocalLessonContent,
    extractFilterOptions
};
