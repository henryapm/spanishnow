import React, { useState, useEffect } from 'react';
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

const DISTRACTOR_WORDS = ['y', 'el', 'es', 'con', 'mi', 'su', 'un', 'una'];

const ListeningView = ({ currentCard, onCorrect, onIncorrect }) => {
    
    // --- CORRECTED STATE SELECTION ---
    // Selecting each piece of state individually to prevent re-render loops.
    const addXp = useDecksStore((state) => state.addXp);
    const resetStreak = useDecksStore((state) => state.resetStreak);
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    
    const [userAnswer, setUserAnswer] = useState([]);
    const [wordBank, setWordBank] = useState([]);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (currentCard) {
            const correctWords = currentCard.spanish.replace(/[¿?¡!.,]/g, '').split(' ');
            const distractors = shuffleArray(DISTRACTOR_WORDS).slice(0, 3);
            setWordBank(shuffleArray([...correctWords, ...distractors]));
            setUserAnswer([]);
            setFeedback('');
        }
    }, [currentCard]);

    const speakSentence = () => {
        if (!currentCard || !window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance(currentCard.spanish);
        utterance.lang = listeningPreference;
        speechSynthesis.speak(utterance);
    };

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
            addXp(15, "Correct!");
        } else {
            setFeedback('incorrect');
            resetStreak();
        }
    };

    const handleContinue = () => {
        if (feedback === 'correct') {
            onCorrect();
        } else {
            onIncorrect();
        }
    };
    
    if (!currentCard) {
        return <div className="text-center">Loading exercise...</div>;
    }

    return (
        <div className="w-full animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-center text-gray-600 mb-4">Listen to the sentence and construct it below.</p>
                <div className="text-center mb-6">
                    <button onClick={speakSentence} className="p-4 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    </button>
                </div>

                <div className="min-h-[6rem] bg-gray-100 rounded-lg p-3 flex flex-wrap gap-2 border-2 border-dashed items-center content-start">
                    {userAnswer.map((word, index) => (
                        <button key={index} onClick={() => handleAnswerClick(word, index)} className="px-3 py-1 bg-teal-500 text-white rounded-md shadow-sm">
                            {word}
                        </button>
                    ))}
                </div>

                <div className="mt-4 p-3 flex flex-wrap gap-2 justify-center">
                     {wordBank.map((word, index) => (
                        <button key={index} onClick={() => handleWordBankClick(word, index)} className="px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100">
                            {word}
                        </button>
                    ))}
                </div>

                {feedback && (
                    <div className={`mt-4 text-center font-bold text-lg p-3 rounded-md ${feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {feedback === 'correct' ? 'Correct!' : 'Not quite!'}
                    </div>
                )}

                <div className="mt-6 text-center">
                    {feedback === '' ? (
                        <button onClick={checkAnswer} className="w-full px-8 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700">
                            Check Answer
                        </button>
                    ) : (
                        <button onClick={handleContinue} className="w-full px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700">
                            Continue
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ListeningView;
