import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store.js';
import Flashcard from './FlashCard.jsx';
import ListeningView from './ListeningView.jsx';
import MultipleChoiceQuiz from './MultipleChoiceQuiz.jsx';
import FillInTheBlankQuiz from './FillInTheBlankQuiz.jsx';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';

const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const SessionManager = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Default to 'flashcards' mode if not specified
    const { lessonCards, deckId, mode = 'flashcards' } = location.state || { lessonCards: [], deckId: null };
    const updateCardProgress = useDecksStore((state) => state.updateCardProgress);
    const decks = useDecksStore((state) => state.decks);
    const savedWordsSet = useDecksStore((state) => state.savedWordsSet);
    const toggleSavedWord = useDecksStore((state) => state.toggleSavedWord);

    const [phase, setPhase] = useState('loading'); // loading, learn, practice, complete
    const [practiceQueue, setPracticeQueue] = useState([]);
    const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
    const [currentLearnIndex, setCurrentLearnIndex] = useState(0);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    
    // --- Score State for Practice/Test modes ---
    const [sessionScore, setSessionScore] = useState(0);

    const createPracticeQueue = (cards) => {
        // Shuffle the cards for the practice session
        const shuffled = shuffleArray(cards);
        const queue = [];
        const types = ['listen', 'mcq', 'fill'];
        let lastType = null;
        
        shuffled.forEach(card => {
            // Filter quiz types based on card data (e.g., need vocab for fill-in-blank)
            let possible = types.filter(t => t !== lastType && (card.vocab || t !== 'fill'));
            if (possible.length === 0) possible = types.filter(t => card.vocab || t !== 'fill');
            
            // Fallback if no types match
            if (possible.length === 0) possible = ['listen', 'mcq'];

            const type = possible[Math.floor(Math.random() * possible.length)];
            queue.push({ card, type });
            lastType = type;
        });
        return queue;
    };
    
    useEffect(() => {
        if (lessonCards.length > 0) {
            // Reset state
            setCurrentLearnIndex(0);
            setCurrentPracticeIndex(0);
            setPracticeQueue([]);
            setIsCardFlipped(false);
            setSessionScore(0);

            // --- Mode Initialization ---
            if (mode === 'practice' || mode === 'test') {
                // In Practice/Test mode, skip 'learn' and go straight to quizzes
                setPracticeQueue(createPracticeQueue(lessonCards));
                setPhase('practice'); 
            } else {
                // In Flashcards (Learn) mode, start with the learn phase
                setPhase('learn');
            }
        }
    }, [lessonCards, mode]);

    const handleNextLearnCard = () => {
        if (currentLearnIndex < lessonCards.length - 1) {
            setCurrentLearnIndex(prev => prev + 1);
            setIsCardFlipped(false);
        } else {
            // Finished all flashcards
            setPhase('complete');
        }
    };

    const handleAnswer = (wasCorrect) => {
        const currentPracticeItem = practiceQueue[currentPracticeIndex];
        
        if (wasCorrect) {
            setSessionScore(prev => prev + 1);
        }

        // --- DB Update Logic ---
        // Only save progress if we are in 'test' mode.
        // 'practice' mode is just for practice, no permanent record.
        if (mode === 'test') {
            updateCardProgress(deckId, currentPracticeItem.card.id, wasCorrect);
        }

        // Move to next card or finish (Linear flow, no review loop)
        if (currentPracticeIndex < practiceQueue.length - 1) {
            setCurrentPracticeIndex(prev => prev + 1);
        } else {
            setPhase('complete');
        }
    };
    
    if (phase === 'loading' || lessonCards.length === 0) {
        return <div className="text-center dark:text-gray-300">Loading...</div>;
    }

    // --- Learn Phase (Flashcards Mode) ---
    if (phase === 'learn') {
        const currentCard = lessonCards[currentLearnIndex];
        const deck = decks[deckId];
        const isSaved = currentCard ? savedWordsSet.has(currentCard.spanish) : false;

        return (
            <div className="w-full animate-fade-in">
                <h1 className="text-2xl font-bold text-center text-teal-800 dark:text-teal-300 mb-4">
                    Learn
                </h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-2">
                    Card {currentLearnIndex + 1} of {lessonCards.length}
                </p>
                
                <div className="relative">
                    <Flashcard cardData={currentCard} isFlipped={isCardFlipped} onFlip={() => setIsCardFlipped(!isCardFlipped)} />
                    <div className="absolute top-4 right-4 z-10">
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                toggleSavedWord(currentCard.spanish, {
                                    translation: currentCard.english,
                                    vocab: currentCard.vocab,
                                    source: deck?.title
                                }); 
                            }}
                            className={`p-2 rounded-full shadow-md transition-colors ${isSaved ? 'bg-yellow-100 text-yellow-600' : 'bg-white text-gray-400 hover:text-teal-500'}`}
                            title={isSaved ? "Remove from Spaced Repetition" : "Add to Spaced Repetition"}
                        >
                            <span className="text-xl">{isSaved ? <BsBookmarkFill/> : <BsBookmark/>}</span>
                        </button>
                    </div>
                </div>

                <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-2">(Tap card to flip)</p>
                <div className="mt-6 text-center">
                    <button onClick={handleNextLearnCard} className="w-full px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                        {(currentLearnIndex === lessonCards.length - 1) ? 'Finish' : 'Next'}
                    </button>
                </div>
                <div className="mt-4 text-center">
                    <button onClick={() => navigate('/flashcards')} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                        Back to Flashcards Decks
                    </button>
                </div>
            </div>
        );
    }

    // --- Practice/Test Phase (Quizzes) ---
    if (phase === 'practice') {
        const currentPracticeItem = practiceQueue[currentPracticeIndex];
        if (!currentPracticeItem) {
             return <div>Loading next question...</div>;
        }
        const { card, type } = currentPracticeItem;
        
        let headerText = mode === 'test' ? 'Test Mode' : 'Practice Mode';

        return (
             <div className="w-full animate-fade-in">
                <h1 className="text-2xl font-bold text-center text-teal-800 dark:text-teal-300 mb-4">
                    {headerText}
                </h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
                    Question {currentPracticeIndex + 1} of {practiceQueue.length}
                </p>
                
                {/* We pass handleAnswer to both onCorrect and onIncorrect to ensure linear progression */}
                {type === 'listen' && <ListeningView currentCard={card} onCorrect={() => handleAnswer(true)} onIncorrect={() => handleAnswer(false)} />}
                {type === 'mcq' && <MultipleChoiceQuiz lessonCards={lessonCards} currentCard={card} onCorrect={() => handleAnswer(true)} onIncorrect={() => handleAnswer(false)} />}
                {type === 'fill' && <FillInTheBlankQuiz lessonCards={lessonCards} currentCard={card} onCorrect={() => handleAnswer(true)} onIncorrect={() => handleAnswer(false)} />}
                
                <div className="mt-8 text-center">
                    <button onClick={() => navigate('/flashcards')} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                        Back to Flashcards Decks
                    </button>
                </div>
            </div>
        );
    }

    // --- Completion Screen ---
    const scorePercentage = Math.round((sessionScore / practiceQueue.length) * 100) || 0;
    
    return (
        <div className="text-center animate-fade-in">
            <h2 className="text-4xl font-bold text-teal-800 dark:text-teal-300 mb-4">
                {mode === 'test' ? 'Test Complete!' : 'Session Complete!'}
            </h2>
            
            {(mode === 'practice' || mode === 'test') && (
                <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md inline-block">
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">You got</p>
                    <p className="text-5xl font-extrabold text-blue-600 dark:text-blue-400 mb-2">
                        {sessionScore} / {practiceQueue.length}
                    </p>
                    <p className="text-lg text-gray-600 dark:text-gray-300">correct!</p>
                    {mode === 'test' && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                             <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Final Score: {scorePercentage}%</p>
                        </div>
                    )}
                </div>
            )}

            {mode === 'flashcards' && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">You've finished reviewing these cards.</p>
            )}

            <div className="flex justify-center">
                <button onClick={() => navigate('/flashcards')} className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-colors">Back to Flashcards decks</button>
            </div>
        </div>
    );
};

export default SessionManager;