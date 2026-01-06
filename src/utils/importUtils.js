export const parseGeminiOutput = (text) => {
    if (!text || !text.trim()) return { title: '', label: '', importantNote: '', cards: [] };

    let standard = '';
    let syllabus = '';
    let medium = '';
    let subject = '';
    let cost = 0;

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
            standard = rawData.standard || rawData.Standard || '';
            syllabus = rawData.syllabus || rawData.Syllabus || '';
            medium = rawData.medium || rawData.Medium || '';
            subject = rawData.subject || rawData.Subject || '';
            cost = rawData.cost || rawData.Cost || 0;
            cards = rawData.cards || [];
        }
    } else {
        // Plain text parsing (keeping existing logic for backward compatibility)
        const titleMatch = text.match(/^(?:Title|Stack Title|Name):\s*(.*)$/im);
        const labelMatch = text.match(/^(?:Label|Category|Tag):\s*(.*)$/im);
        const noteMatch = text.match(/^(?:Important Note|Note|Description):\s*(.*)$/im);

        title = titleMatch ? titleMatch[1].trim() : '';
        label = labelMatch ? labelMatch[1].trim() : '';
        importantNote = noteMatch ? noteMatch[1].trim() : '';

        // Look for patterns like "Q: ... A: ..." or "Question: ... Answer: ..."
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

    // Map to the internal card structure
    const formattedCards = cards.map(item => {
        // MCQ detection: either explicit type, or presence of 'choices' or 'options'
        const choices = item.choices || item.options || [];
        const isMcq = item.type === 'mcq' || (choices && Array.isArray(choices) && choices.length > 0);
        const type = isMcq ? 'mcq' : 'flashcard';

        // Normalize options for MCQ
        let options = [];
        if (isMcq) {
            const correctMarker = item.correctAnswer || item.answer; // Can be text or index
            options = choices.map((opt, idx) => {
                const optText = typeof opt === 'string' ? opt : (opt.text || '');
                let isCorrect = false;

                if (typeof correctMarker === 'number') {
                    isCorrect = idx === correctMarker;
                } else if (typeof opt === 'object' && opt.isCorrect !== undefined) {
                    isCorrect = opt.isCorrect;
                } else if (correctMarker) {
                    // Match text (loosely)
                    isCorrect = optText.trim().toLowerCase() === String(correctMarker).trim().toLowerCase();
                }

                return {
                    id: Date.now() + Math.random(),
                    text: optText,
                    isCorrect
                };
            });
        }

        return {
            id: Date.now() + Math.random(),
            type,
            question: {
                text: item.question || item.q || '',
                image: '',
                audio: ''
            },
            answer: {
                text: item.answer || item.a || '',
                image: '',
                audio: ''
            },
            options // Only populated for MCQs
        };
    });

    return {
        title,
        label,
        importantNote,
        standard,
        syllabus,
        medium,
        subject,
        cost: parseInt(cost) || 0,
        cards: formattedCards
    };
};
