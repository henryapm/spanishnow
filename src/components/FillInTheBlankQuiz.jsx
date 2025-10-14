import React, { useState, useEffect } from 'react';

// Helper function to shuffle an array
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// A fallback list of common Spanish words to use as distractors
const GENERIC_DISTRACTORS = ['y', 'el', 'es', 'con', 'mi', 'su', 'un', 'una', 'pero', 'por', 'gracias'];

const FillInTheBlankQuiz = ({ lessonCards, currentCard, onCorrect, onIncorrect }) => {
    const [sentenceParts, setSentenceParts] = useState([]);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [options, setOptions] = useState([]);
    const [selectedWord, setSelectedWord] = useState(null);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (currentCard && lessonCards) {
            const blankWord = currentCard.vocab || currentCard.spanish.split(' ')[0];
            setCorrectAnswer(blankWord);

            // --- FIX #2 & #3: Use split() for a robust blank creation ---
            const parts = currentCard.spanish.split(blankWord);
            setSentenceParts(parts);

            // --- FIX #1: More robust option generation ---
            // Find distractors from other cards, excluding the correct answer
            const distractors = lessonCards
                .filter(card => card.id !== currentCard.id)
                .flatMap(card => (card.vocab ? [card.vocab] : card.spanish.replace(/[¿?¡!.,]/g, '').split(' ')))
                .filter(word => word && word !== blankWord);
            
            let uniqueDistractors = [...new Set(distractors)];

            // If not enough unique distractors, add generic ones
            if (uniqueDistractors.length < 3) {
                const generic = shuffleArray(GENERIC_DISTRACTORS.filter(word => word !== blankWord));
                while(uniqueDistractors.length < 3 && generic.length > 0) {
                    const nextWord = generic.shift();
                    if (!uniqueDistractors.includes(nextWord)) {
                        uniqueDistractors.push(nextWord);
                    }
                }
            }

            const finalOptions = shuffleArray([blankWord, ...shuffleArray(uniqueDistractors).slice(0, 3)]);
            setOptions(finalOptions);

            // Reset state for the new question
            setSelectedWord(null);
            setFeedback('');
        }
    }, [currentCard, lessonCards]);

    const handleOptionClick = (word) => {
        if (selectedWord) return;
        setSelectedWord(word);
        setOptions(options.filter(opt => opt !== word));
    };
    
    const handleBlankClick = () => {
        if (!selectedWord || feedback) return;
        setOptions(shuffleArray([...options, selectedWord]));
        setSelectedWord(null);
    };

    const checkAnswer = () => {
        if (selectedWord === correctAnswer) {
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
        <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-center text-gray-600 mb-2">Complete the sentence:</p>
            <p className="text-center text-gray-500 mb-4">"{currentCard.english}"</p>

            <div className="text-center text-2xl font-semibold text-gray-800 mb-6 p-4 bg-gray-50 rounded-lg border">
                {sentenceParts[0]}
                <button
                    onClick={handleBlankClick}
                    className={`font-bold inline-block mx-2 px-4 min-w-[100px] h-10 rounded-md align-middle
                        ${selectedWord 
                            ? 'bg-blue-100 text-blue-700 border-2 border-blue-400 cursor-pointer' 
                            : 'bg-gray-200 border-2 border-dashed border-gray-400'
                        }
                    `}
                >
                    {selectedWord || ''}
                </button>
                {sentenceParts[1]}
            </div>

            <div className="flex flex-wrap gap-2 justify-center min-h-[3rem] mb-6">
                {options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleOptionClick(option)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
                    >
                        {option}
                    </button>
                ))}
            </div>

            {feedback && (
                <div className={`mt-4 text-center font-bold text-lg p-3 rounded-md ${feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {feedback === 'correct' ? 'Correct!' : `Not quite. The correct answer was: "${correctAnswer}"`}
                </div>
            )}
            
            <div className="mt-6 text-center">
                {feedback === '' ? (
                    <button 
                        onClick={checkAnswer} 
                        disabled={!selectedWord}
                        className="w-full px-8 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Check Answer
                    </button>
                ) : (
                    <button onClick={handleContinue} className="w-full px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700">
                        Continue
                    </button>
                )}
            </div>
        </div>
    );
};

export default FillInTheBlankQuiz;

