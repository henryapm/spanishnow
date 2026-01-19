import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store.js';
import Flashcard from './FlashCard.jsx';
import ListeningView from './ListeningView.jsx';
import MultipleChoiceQuiz from './MultipleChoiceQuiz.jsx';
import FillInTheBlankQuiz from './FillInTheBlankQuiz.jsx';

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

    const [phase, setPhase] = useState('loading'); // loading, learn, practice, consolidate, complete
    const [lessonChunks, setLessonChunks] = useState([]);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [practiceQueue, setPracticeQueue] = useState([]);
    const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
    const [currentLearnIndex, setCurrentLearnIndex] = useState(0);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    
    // --- NEW: Score State for Practice/Test modes ---
    const [sessionScore, setSessionScore] = useState(0);

    // State for Learn Mode's review logic
    const [reviewPile, setReviewPile] = useState([]);
    const [nextReviewPile, setNextReviewPile] = useState([]);

    const createPracticeQueue = (cards) => {
        const queue = [];
        const shuffled = shuffleArray(cards);
        const types = ['listen', 'mcq', 'fill'];
        let lastType = null;
        shuffled.forEach(card => {
            let possible = types.filter(t => t !== lastType && (card.vocab || t !== 'fill'));
            if (possible.length === 0) possible = types.filter(t => card.vocab || t !== 'fill');
            const type = possible[Math.floor(Math.random() * possible.length)];
            queue.push({ card, type });
            lastType = type;
        });
        return queue;
    };
    
    useEffect(() => {
        if (lessonCards.length > 0) {
            const chunks = [];
            for (let i = 0; i < lessonCards.length; i += 2) {
                chunks.push(lessonCards.slice(i, i + 2));
            }
            setLessonChunks(chunks);
            setCurrentChunkIndex(0);
            setCurrentLearnIndex(0);
            setPracticeQueue([]);
            setReviewPile([]);
            setNextReviewPile([]);
            setIsCardFlipped(false);
            setSessionScore(0);

            // --- Mode Initialization ---
            if (mode === 'practice' || mode === 'test') {
                // Skip 'learn' phase, go straight to linear practice of all cards
                setPracticeQueue(createPracticeQueue(lessonCards));
                setPhase('consolidate'); // Using 'consolidate' as the main quiz phase
            } else {
                // 'flashcards' mode: Start with the learn phase
                setPhase('learn');
            }
        }
    }, [lessonCards, mode]);

    const handleNextLearnCard = () => {
        const currentChunk = lessonChunks[currentChunkIndex];
        if (currentLearnIndex < currentChunk.length - 1) {
            setCurrentLearnIndex(prev => prev + 1);
            setIsCardFlipped(false);
        } else {
            // Generate practice for this chunk
            setPracticeQueue(createPracticeQueue(currentChunk));
            setPhase('practice');
        }
    };

    const handleAnswer = (wasCorrect) => {
        const currentPracticeItem = practiceQueue[currentPracticeIndex];
        
        // --- 1. PRACTICE & TEST MODE LOGIC (Linear, No Review Loop) ---
        if (mode === 'practice' || mode === 'test') {
            if (wasCorrect) {
                setSessionScore(prev => prev + 1);
            }
            
            // Only update DB in 'test' mode
            if (mode === 'test') {
                updateCardProgress(deckId, currentPracticeItem.card.id, wasCorrect);
            }

            // Move to next card or finish
            if (currentPracticeIndex < practiceQueue.length - 1) {
                setCurrentPracticeIndex(prev => prev + 1);
            } else {
                setPhase('complete');
            }
            return;
        }

        // --- 2. LEARN MODE LOGIC (Chunks + Review Loop) ---
        // Always save progress in Learn mode
        updateCardProgress(deckId, currentPracticeItem.card.id, wasCorrect);

        let updatedReviewPile = [...reviewPile];
        let updatedNextReviewPile = [...nextReviewPile];

        if (!wasCorrect) {
            if (phase === 'practice') {
                updatedReviewPile.push(currentPracticeItem);
            } else if (phase === 'consolidate') {
                updatedNextReviewPile.push(currentPracticeItem);
            }
        }

        setReviewPile(updatedReviewPile);
        setNextReviewPile(updatedNextReviewPile);
        
        if (currentPracticeIndex < practiceQueue.length - 1) {
            setCurrentPracticeIndex(prev => prev + 1);
        } else {
            // End of a queue
            if (phase === 'practice') {
                if (currentChunkIndex < lessonChunks.length - 1) {
                    // Move to next chunk
                    setCurrentChunkIndex(prev => prev + 1);
                    setCurrentLearnIndex(0);
                    setPhase('learn');
                    setReviewPile(updatedReviewPile); 
                } else {
                    // All chunks done
                    if (updatedReviewPile.length > 0) {
                        setPhase('review_prompt');
                    } else {
                        // Consolidate (Review all)
                        setPracticeQueue(createPracticeQueue(lessonCards));
                        setCurrentPracticeIndex(0);
                        setPhase('consolidate');
                    }
                }
            } else if (phase === 'consolidate') {
                if (updatedNextReviewPile.length > 0) {
                    setPracticeQueue(shuffleArray(updatedNextReviewPile));
                    setNextReviewPile([]);
                    setCurrentPracticeIndex(0);
                } else {
                    setPhase('complete');
                }
            }
        }
    };
    
    const startReviewRound = () => {
        setPracticeQueue(shuffleArray(reviewPile));
        setReviewPile([]); 
        setNextReviewPile([]);
        setCurrentPracticeIndex(0);
        setPhase('consolidate');
    };

    if (phase === 'loading' || lessonCards.length === 0) {
        return <div className="text-center dark:text-gray-300">Loading lesson...</div>;
    }

    // --- Learn Phase ---
    if (phase === 'learn') {
        const currentCard = lessonChunks[currentChunkIndex][currentLearnIndex];
        return (
            <div className="w-full animate-fade-in">
                <h1 className="text-2xl font-bold text-center text-teal-800 dark:text-teal-300 mb-4">
                    Learn: Part {currentChunkIndex + 1}
                </h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-2">
                    Card {currentLearnIndex + 1} of {lessonChunks[currentChunkIndex].length}
                </p>
                <Flashcard cardData={currentCard} isFlipped={isCardFlipped} onFlip={() => setIsCardFlipped(!isCardFlipped)} />
                <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-2">(Tap card to flip)</p>
                <div className="mt-6 text-center">
                    <button onClick={handleNextLearnCard} className="w-full px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                        {(currentChunkIndex === lessonChunks.length - 1 && currentLearnIndex === lessonChunks[currentChunkIndex].length - 1) ? 'Finish Learning' : 'Next'}
                    </button>
                </div>
            </div>
        );
    }

    // --- Practice / Consolidate Phase (The Quizzes) ---
    if (phase === 'practice' || phase === 'consolidate') {
        const currentPracticeItem = practiceQueue[currentPracticeIndex];
        if (!currentPracticeItem) {
             return <div>Loading next question...</div>;
        }
        const { card, type } = currentPracticeItem;
        
        let headerText = '';
        if (mode === 'flashcards') {
            headerText = phase === 'consolidate' ? 'Final Review' : `Practice: Part ${currentChunkIndex + 1}`;
        } else {
            headerText = mode === 'test' ? 'Test Mode' : 'Practice Mode';
        }

        return (
             <div className="w-full animate-fade-in">
                <h1 className="text-2xl font-bold text-center text-teal-800 dark:text-teal-300 mb-4">
                    {headerText}
                </h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
                    Question {currentPracticeIndex + 1} of {practiceQueue.length}
                </p>
                
                {/* --- FIX: Added lessonCards prop to FillInTheBlankQuiz --- */}
                {type === 'listen' && <ListeningView currentCard={card} onCorrect={() => handleAnswer(true)} onIncorrect={() => handleAnswer(false)} />}
                {type === 'mcq' && <MultipleChoiceQuiz lessonCards={lessonCards} currentCard={card} onCorrect={() => handleAnswer(true)} onIncorrect={() => handleAnswer(false)} />}
                {type === 'fill' && <FillInTheBlankQuiz lessonCards={lessonCards} currentCard={card} onCorrect={() => handleAnswer(true)} onIncorrect={() => handleAnswer(false)} />}
            </div>
        );
    }

    // --- Review Prompt (Learn Mode Only) ---
    if (phase === 'review_prompt') {
        return (
            <div className="text-center animate-fade-in">
                <h2 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-4">Ready for a quick review?</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">You missed {reviewPile.length} card(s). Let's review them until you get them right.</p>
                <div className="flex justify-center">
                    <button onClick={startReviewRound} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                        Start Review
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
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">You've finished this lesson. Keep up the great work!</p>
            )}

            <div className="flex justify-center">
                <button onClick={() => navigate('/')} className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-colors">Back to Topics</button>
            </div>
        </div>
    );
};

export default SessionManager;