import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDecksStore } from '../store';
import FlashCard from './FlashCard';
import { RiDoubleQuotesL } from 'react-icons/ri';
import { BsFillVolumeUpFill } from 'react-icons/bs';

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
    const { deckId } = useParams();
    
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    const trainingDeck = useDecksStore((state) => state.trainingDeck);
    const updateSavedWordProgress = useDecksStore((state) => state.updateSavedWordProgress);
    const resetSavedWordProgress = useDecksStore((state) => state.resetSavedWordProgress);
    const flushStandaloneSrsProgress = useDecksStore((state) => state.flushStandaloneSrsProgress);

    const [sessionCards, setSessionCards] = useState([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Guarantee progress is flushed if the user navigates away mid-review
    useEffect(() => {
        return () => {
            flushStandaloneSrsProgress();
        };
    }, [flushStandaloneSrsProgress]);

    const speakText = (e, text) => {
        e.stopPropagation();
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = listeningPreference;
        window.speechSynthesis.speak(utterance);
    };

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
                setSessionCards(prevCards => {
                    const nextCards = prevCards.slice(1);
                    // Flush the queue when reaching the end of the deck
                    if (nextCards.length === 0) flushStandaloneSrsProgress();
                    return nextCards;
                });
                setIsProcessing(false); // Unlock the buttons for the next card
            }, 50);

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
            {/* Focused session exit button for Training mode */}
            {deckId === 'training' && (
                <div className="flex justify-start mb-2">
                    <button 
                        onClick={() => {
                            if (window.confirm("Are you sure you want to quit this training session?")) {
                                navigate('/spaced-repetition');
                            }
                        }}
                        className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        aria-label="Quit training"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
            <h1 className="text-2xl font-bold text-teal-500 mb-6 text-center">{trainingDeck?.title || 'Loading...'}</h1>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">{sessionCards.length} cards left</h2>
            <div className="relative">
                <FlashCard cardData={currentCard} isFlipped={isFlipped} onFlip={() => setIsFlipped(!isFlipped)} />
            </div>

            {/* --- NEW: Separate Examples Context Section --- */}
            {currentCard?.examples && currentCard.examples.length > 0 && (
                <div className="mt-8 max-w-md mx-auto w-full animate-slide-up">
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <RiDoubleQuotesL className="text-teal-500 text-xl" />
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Usage Context</span>
                    </div>
                    
                    <div className="space-y-3">
                        {currentCard.examples.map((ex, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start gap-4">
                                    <p className="text-lg font-medium text-gray-800 dark:text-gray-200 leading-snug">
                                        {ex.spanish}
                                    </p>
                                    <button 
                                        onClick={(e) => speakText(e, ex.spanish)}
                                        className="p-2 text-gray-400 hover:text-teal-500 transition-colors"
                                    >
                                        <BsFillVolumeUpFill size={18} />
                                    </button>
                                </div>
                                <p className={`mt-2 text-sm text-teal-600 dark:text-teal-400 italic transition-all duration-500 ${isFlipped ? 'opacity-100' : 'opacity-0 blur-sm select-none'}`}>
                                    {ex.english}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
