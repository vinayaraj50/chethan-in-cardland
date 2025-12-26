import React from 'react';
import StackCard from '../components/StackCard';
import logo from '../assets/logo.png';

const Home = ({ stacks, loading, onReview, onEdit }) => {
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <div className="loader">Loading your stacks...</div>
            </div>
        );
    }

    if (stacks.length === 0) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '4rem 2rem', textAlign: 'center', gap: '2rem'
            }}>
                <div className="neo-flat" style={{
                    padding: '2.5rem', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <img src={logo} alt="Logo" style={{ width: '245px', height: '245px', objectFit: 'contain' }} />
                </div>
                <div style={{ maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '1.2rem', fontWeight: '500', lineHeight: '1.6', opacity: 0.8 }}>
                        Flashcards are small cards with a question on one side and the answer on the other, used to help you study and remember information quickly.
                    </p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.5 }}>
                        Click the "+" button to create your first flashcard stack!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <section>
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem'
                }}>
                    {stacks.map(stack => (
                        <StackCard
                            key={stack.driveFileId || stack.id}
                            stack={stack}
                            onReview={onReview}
                            onEdit={onEdit}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Home;
