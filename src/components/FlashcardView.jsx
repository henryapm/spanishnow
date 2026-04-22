import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';
import FlashCard from './FlashCard';

// Helper function to shuffle an array
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const FlashcardView = () => {
    const navigate = useNavigate();
    
    const trainingDeck = useDecksStore((state) => state.trainingDeck);
    const updateSavedWordProgress = useDecksStore((state) => state.updateSavedWordProgress);
    const resetSavedWordProgress = useDecksStore((state) => state.resetSavedWordProgress);

    const [sessionCards, setSessionCards] = useState([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (trainingDeck && trainingDeck.cards) {
            setSessionCards(shuffleArray(trainingDeck.cards));
        }   
    }, [trainingDeck]);
    
    const currentCard = sessionCards[0];
    
    const handleAnswer = async (knewIt) => {
        if (isProcessing || !currentCard) return;
        
        setIsProcessing(true); // Lock the buttons
        
        try {
            // --- TRAINING SESSION LOGIC ---
            if (knewIt) {
                // User pressed "Next" - advance the SRS stage
                await updateSavedWordProgress(currentCard.spanish);
            } else {
                // User pressed "Forgot" - reset SRS stage
                await resetSavedWordProgress(currentCard.spanish);
            }

            // Common logic: move to the next card
            setIsFlipped(false);
            setTimeout(() => {
                setSessionCards(prevCards => prevCards.slice(1));
                setIsProcessing(false); // Unlock the buttons for the next card
            }, 200);

        } catch (error) {
            console.error("An error occurred while saving progress:", error);
            setIsProcessing(false);
        }
    };

    const isSessionComplete = sessionCards.length === 0;

    if (isSessionComplete) {
        return (
            <div className="text-center animate-fade-in">
                <h2 className="text-4xl font-bold text-teal-800 mb-4">🏆 Session Complete!</h2>
                <p className="text-lg text-gray-600 mb-8">You've finished this session. Great job!</p>
                <div className="flex justify-center">
                    <button onClick={() => navigate('/spaced-repetition')} className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-colors">
                        Back to Spaced Repetition
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="w-full animate-fade-in">
            <h1 className="text-2xl font-bold text-teal-500 mb-6 text-center">{trainingDeck?.title || 'Loading...'}</h1>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">{sessionCards.length} cards left</h2>
            <div className="relative">
                <FlashCard cardData={currentCard} isFlipped={isFlipped} onFlip={() => setIsFlipped(!isFlipped)} />
            </div>

            <div className="mt-8 flex justify-around items-center">
                <div className="flex flex-col items-center gap-4">
                        <button 
                        onClick={() => handleAnswer(true)} 
                        disabled={isProcessing}
                        className="px-12 py-4 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                        >
                        Next
                        </button>
                        <button 
                        onClick={() => handleAnswer(false)} 
                        disabled={isProcessing}
                        className="text-sm text-gray-500 hover:text-red-500 underline transition-colors disabled:text-gray-300 disabled:cursor-not-allowed"
                        >
                        Forgot / Reset Progress
                        </button>
                </div>
            </div>
            <button onClick={() => navigate('/spaced-repetition')} className="mt-6 text-gray-500 hover:text-gray-700 transition-colors w-full text-center">← Back to review</button>
        </div>
    );
};

export default FlashcardView;
