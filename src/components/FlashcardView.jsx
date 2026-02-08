import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

// MODIFIED: Removed `decks` from props, as we get it from the store
const FlashcardView = () => {
    const { deckId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- Get all necessary data and actions from the store ---
    const updateCardProgress = useDecksStore((state) => state.updateCardProgress);
    const addXp = useDecksStore((state) => state.addXp);
    // NEW: Get decks, trainingDeck, and save-word functions
    const decks = useDecksStore((state) => state.decks);
    const trainingDeck = useDecksStore((state) => state.trainingDeck);
    const savedWordsSet = useDecksStore((state) => state.savedWordsSet);
    const updateSavedWordProgress = useDecksStore((state) => state.updateSavedWordProgress);
    const resetSavedWordProgress = useDecksStore((state) => state.resetSavedWordProgress);

    // --- MODIFIED: Check for training session ---
    const isReviewSession = location.pathname === '/review';
    const isTrainingSession = deckId === 'training';

    // MODIFIED: useMemo now checks for trainingDeck first
    const deck = useMemo(() => {
        if (isTrainingSession) {
            return trainingDeck; // Use the virtual training deck
        }
        if (isReviewSession) {
            return {
                title: "Review Session",
                cards: location.state?.reviewCards || []
            };
        }
        return decks[deckId]; // Use a regular deck
    }, [isTrainingSession, isReviewSession, decks, trainingDeck, deckId, location.state]);

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
    // NEW: Check if the current card is saved
    const isSaved = currentCard ? savedWordsSet.has(currentCard.spanish) : false;

    // --- MODIFIED: handleAnswer now has special logic for training sessions ---
    const handleAnswer = async (knewIt) => {
        if (isProcessing || !currentCard) return;
        
        setIsProcessing(true); // Lock the buttons
        
        try {
            if (isTrainingSession) {
                // --- TRAINING SESSION LOGIC ---
                if (knewIt) {
                    // User pressed "Next" - advance the SRS stage
                    await updateSavedWordProgress(currentCard.spanish);
                } else {
                    // User pressed "Forgot" - reset SRS stage
                    await resetSavedWordProgress(currentCard.spanish);
                }
                
            } else {
                // --- REGULAR DECK / REVIEW SESSION LOGIC ---
                // We need a card ID to update progress, which training cards don't have
                if (!currentCard.id) {
                     console.error("Card is missing an ID, cannot update progress.");
                } else {
                    if (!knewIt) {
                        setWasIncorrect(true);
                    }
                    const originalDeckId = isReviewSession ? currentCard.deckId : deckId;
                    await updateCardProgress(originalDeckId, currentCard.id, knewIt);
                }
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
                    <button onClick={() => navigate(`${isTrainingSession ? '/spaced-repetition' : '/flashcards'}`)} className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-colors">
                        {isTrainingSession ? 'Back to Spaced Repetition' : 'Back to Flashcards'}
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="w-full animate-fade-in">
            <h1 className="text-2xl font-bold text-teal-500 mb-6 text-center">{deck?.title || 'Loading...'}</h1>
            
            {/* --- MODIFIED: Wrapped card in a div to add the save button --- */}
            <div className="relative">
                <FlashCard cardData={currentCard} isFlipped={isFlipped} onFlip={() => setIsFlipped(!isFlipped)} />
            </div>

            <div className="mt-8 flex justify-around items-center">
                {isTrainingSession ? (
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
                ) : (
                 <>
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
                 </>
                )}
            </div>
            <button onClick={() => navigate('/spaced-repetition')} className="mt-6 text-gray-500 hover:text-gray-700 transition-colors w-full text-center">← Back to review</button>
        </div>
    );
};

export default FlashcardView;
