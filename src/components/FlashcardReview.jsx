import React, { useState, useEffect } from 'react';
import { useDecksStore } from '../store';
import Flashcard from './FlashCard';

// Helper function to shuffle the array of cards
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export default function FlashcardReview({ wordsToReview, onComplete }) {
    const prepareTrainingDeck = useDecksStore((state) => state.prepareTrainingDeck);
    const trainingDeck = useDecksStore((state) => state.trainingDeck);
    const isLoading = useDecksStore((state) => state.isLoading);
    const updateSavedWordProgress = useDecksStore((state) => state.updateSavedWordProgress);
    const resetSavedWordProgress = useDecksStore((state) => state.resetSavedWordProgress);

    const [sessionCards, setSessionCards] = useState([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [deckPrepared, setDeckPrepared] = useState(false);

    // On mount, generate the deck of the words the user just saved
    useEffect(() => {
        if (wordsToReview && wordsToReview.length > 0) {
            prepareTrainingDeck(wordsToReview).then(() => setDeckPrepared(true));
        }
    }, [wordsToReview, prepareTrainingDeck]);

    // Once the deck is ready in the store, load it into our local state
    useEffect(() => {
        if (deckPrepared && trainingDeck && trainingDeck.cards) {
            setSessionCards(shuffleArray(trainingDeck.cards));
        }
    }, [deckPrepared, trainingDeck]);

    // Handle the case where no words were saved
    if (!wordsToReview || wordsToReview.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">No words saved</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md">
                    You didn't save any words during the reading phase. Let's move straight to putting the story into practice!
                </p>
                <button onClick={onComplete} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                    Continue to Practice ➔
                </button>
            </div>
        );
    }

    // Handle loading state
    if (isLoading || !deckPrepared || !trainingDeck) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Preparing your review...</p>
            </div>
        );
    }

    const isSessionComplete = sessionCards.length === 0;

    // Handle completion state
    if (isSessionComplete) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
                <h2 className="text-4xl font-bold text-teal-600 mb-4">🎉 Review Complete!</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">You've successfully reviewed your new vocabulary.</p>
                <button onClick={onComplete} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                    Continue to Practice ➔
                </button>
            </div>
        );
    }

    const currentCard = sessionCards[0];

    // Record the SRS response and move to the next card
    const handleAnswer = async (knewIt) => {
        if (isProcessing || !currentCard) return;
        setIsProcessing(true);
        
        try {
            if (knewIt) {
                await updateSavedWordProgress(currentCard.id);
            } else {
                await resetSavedWordProgress(currentCard.id);
            }
        } catch (error) {
            console.error("Error saving SRS progress:", error);
        }

        setIsFlipped(false);
        setTimeout(() => {
            setSessionCards(prev => prev.slice(1));
            setIsProcessing(false);
        }, 200); // Wait for the flip animation to start before swapping text
    };

    return (
        <div className="flex flex-col items-center h-full overflow-y-auto pb-24 p-6 max-w-2xl mx-auto w-full animate-fade-in">
            <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400 mb-2">Review Saved Words</h2>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-8 uppercase tracking-wide">{sessionCards.length} {sessionCards.length === 1 ? 'card' : 'cards'} remaining</p>
            
            <div className="w-full relative mb-8">
                <Flashcard 
                    cardData={currentCard} 
                    isFlipped={isFlipped} 
                    onFlip={() => setIsFlipped(!isFlipped)} 
                />
            </div>

            <div className="flex justify-around w-full max-w-sm mt-4">
                <button 
                    onClick={() => handleAnswer(false)}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-yellow-500 text-gray-900 font-bold rounded-lg shadow-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Forgot
                </button>
                <button 
                    onClick={() => handleAnswer(true)}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Got it
                </button>
            </div>
        </div>
    );
}
