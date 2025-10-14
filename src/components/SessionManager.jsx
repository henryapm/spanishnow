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
    
    const { lessonCards, deckId } = location.state || { lessonCards: [], deckId: null };
    const updateCardProgress = useDecksStore((state) => state.updateCardProgress);

    const [phase, setPhase] = useState('loading'); // loading, learn, practice, review_prompt, consolidate, complete
    const [lessonChunks, setLessonChunks] = useState([]);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [practiceQueue, setPracticeQueue] = useState([]);
    const [currentLearnIndex, setCurrentLearnIndex] = useState(0);
    const [reviewPile, setReviewPile] = useState([]);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    
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
            setIsCardFlipped(false);
            setPhase('learn');
        }
    }, [lessonCards]);

    const createPracticeQueue = (cards) => {
        const queue = [];
        const shuffled = shuffleArray(cards);
        const types = ['mcq', 'listen', 'fill'];
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

    const handleNextLearnCard = () => {
        const currentChunk = lessonChunks[currentChunkIndex];
        if (currentLearnIndex < currentChunk.length - 1) {
            setCurrentLearnIndex(prev => prev + 1);
            setIsCardFlipped(false);
        } else {
            setPracticeQueue(createPracticeQueue(currentChunk));
            setPhase('practice');
        }
    };

    const handleAnswer = (wasCorrect) => {
        const currentPracticeItem = practiceQueue[0];
        updateCardProgress(deckId, currentPracticeItem.card.id, wasCorrect);

        const newQueue = practiceQueue.slice(1);
        let updatedReviewPile = [...reviewPile];

        if (!wasCorrect) {
            if (phase === 'practice') {
                updatedReviewPile.push(currentPracticeItem);
            } else if (phase === 'consolidate') {
                console.log('consolidate phase and Card will be re-added to practice queue:', currentPracticeItem.card);
                
                newQueue.push(currentPracticeItem);
            }
        }
        
        if (newQueue.length === 0) { // End of a round
            if (phase === 'practice') {
                if (currentChunkIndex < lessonChunks.length - 1) {
                    setCurrentChunkIndex(prev => prev + 1);
                    setCurrentLearnIndex(0);
                    setPhase('learn');
                    setReviewPile(updatedReviewPile); 
                } else {
                    setReviewPile(updatedReviewPile);
                    if (updatedReviewPile.length > 0) {
                        setPhase('review_prompt');
                    } else {
                        setPhase('complete');
                    }
                }
            } else if (phase === 'consolidate') {
                setPhase('complete');
            }
        } else {
            setPracticeQueue(newQueue);
            setReviewPile(updatedReviewPile);
            if (phase === 'consolidate' && !wasCorrect) {
                setPhase('review_prompt');
            }
        }
    };
    
    const startReviewRound = () => {
        setPracticeQueue(shuffleArray(reviewPile));
        setPhase('consolidate');
    };

    const BackButton = () => (
        <button onClick={() => navigate('/')} className="absolute top-4 left-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            &larr; Back to Topics
        </button>
    );

    if (phase === 'loading' || lessonCards.length === 0) {
        return <div className="text-center dark:text-gray-300">Loading lesson...</div>;
    }

    if (phase === 'learn') {
        const currentCard = lessonChunks[currentChunkIndex][currentLearnIndex];
        return (
            <div className="w-full animate-fade-in">
                <h1 className="text-2xl font-bold text-center text-teal-800 dark:text-teal-300 mb-4">Learn: Part {currentChunkIndex + 1}</h1>
                <p className="text-center text-gray-500 mb-2">Card {currentLearnIndex + 1} of {lessonChunks[currentChunkIndex].length}</p>
                <Flashcard cardData={currentCard} isFlipped={isCardFlipped} onFlip={() => setIsCardFlipped(!isCardFlipped)} />
                <p className="text-center text-gray-400 text-sm mt-2">(Tap card to flip)</p>
                <div className="mt-6 text-center">
                    <button onClick={handleNextLearnCard} className="w-full px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700">
                        {currentLearnIndex < lessonChunks[currentChunkIndex].length - 1 ? 'Next' : 'Start Practice'}
                    </button>
                </div>
                <BackButton />
            </div>
        );
    }
    
    if (phase === 'review_prompt') {
        return (
            <div className="text-center animate-fade-in">
                <h2 className="text-3xl font-bold text-teal-800 mb-4">Ready for a quick review?</h2>
                <p className="text-lg text-gray-600 mb-8">You missed {reviewPile.length} card(s). Let's review them until you get them right.</p>
                <div className="flex justify-center">
                    <button onClick={startReviewRound} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                        Start Review
                    </button>
                </div>
                <BackButton />
            </div>
        );
    }

    if (phase === 'practice' || phase === 'consolidate') {
        const currentPracticeItem = practiceQueue[0];
        if (!currentPracticeItem) {
             return <div>Loading next question...</div>;
        }
        const { card, type } = currentPracticeItem;
        
        return (
             <div className="w-full animate-fade-in">
                <h1 className="text-2xl font-bold text-center text-teal-800 dark:text-teal-300 mb-4">
                    {phase === 'consolidate' ? 'Final Review' : `Practice: Part ${currentChunkIndex + 1}`}
                </h1>
                <p className="text-center text-gray-500 mb-4">{practiceQueue.length} card(s) remaining in this round.</p>
                {type === 'listen' && <ListeningView currentCard={card} onCorrect={() => handleAnswer(true)} onIncorrect={() => handleAnswer(false)} />}
                {type === 'mcq' && <MultipleChoiceQuiz lessonCards={lessonCards} currentCard={card} onCorrect={() => handleAnswer(true)} onIncorrect={() => handleAnswer(false)} />}
                {type === 'fill' && <FillInTheBlankQuiz lessonCards={lessonCards} currentCard={card} onCorrect={() => handleAnswer(true)} onIncorrect={() => handleAnswer(false)} />}
                <BackButton />
            </div>
        );
    }

    return (
        <div className="text-center animate-fade-in">
            <h2 className="text-4xl font-bold text-teal-800 mb-4">🎉 Lesson Complete!</h2>
            <p className="text-lg text-gray-600 mb-8">You've finished this lesson. Keep up the great work!</p>
            <div className="flex justify-center">
                <button onClick={() => navigate('/')} className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-colors">Back to Topics</button>
            </div>
        </div>
    );
};

export default SessionManager;

