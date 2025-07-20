import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDecksStore } from '../store';
import Flashcard from './Flashcard';

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
    const location = useLocation();
    
    const updateCardProgress = useDecksStore((state) => state.updateCardProgress);
    const addXp = useDecksStore((state) => state.addXp);

    const isReviewSession = location.pathname === '/review';
    const deck = useMemo(() => {
        if (isReviewSession) {
            return {
                title: "Review Session",
                cards: location.state?.reviewCards || []
            };
        }
        return decks[deckId];
    }, [isReviewSession, decks, deckId, location.state]);

    const [sessionCards, setSessionCards] = useState([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const [wasIncorrect, setWasIncorrect] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (deck && deck.cards) {
            setSessionCards(shuffleArray(deck.cards));
            setWasIncorrect(false);
        }   
    }, [deck]);

    const currentCard = sessionCards[0];

    const handleAnswer = async (knewIt) => {
        if (isProcessing || !currentCard || !currentCard.id) return;
        
        setIsProcessing(true); // Lock the buttons
        
        try {
            if (!knewIt) {
                setWasIncorrect(true);
            }

            const originalDeckId = isReviewSession ? currentCard.deckId : deckId;
            
            // Wait for the progress update to complete.
            await updateCardProgress(originalDeckId, currentCard.id, knewIt);

            setIsFlipped(false);
            
            // Move to the next card and then unlock the buttons.
            setTimeout(() => {
                setSessionCards(prevCards => prevCards.slice(1));
                setIsProcessing(false); // Unlock the buttons for the next card
            }, 200);
        } catch (error) {
            console.error("An error occurred while saving progress:", error);
            // --- FIX: Ensure buttons are unlocked even if an error occurs ---
            setIsProcessing(false);
        }
    };

    const isSessionComplete = sessionCards.length === 0 && deck && deck.cards && deck.cards.length > 0;
    
    useEffect(() => {
        if (isSessionComplete && !wasIncorrect) {
            addXp(100, "Perfect Session!");
        }
    }, [isSessionComplete, wasIncorrect, addXp]);


    if (isSessionComplete) {
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
                 <button 
                    onClick={() => handleAnswer(false)} 
                    disabled={isProcessing}
                    className="px-6 py-3 bg-yellow-500 text-gray-800 font-bold rounded-lg shadow-md hover:bg-yellow-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                 >
                    Review Again
                 </button>
                 <button 
                    onClick={() => handleAnswer(true)} 
                    disabled={isProcessing}
                    className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                 >
                    I Knew This
                 </button>
            </div>
            <button onClick={() => navigate('/')} className="mt-6 text-gray-500 hover:text-gray-700 transition-colors w-full text-center">← Back to Decks</button>
        </div>
    );
};

export default FlashcardView;
