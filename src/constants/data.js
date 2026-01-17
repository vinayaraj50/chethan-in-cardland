import logo from '../assets/logo.png';
import { ADMIN_EMAIL } from './config';

export const DEMO_STACK = {
    id: 'demo-stack',
    title: 'General Knowledge (Demo)',
    titleImage: logo,
    label: 'Science',
    cards: [
        {
            id: 1,
            question: { text: "What is the role of red blood cells?", image: '', audio: '' },
            answer: { text: "They carry oxygen to body tissues.", image: '', audio: '' }
        },
        {
            id: 2,
            question: { text: "Why do we need sleep?", image: '', audio: '' },
            answer: { text: "Sleep helps the body and brain recover and function properly.", image: '', audio: '' }
        },
        {
            id: 3,
            type: 'mcq',
            question: { text: "Which part of the human body has no blood supply?", image: '', audio: '' },
            options: [
                { id: 'a', text: 'Retina', isCorrect: false },
                { id: 'b', text: 'Cornea', isCorrect: true },
                { id: 'c', text: 'Brain', isCorrect: false },
                { id: 'd', text: 'Liver', isCorrect: false }
            ],
            answer: { text: "Cornea", image: '', audio: '' }
        },
        {
            id: 4,
            question: { text: "Who was known as the Iron Man of India?", image: '', audio: '' },
            answer: { text: "Sardar Vallabhbhai Patel was known as the Iron Man of India.", image: '', audio: '' }
        },
        {
            id: 5,
            type: 'mcq',
            question: { text: "Which planet spins backwards compared to others?", image: '', audio: '' },
            options: [
                { id: 'a', text: 'Mars', isCorrect: false },
                { id: 'b', text: 'Earth', isCorrect: false },
                { id: 'c', text: 'Venus', isCorrect: true },
                { id: 'd', text: 'Jupiter', isCorrect: false }
            ],
            answer: { text: "Venus", image: '', audio: '' }
        }
    ],
    owner: ADMIN_EMAIL,
    ownerName: 'Demo User',
    avgRating: 4.8,
    lastReviewed: 'Jan 7, 2026',
    nextReview: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    reviewStage: 0,
    isPublic: false
};
