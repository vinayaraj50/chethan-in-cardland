const normalizeMetadata = (field, value) => {
    if (!value) return '';
    const val = String(value).trim();

    switch (field) {
        case 'standard':
            const std = val.toUpperCase().replace(/^(STANDARD|STD|CLASS|GRADE)\s*/i, '');
            const stdMap = {
                '5': 'V', 'V': 'V',
                '6': 'VI', 'VI': 'VI',
                '7': 'VII', 'VII': 'VII',
                '8': 'VIII', 'VIII': 'VIII',
                '9': 'IX', 'IX': 'IX',
                '10': 'X', 'X': 'X'
            };
            return stdMap[std] || std;

        case 'syllabus':
            const syl = val.toUpperCase();
            if (syl.includes('NCERT')) return 'NCERT';
            if (syl.includes('KERALA')) return 'Kerala';
            return val;

        case 'medium':
            const med = val.toLowerCase();
            if (med.includes('malayalam')) return 'Malayalam';
            if (med.includes('english')) return 'English';
            return val.charAt(0).toUpperCase() + val.slice(1);

        case 'subject':
            const sub = val.toLowerCase();
            if (sub.includes('math')) return 'Maths';
            if (sub.includes('social')) return 'Social Science';
            if (sub.includes('science')) return 'Science';
            if (sub.includes('malayalam')) return 'Malayalam';
            if (sub.includes('hindi')) return 'Hindi';
            if (sub.includes('english')) return 'English';
            return val.charAt(0).toUpperCase() + val.slice(1);

        default:
            return val;
    }
};

export const parseGeminiOutput = (text) => {
    if (!text || !text.trim()) return { title: '', label: '', importantNote: '', questions: [], sections: [] };

    let rawData = null;
    let title = '';
    let label = '';
    let importantNote = '';
    let questions = [];
    let standard = '';
    let syllabus = '';
    let medium = '';
    let subject = '';
    let cost = 0;
    let sections = [];

    // Try parsing as JSON first
    try {
        const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
            rawData = JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        // Not JSON
    }

    if (rawData) {
        if (Array.isArray(rawData)) {
            questions = rawData;
        } else {
            title = rawData.title || '';
            label = rawData.label || rawData.tag || '';
            importantNote = rawData.importantNote || rawData.note || '';
            standard = normalizeMetadata('standard', rawData.standard || rawData.Standard);
            syllabus = normalizeMetadata('syllabus', rawData.syllabus || rawData.Syllabus);
            medium = normalizeMetadata('medium', rawData.medium || rawData.Medium);
            subject = normalizeMetadata('subject', rawData.subject || rawData.Subject);
            cost = rawData.cost || rawData.Cost || 0;
            sections = rawData.sections || [];
            questions = rawData.questions || rawData.cards || [];
        }
    } else {
        // Plain text parsing
        const titleMatch = text.match(/^(?:Title|Lesson Title|Stack Title|Name):\s*(.*)$/im);
        const labelMatch = text.match(/^(?:Label|Category|Tag):\s*(.*)$/im);
        const noteMatch = text.match(/^(?:Important Note|Note|Description):\s*(.*)$/im);

        title = titleMatch ? titleMatch[1].trim() : '';
        label = labelMatch ? labelMatch[1].trim() : '';
        importantNote = noteMatch ? noteMatch[1].trim() : '';

        // Metadata parsing
        const standardMatch = text.match(/^(?:Standard|Class|Grade):\s*(.*)$/im);
        const syllabusMatch = text.match(/^(?:Syllabus|Board):\s*(.*)$/im);
        const mediumMatch = text.match(/^(?:Medium|Language):\s*(.*)$/im);
        const subjectMatch = text.match(/^(?:Subject):\s*(.*)$/im);
        const costMatch = text.match(/^(?:Cost|Coins|Price):\s*(\d+)$/im);

        standard = normalizeMetadata('standard', standardMatch ? standardMatch[1].trim() : '');
        syllabus = normalizeMetadata('syllabus', syllabusMatch ? syllabusMatch[1].trim() : '');
        medium = normalizeMetadata('medium', mediumMatch ? mediumMatch[1].trim() : '');
        subject = normalizeMetadata('subject', subjectMatch ? subjectMatch[1].trim() : '');
        cost = costMatch ? parseInt(costMatch[1], 10) : 0;

        const pairs = text.split(/(?=Q:|Question:|Q\d+:|Question \d+:)/i);
        pairs.forEach(pair => {
            if (!pair.trim()) return;
            const qMatch = pair.match(/(?:Q:|Question:|Q\d+:|Question \d+:)\s*([\s\S]*?)(?=A:|Answer:|A\d+:|Answer \d+:|$)/i);
            const aMatch = pair.match(/(?:A:|Answer:|A\d+:|Answer \d+:)\s*([\s\S]*?)(?=Q:|Question:|Q\d+:|Question \d+:|$)/i);
            if (qMatch && aMatch) {
                questions.push({
                    question: qMatch[1].trim(),
                    answer: aMatch[1].trim()
                });
            }
        });
    }

    const formatQuestion = (item) => {
        const choices = item.choices || item.options || [];
        const isMcq = item.type === 'mcq' || (choices && Array.isArray(choices) && choices.length > 0);
        // Internal type: 'mcq' for MCQs, 'flashcard' for all other Q&A types
        // This matches what AddLessonModal creates and ensures consistency
        const type = isMcq ? 'mcq' : 'flashcard';

        let options = [];
        if (isMcq) {
            const correctMarker = item.correctAnswer || item.answer;
            options = choices.map((opt, idx) => {
                const optText = typeof opt === 'string' ? opt : (opt.text || '');
                let isCorrect = false;
                if (typeof correctMarker === 'number') {
                    isCorrect = idx === correctMarker;
                } else if (typeof opt === 'object' && opt.isCorrect !== undefined) {
                    isCorrect = opt.isCorrect;
                } else if (correctMarker) {
                    isCorrect = optText.trim().toLowerCase() === String(correctMarker).trim().toLowerCase();
                }
                return { id: Math.random(), text: optText, isCorrect };
            });
        }

        // Handle both new schema (question/answer as strings) and old schema (as objects)
        const getQuestionText = () => {
            if (typeof item.question === 'string') return item.question;
            if (typeof item.question === 'object' && item.question?.text) return item.question.text;
            if (typeof item.q === 'string') return item.q;
            return '';
        };

        const getAnswerText = () => {
            if (typeof item.answer === 'string') return item.answer;
            if (typeof item.answer === 'object' && item.answer?.text) return item.answer.text;
            if (typeof item.a === 'string') return item.a;
            return '';
        };

        return {
            id: Math.random(),
            type,
            question: {
                text: getQuestionText(),
                image: item.question?.image || '',
                audio: item.question?.audio || ''
            },
            answer: {
                text: getAnswerText(),
                image: item.answer?.image || '',
                audio: item.answer?.audio || ''
            },
            options
        };
    };

    // Process sections if present
    const processedSections = sections.map(section => ({
        noteSegment: section.noteSegment || '',
        questions: (section.questions || section.cards || []).map(formatQuestion)
    }));

    const allQuestions = processedSections.length > 0
        ? processedSections.flatMap(s => s.questions)
        : questions.map(formatQuestion);

    return {
        title,
        label,
        importantNote,
        standard,
        syllabus,
        medium,
        subject,
        cost: parseInt(cost) || 0,
        sections: processedSections,
        questions: allQuestions,
        cards: allQuestions // Backward compatibility
    };
};

