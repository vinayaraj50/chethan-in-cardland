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
    if (!text || !text.trim()) return { title: '', label: '', importantNote: '', cards: [], sections: [] };

    let rawData = null;
    let title = '';
    let label = '';
    let importantNote = '';
    let cards = [];
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
        // Not JSON, trying plain text parsing
    }

    if (rawData) {
        if (Array.isArray(rawData)) {
            cards = rawData;
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
            cards = rawData.cards || [];
        }
    } else {
        // Plain text parsing
        const titleMatch = text.match(/^(?:Title|Stack Title|Name):\s*(.*)$/im);
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
                cards.push({
                    question: qMatch[1].trim(),
                    answer: aMatch[1].trim()
                });
            }
        });
    }

    const formatCard = (item) => {
        const choices = item.choices || item.options || [];
        const isMcq = item.type === 'mcq' || (choices && Array.isArray(choices) && choices.length > 0);
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

        return {
            id: Math.random(),
            type,
            question: { text: item.question || item.q || '', image: '', audio: '' },
            answer: { text: item.answer || item.a || '', image: '', audio: '' },
            options
        };
    };

    // Process sections if present
    const processedSections = sections.map(section => ({
        noteSegment: section.noteSegment || '',
        cards: (section.cards || []).map(formatCard)
    }));

    // If we have sections, we can ALSO flatten them for backward compatibility if needed,
    // but the primary return should be structured.
    const allCards = processedSections.length > 0
        ? processedSections.flatMap(s => s.cards)
        : cards.map(formatCard);

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
        cards: allCards // Backward compatibility
    };
};

