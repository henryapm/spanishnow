import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Flashcard from './FlashCard';
import ListeningView from './ListeningView';
import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import FillInTheBlankQuiz from './FillInTheBlankQuiz';

// Helper function to shuffle an array
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
    
    const lessonCards = location.state?.lessonCards || [];

    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [phase, setPhase] = useState('learn'); // 'learn', 'practice', 'review_prompt', 'complete'
    const [practiceQueue, setPracticeQueue] = useState([]);
    const [reviewPile, setReviewPile] = useState([]);

    useEffect(() => {
        if (lessonCards.length > 0) {
            const queue = [];
            const shuffledCards = shuffleArray(lessonCards);
            const availableQuizTypes = ['listen', 'mcq', 'fill'];
            let lastQuizType = null;

            shuffledCards.forEach(card => {
                let possibleTypes = availableQuizTypes.filter(t => t !== lastQuizType);
                if (!card.vocab) {
                    possibleTypes = possibleTypes.filter(t => t !== 'fill');
                }
                if (possibleTypes.length === 0) {
                    possibleTypes = availableQuizTypes.filter(t => !card.vocab ? t !== 'fill' : true);
                }
                const quizType = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
                queue.push({ card, type: quizType });
                lastQuizType = quizType;
            });
            
            setPracticeQueue(queue);
            setCurrentCardIndex(0);
            setPhase('learn');
            setReviewPile([]);
        }
    }, [lessonCards]);

    const handleNextLearnCard = () => {
        if (currentCardIndex < lessonCards.length - 1) {
            setCurrentCardIndex(prevIndex => prevIndex + 1);
        } else {
            setPhase('practice');
            setCurrentCardIndex(0);
        }
    };

    const handlePracticeAnswer = (wasCorrect) => {
        // Create a temporary, updated version of the review pile
        let updatedReviewPile = [...reviewPile];
        if (!wasCorrect) {
            // If the answer was wrong, add the card to our temporary pile
            updatedReviewPile.push(practiceQueue[currentCardIndex]);
        }
        // Update the actual state with the new pile
        setReviewPile(updatedReviewPile);

        // Check if we are at the end of the current practice round
        if (currentCardIndex < practiceQueue.length - 1) {
            setCurrentCardIndex(prevIndex => prevIndex + 1);
        } else {
            // If we are at the end, check the length of our temporary pile
            if (updatedReviewPile.length > 0) {
                // If there are cards to review, show the prompt
                setPhase('review_prompt');
            } else {
                // Otherwise, the lesson is complete
                setPhase('complete');
            }
        }
    };

    const startReviewRound = () => {
        setPracticeQueue(shuffleArray(reviewPile));
        setReviewPile([]);
        setCurrentCardIndex(0);
        setPhase('practice'); // Go back to the practice phase
    };

    if (lessonCards.length === 0) {
        return <div className="text-center">Loading lesson...</div>;
    }
    
    if (phase === 'learn') {
        const currentCard = lessonCards[currentCardIndex];
        return (
            <div className="w-full animate-fade-in">
                <h1 className="text-2xl font-bold text-center text-teal-800 mb-4">Learn This Card</h1>
                <p className="text-center text-gray-500 mb-4">Card {currentCardIndex + 1} of {lessonCards.length}</p>
                <Flashcard cardData={currentCard} />
                <div className="mt-8 text-center">
                    <button onClick={handleNextLearnCard} className="w-full px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700">
                        {currentCardIndex === lessonCards.length - 1 ? "Start Practice" : "Next"}
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'practice') {
        const currentPracticeItem = practiceQueue[currentCardIndex];
        const { card, type } = currentPracticeItem;

        if (type === 'listen') {
            return <ListeningView decks={{ temp: { cards: [card] } }} deckId="temp" onCorrect={() => handlePracticeAnswer(true)} onIncorrect={() => handlePracticeAnswer(false)} isPracticeSession={true} />;
        }
        if (type === 'mcq') {
            return <MultipleChoiceQuiz lessonCards={lessonCards} currentCard={card} onCorrect={() => handlePracticeAnswer(true)} onIncorrect={() => handlePracticeAnswer(false)} />;
        }
        if (type === 'fill') {
            return <FillInTheBlankQuiz currentCard={card} onCorrect={() => handlePracticeAnswer(true)} onIncorrect={() => handlePracticeAnswer(false)} />;
        }
    }

    if (phase === 'review_prompt') {
        return (
            <div className="text-center animate-fade-in">
                <h2 className="text-3xl font-bold text-teal-800 mb-4">Ready for a quick review?</h2>
                <p className="text-lg text-gray-600 mb-8">You missed {reviewPile.length} card(s). Let's go over them one more time to make sure you've got it.</p>
                <div className="flex justify-center">
                    <button onClick={startReviewRound} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                        Start Review
                    </button>
                </div>
            </div>
        );
    }

    // --- Complete Phase ---
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
