import React, { useState, useEffect, useMemo } from 'react';

// Helper function to shuffle an array
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const DISTRACTOR_WORDS = ['y', 'el', 'es', 'con', 'mi', 'su', 'un', 'una'];

const FillInTheBlankQuiz = ({ currentCard, onCorrect, onIncorrect }) => {
    const [userAnswer, setUserAnswer] = useState([]); // Will hold the array of words
    const [wordBank, setWordBank] = useState([]);
    const [feedback, setFeedback] = useState(''); // '', 'correct', 'incorrect'

    // This effect generates the word bank when the card changes.
    useEffect(() => {
        if (currentCard && currentCard.spanish) {
            const correctWords = currentCard.spanish.replace(/[¿?¡!.,]/g, '').split(' ');
            const distractors = shuffleArray(DISTRACTOR_WORDS).slice(0, 3);
            setWordBank(shuffleArray([...correctWords, ...distractors]));
            setUserAnswer([]);
            setFeedback('');
        }
    }, [currentCard]);

    const handleWordBankClick = (word, index) => {
        if (feedback) return;
        setUserAnswer([...userAnswer, word]);
        const newWordBank = [...wordBank];
        newWordBank.splice(index, 1);
        setWordBank(newWordBank);
    };

    const handleAnswerClick = (word, index) => {
        if (feedback) return;
        setWordBank([...wordBank, word]);
        const newUserAnswer = [...userAnswer];
        newUserAnswer.splice(index, 1);
        setUserAnswer(newUserAnswer);
    };

    const checkAnswer = () => {
        const correctAnswer = currentCard.spanish.replace(/[¿?¡!.,]/g, '');
        const userAnswerString = userAnswer.join(' ');

        if (userAnswerString === correctAnswer) {
            setFeedback('correct');
        } else {
            setFeedback('incorrect');
        }
    };

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
                <p className="text-center text-gray-600 mb-2">Construct the correct sentence:</p>
                <p className="text-center text-xl font-semibold text-gray-800 mb-4">"{currentCard.english}"</p>
                
                {/* --- User's Answer Area --- */}
                <div className="min-h-[6rem] bg-gray-100 rounded-lg p-3 flex flex-wrap gap-2 border-2 border-dashed items-center content-start">
                    {userAnswer.map((word, index) => (
                        <button key={index} onClick={() => handleAnswerClick(word, index)} className="px-3 py-1 bg-teal-500 text-white rounded-md shadow-sm">
                            {word}
                        </button>
                    ))}
                </div>

                {/* --- Word Bank --- */}
                <div className="mt-4 p-3 min-h-[6rem] flex flex-wrap gap-2 justify-center">
                     {wordBank.map((word, index) => (
                        <button key={index} onClick={() => handleWordBankClick(word, index)} className="px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100">
                            {word}
                        </button>
                    ))}
                </div>

                {/* --- Feedback and Continue Button --- */}
                {feedback && (
                     <div className={`mt-4 text-center font-bold text-lg p-3 rounded-md ${feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {feedback === 'correct' ? 'Correct!' : `Not quite! The correct sentence was "${currentCard.spanish}".`}
                    </div>
                )}

                <div className="mt-6 text-center">
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

export default FillInTheBlankQuiz;
