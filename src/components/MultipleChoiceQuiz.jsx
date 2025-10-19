import { React, useState, useEffect, useMemo } from 'react';
import { useDecksStore } from '../store';

// Helper function to shuffle an array
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const MultipleChoiceQuiz = ({ lessonCards, currentCard, onCorrect, onIncorrect }) => {
    const [options, setOptions] = useState([]);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [feedback, setFeedback] = useState(''); // '', 'correct', 'incorrect'

    // This effect generates the multiple-choice options whenever a new card is presented.
    useEffect(() => {
        if (currentCard && lessonCards.length > 0) {
            // Find three incorrect answers (distractors) from the other cards in the lesson.
            const distractors = lessonCards
                .filter(card => card.id !== currentCard.id) // Exclude the current card
                .map(card => card.english); // Get their English translations
            
            const shuffledDistractors = shuffleArray(distractors).slice(0, 3);
            
            // Create the final list of options and shuffle them.
            const answerOptions = shuffleArray([currentCard.english, ...shuffledDistractors]);
            setOptions(answerOptions);
            setSelectedAnswer(null);
            setFeedback('');
        }
    }, [currentCard, lessonCards]);

    const handleAnswerSelect = (answer) => {
        if (feedback) return; // Don't allow changing the answer after submission
        setSelectedAnswer(answer);
    };

    const checkAnswer = () => {
        if (!selectedAnswer) {
            alert("Please select an answer.");
            return;
        }

        if (selectedAnswer === currentCard.english) {
            setFeedback('correct');
        } else {
            setFeedback('incorrect');
        }
    };

    // --- FIX ---
    // The "Continue" button now correctly calls onCorrect or onIncorrect
    const handleContinue = () => {
        if (feedback === 'correct') {
            onCorrect();
        } else {
            onIncorrect();
        }
    };

    return (
        <div className="w-full animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-center text-gray-600 mb-4">Select the correct translation:</p>
                <div className="text-center text-3xl font-bold text-teal-700 p-8 bg-gray-100 rounded-lg mb-6">
                    {currentCard.spanish}
                </div>

                {/* --- Answer Options --- */}
                <div className="flex flex-col gap-3">
                    {options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleAnswerSelect(option)}
                            disabled={feedback !== ''}
                            className={`w-full p-4 text-left font-semibold rounded-lg border-2 transition-colors text-gray-800
                                ${selectedAnswer === option 
                                    ? 'bg-blue-100 border-blue-500' 
                                    : 'bg-white border-gray-300 hover:bg-gray-50'
                                }
                                ${feedback && (option === currentCard.english ? 'bg-green-100 border-green-500' : '')}
                                ${feedback === 'incorrect' && selectedAnswer === option ? 'bg-red-100 border-red-500' : ''}
                            `}
                        >
                            {option}
                        </button>
                    ))}
                </div>

                {/* --- Feedback and Continue Button --- */}
                {feedback && (
                     <div className={`mt-4 text-center font-bold text-lg p-3 rounded-md ${feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {feedback === 'correct' ? 'Correct!' : 'Not quite!'}
                    </div>
                )}

                <div className="mt-6 text-center">
                    {/* The button's action and text changes based on the state */}
                    <button 
                        onClick={feedback ? handleContinue : checkAnswer}
                        className="w-full px-8 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700"
                    >
                        {feedback === '' ? 'Check Answer' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MultipleChoiceQuiz;
