import logo from '../assets/logo.png';

export const DEMO_STACK = {
    id: 'demo-stack',
    title: 'General Knowledge (Demo)',
    titleImage: logo, // Use logo as cover image
    label: 'Science',
    cards: [
        {
            id: 1,
            question: { text: "Which part of the human body has no blood supply?", image: '', audio: '' },
            answer: { text: "Cornea", image: '', audio: '' }
        },
        {
            id: 2,
            question: { text: "Which planet spins backwards?", image: '', audio: '' },
            answer: { text: "Venus", image: '', audio: '' }
        },
        {
            id: 3,
            question: { text: "How many hearts does an octopus have?", image: '', audio: '' },
            answer: { text: "Three", image: '', audio: '' }
        },
        {
            id: 4,
            question: { text: "Largest mammal?", image: '', audio: '' },
            answer: { text: "Blue whale", image: '', audio: '' }
        },
        {
            id: 5,
            question: { text: "Which everyday food never spoils naturally?", image: '', audio: '' },
            answer: { text: "Honey", image: '', audio: '' }
        }
    ],
    owner: 'chethanincardland@gmail.com',
    ownerName: 'Demo User',
    avgRating: 4.8,
    lastReviewed: null,
    isPublic: false // Show as a personal stack in My Stacks
};
