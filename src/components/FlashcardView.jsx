import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDecksStore } from '../store';
import Flashcard from './FlashCard';

// Helper function to shuffle an array
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const FlashcardView = ({ decks }) => {
    const { deckId } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); // Hook to access navigation state

    const updateCardProgress = useDecksStore((state) => state.updateCardProgress);
    const addXp = useDecksStore((state) => state.addXp); // Get the addXp action

    // Determine if this is a review session or a regular deck study session
    const isReviewSession = location.pathname === '/review';
    
    // Get the deck data based on the session type
    const deck = useMemo(() => {
        if (isReviewSession) {
            // If it's a review session, use the cards passed in the navigation state
            return {
                title: "Review Session",
                cards: location.state?.reviewCards || []
            };
        }
        // Otherwise, get the deck from the main decks object
        return decks[deckId];
    }, [isReviewSession, decks, deckId, location.state]);

    const [sessionCards, setSessionCards] = useState([]);
    const [isFlipped, setIsFlipped] = useState(false);
    

    useEffect(() => {
        if (deck && deck.cards) {
            setSessionCards(shuffleArray(deck.cards));
        }
    }, [deck]);

    if (!deck || !deck.cards) {
        return <div className="text-center">Loading deck...</div>;
    }

    const currentCard = sessionCards[0];

    const handleAnswer = (knewIt) => {
        if (!currentCard || !currentCard.id) return;
        
        const originalDeckId = isReviewSession ? currentCard.deckId : deckId;
        updateCardProgress(originalDeckId, currentCard.id, knewIt);

        setIsFlipped(false);
        setTimeout(() => {
            setSessionCards(prevCards => prevCards.slice(1));
        }, 200);
    };

        if (sessionCards.length === 0 && deck.cards.length > 0) {
        return (
            <div className="text-center animate-fade-in">
                <h2 className="text-4xl font-bold text-teal-800 mb-4">🏆 Session Complete!</h2>
                <p className="text-lg text-gray-600 mb-8">You've finished this session. Great job!</p>
                <div className="flex justify-center">
                    <button onClick={() => navigate('/')} className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-colors">Back to All Decks</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="w-full animate-fade-in">
            <h1 className="text-xl font-bold text-teal-800 mb-6 text-center">{deck.title}</h1>
            <Flashcard cardData={currentCard} isFlipped={isFlipped} onFlip={() => setIsFlipped(!isFlipped)} />
            <div className="mt-8 flex justify-around items-center">
                 <button onClick={() => handleAnswer(false)} className="px-6 py-3 bg-yellow-500 text-gray-800 font-bold rounded-lg shadow-md hover:bg-yellow-600 transition-colors">Review Again</button>
                 <button onClick={() => handleAnswer(true)} className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 transition-colors">I Knew This</button>
            </div>
            <button onClick={() => navigate('/')} className="mt-6 text-gray-500 hover:text-gray-700 transition-colors w-full text-center">← Back to Decks</button>
        </div>
    );
};

export default FlashcardView;
