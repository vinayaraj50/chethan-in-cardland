/**
 * Phrases for the "well-wisher friend" persona.
 * Split into context-aware categories.
 */

export const FIRST_QUESTION_SUCCESS = [
    "Off to a flying start!",
    "Great beginning!",
    "First one down, perfectly done!",
    "Strong start!",
    "Excellent opener!",
    "That's how we start!",
    "Right out of the gate - perfect!",
    "Setting a great pace!",
    "Boom! First one nailed!",
    "You're ready for this!"
];

export const STREAK_SUCCESS = [
    "You're on fire!",
    "Unstoppable!",
    "Look at you go!",
    "Nothing can stop you now!",
    "Incredible momentum!",
    "You're crushing this!",
    "Back-to-back brilliance!",
    "Another one! Perfect!",
    "You're in the zone!",
    "Keeping the streak alive!"
];

// For general success when not first question or streak
export const GENERIC_SUCCESS = [
    "Great job!",
    "Very good!",
    "Super!",
    "Excellent work!",
    "Spot on!",
    "You've got this by heart!",
    "Brilliant!",
    "Fantastic!",
    "Wonderful progress!",
    "You're doing amazing!",
    "Perfectly done!",
    "That's the spirit!",
    "Keep it up, champion!",
    "You're a natural!",
    "Masterful!",
    "Impressive memory!",
    "You nailed it!",
    "Outstanding!",
    "Way to go!",
    "Incredible focus!",
    "Gold star for you!",
    "You're making this look easy!",
    "Top notch!",
    "Simply superb!",
    "Bravo!",
    "Pure genius!",
    "Love that confidence!",
    "Right on the money!",
    "You're a star student!",
    "Marvelous!",
    "High five!",
    "That's exactly right!",
    "Spectacular!",
    "So proud of your progress!",
    "You're really shining today!",
    "Unbeatable!",
    "You've mastered this one!",
    "Clear and confident - well done!",
    "Your hard work is paying off!",
    "Solid effort, perfect result!",
    "You're built for this!",
    "A-plus performance!",
    "Victory is yours!"
];

export const PARTIAL_SUCCESS = [
    "Almost there! A quick review will help.",
    "Good effort! Just missed a detail.",
    "On the right track, let's polish it.",
    "Refining this will make it perfect.",
    "You're getting close, keep going!",
    "A little bit more practice on this one.",
    "Not quite 100%, but good try!",
    "Let's turn that 'almost' into 'perfect'.",
    "Close! We'll nail it next time.",
    "Good recall, just needs sharpening."
];

export const RETRY_PHRASES = [
    "Every mistake is a step toward mastery. Reviewing now!",
    "Give it another careful read; we’ll revisit this question.",
    "Take your time and read it again — I’ll ask it once more.",
    "No worries! Let's try this one again in a bit.",
    "Let's keep this one in the loop for a little longer.",
    "Practice makes perfect! We'll come back to this.",
    "Don't lose heart, let's give it another look together.",
    "Slow and steady wins the race. Read it once more.",
    "I'll ask this again soon to help you remember.",
    "It's okay! Even the best need a second look sometimes.",
    "Let's refine this one. Read carefully and we'll retry.",
    "A little more focus here will do wonders.",
    "Let's polish this answer together. See you again soon!",
    "Deep breaths! Read it again, and we'll revisit.",
    "Learning takes time. Let's keep this one active.",
    "You're doing great, just need to master this specific one.",
    "Give it one more glance. I'll be back with this question.",
    "Let's solidify this. A quick revisit is coming up.",
    "Don't rush! Read it again to let it sink in.",
    "We'll get this one right next time, I promise!",
    "Keep your chin up! Let's re-study this card.",
    "It's just a hurdle, not a wall. Re-reading helps!",
    "Let's refresh your memory on this one shortly.",
    "Stay positive! We'll tackle this again very soon.",
    "A quick recap, and you'll have it in no time.",
    "Let's keep this card in the 'must-know' pile for now.",
    "Reviewing is the key to success. Let's do it again.",
    "One more read-through will make all the difference.",
    "Persistence pays off! We'll cycle back to this.",
    "It's trial and error. Let's try one more trial.",
    "Let's give this one a second chance to shine.",
    "Focus on the details this time. Re-visiting shortly!",
    "You're learning! Let's re-confirm this one later.",
    "A bit more practice is all you need here.",
    "I believe in you! Let's re-read and try again.",
    "Let's not let this one slip away. Re-asking soon!",
    "Each review makes your brain stronger. Ready for round 2?",
    "Patience is a virtue in learning. Re-reading now.",
    "Let's keep the conversation going on this card.",
    "Small steps lead to big jumps. Let's re-step this one.",
    "Almost caught it! Let's throw the question again later.",
    "It's on the tip of your tongue! Let's review to be sure.",
    "Constructive repetition! We'll be back for this.",
    "Let's strengthen this connection in your memory.",
    "Honesty is the first step to learning. Re-trying soon!",
    "A moment of focus now saves a lot of time later.",
    "Let's bridge the gap on this one. Re-reading...",
    "Your friend is here to help! Let's look at this again.",
    "Final check is coming soon. Give it a good read now!"
];

/**
 * Returns a random phrase based on context.
 * @param {Object} options
 * @param {string} options.type - 'success' | 'partial' | 'retry'
 * @param {boolean} options.isFirstQuestion - Is this the first question of the session?
 * @param {number} options.streakCount - Current streak of 'success' answers
 */
export const getRandomPhrase = ({ type, isFirstQuestion = false, streakCount = 0 } = {}) => {
    let list = [];

    if (type === 'success') {
        if (isFirstQuestion) {
            list = FIRST_QUESTION_SUCCESS;
        } else if (streakCount >= 3) {
            // Mix streak phrases with generic ones to avoid repetition, but prioritize streak feel
            list = Math.random() > 0.4 ? STREAK_SUCCESS : GENERIC_SUCCESS;
        } else {
            list = GENERIC_SUCCESS;
        }
    } else if (type === 'partial') {
        list = PARTIAL_SUCCESS;
    } else {
        // Retry / Default
        list = RETRY_PHRASES;
    }

    return list[Math.floor(Math.random() * list.length)];
};
