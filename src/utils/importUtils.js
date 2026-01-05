export const parseGeminiOutput = (text) => {
    if (!text || !text.trim()) return { title: '', label: '', importantNote: '', cards: [] };

    let rawData = null;
    let title = '';
    let label = '';
    let importantNote = '';
    let cards = [];

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
            label = rawData.label || '';
            importantNote = rawData.importantNote || rawData.note || '';
            cards = rawData.cards || [];
        }
    } else {
        // Plain text parsing
        // Extract Title, Label, Note if present
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
    // Map to the internal card structure
    const formattedCards = cards.map(item => {
        const isMcq = item.type === 'mcq' || (item.options && Array.isArray(item.options));
        const type = isMcq ? 'mcq' : 'flashcard';

        // Normalize options for MCQ
        let options = [];
        if (isMcq && item.options) {
            options = item.options.map(opt => ({
                id: Date.now() + Math.random(),
                text: typeof opt === 'string' ? opt : (opt.text || ''),
                isCorrect: item.answer === opt || (typeof opt === 'object' && opt.isCorrect)
            }));

            // If answer is an index
            if (typeof item.answer === 'number' && options[item.answer]) {
                options[item.answer].isCorrect = true;
            }
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
                text: item.answer || item.a || '', // Keep for reference or fallback
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
        cards: formattedCards
    };
};