/**
 * Normalizes lesson content from the new backend schema to the internal app format.
 * This should be called after server-side decryption to ensure questions have the correct structure.
 * 
 * @param {Object} lessonData - Raw decrypted lesson data from server
 * @returns {Object} - Normalized lesson data with questions in internal format
 */
export const normalizeLessonContent = (lessonData) => {
    if (!lessonData) return lessonData;

    // Helper to normalize a single question/card
    const normalizeQuestion = (item) => {
        // Skip if already in internal format (question is an object with text property)
        if (item.question && typeof item.question === 'object' && 'text' in item.question) {
            return item;
        }

        const choices = item.choices || item.options || [];
        const isMcq = item.type === 'mcq' || (choices && Array.isArray(choices) && choices.length > 0);
        const type = isMcq ? 'mcq' : 'flashcard';

        let options = [];
        if (isMcq) {
            const correctMarker = item.correctAnswer || (typeof item.answer === 'string' ? item.answer : null);
            options = choices.map((opt, idx) => {
                const optText = typeof opt === 'string' ? opt : (opt.text || '');
                let isCorrect = false;
                if (typeof correctMarker === 'number') {
                    isCorrect = idx === correctMarker;
                } else if (typeof opt === 'object' && opt.isCorrect !== undefined) {
                    isCorrect = opt.isCorrect;
                } else if (correctMarker) {
                    isCorrect = optText.trim().toLowerCase() === String(correctMarker).trim().toLowerCase();
                }
                return { id: item.id ? `${item.id}-opt-${idx}` : Math.random(), text: optText, isCorrect };
            });
        }

        // Extract question text (handle both string and object formats)
        const getQuestionText = () => {
            if (typeof item.question === 'string') return item.question;
            if (typeof item.question === 'object' && item.question?.text) return item.question.text;
            if (typeof item.q === 'string') return item.q;
            return '';
        };

        // Extract answer text
        const getAnswerText = () => {
            if (typeof item.answer === 'string') return item.answer;
            if (typeof item.answer === 'object' && item.answer?.text) return item.answer.text;
            if (typeof item.a === 'string') return item.a;
            return '';
        };

        return {
            id: item.id || Math.random(),
            type,
            question: {
                text: getQuestionText(),
                image: item.question?.image || '',
                audio: item.question?.audio || ''
            },
            answer: {
                text: getAnswerText(),
                image: item.answer?.image || '',
                audio: item.answer?.audio || ''
            },
            options,
            lastRating: item.lastRating
        };
    };

    // Process sections if present
    let normalizedSections = [];
    let normalizedQuestions = [];

    if (lessonData.sections && Array.isArray(lessonData.sections) && lessonData.sections.length > 0) {
        normalizedSections = lessonData.sections.map((section, sectionIndex) => {
            const noteSegment = section.noteSegment || '';
            const sectionQuestions = (section.questions || section.cards || []).map((q, qIndex) => ({
                ...normalizeQuestion(q),
                sectionIndex,
                sectionNoteSegment: noteSegment,
                isFirstInSection: qIndex === 0 && noteSegment // Mark first question if section has a note
            }));
            return {
                noteSegment,
                questions: sectionQuestions
            };
        });
        // Flatten sections to create top-level questions array (preserving section info on each question)
        normalizedQuestions = normalizedSections.flatMap(s => s.questions);
    } else if (lessonData.questions || lessonData.cards) {
        // No sections, just normalize top-level questions/cards
        const rawQuestions = lessonData.questions || lessonData.cards || [];
        normalizedQuestions = rawQuestions.map(normalizeQuestion);
    }

    return {
        ...lessonData,
        sections: normalizedSections,
        questions: normalizedQuestions,
        cards: normalizedQuestions // Backward compatibility
    };
};
