import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const ListeningView = ({ decks }) => {
    const { deckId } = useParams();
    const navigate = useNavigate();
    
    // Get all the necessary actions and state from the store
    const updateCardProgress = useDecksStore((state) => state.updateCardProgress);
    const addXp = useDecksStore((state) => state.addXp);
    const resetStreak = useDecksStore((state) => state.resetStreak);
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    const totalXp = useDecksStore((state) => state.totalXp);
    
    const deck = decks[deckId];

    // --- Component State ---
    const [sessionCards, setSessionCards] = useState([]);
    const [reviewPile, setReviewPile] = useState([]); // --- NEW: To hold incorrect cards ---
    const [isReviewRound, setIsReviewRound] = useState(false); // --- NEW: To track the review phase ---
    const [userAnswer, setUserAnswer] = useState([]);
    const [wordBank, setWordBank] = useState([]);
    const [feedback, setFeedback] = useState(''); // '', 'correct', 'incorrect'
    const [isSessionComplete, setIsSessionComplete] = useState(false);
    const [sessionXp, setSessionXp] = useState(0);

    useEffect(() => {
        if (deck && deck.cards) {
            setSessionCards(shuffleArray(deck.cards));
            setReviewPile([]);
            setIsReviewRound(false);
            setSessionXp(0);
        }
    }, [deck]);

    const currentCard = sessionCards[0];

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
            const xpEarned = 15;
            setFeedback('correct');
            addXp(xpEarned, "Correct!");
            setSessionXp(prev => prev + xpEarned);
            updateCardProgress(deckId, currentCard.id, true);
        } else {
            setFeedback('incorrect');
            resetStreak();
            // --- NEW: Add incorrect card to the review pile ---
            setReviewPile(prev => [...prev, currentCard]);
            updateCardProgress(deckId, currentCard.id, false);
        }
    };

    const handleContinue = () => {
        const remainingCards = sessionCards.slice(1);
        
        if (remainingCards.length > 0) {
            // If there are still cards in the main session, continue
            setSessionCards(remainingCards);
        } else {
            // --- NEW: Check for a review round ---
            if (reviewPile.length > 0) {
                // If there are cards to review, start the review round
                setSessionCards(shuffleArray(reviewPile));
                setReviewPile([]); // Clear the pile for the next round
                setIsReviewRound(true);
            } else {
                // If no cards to review, the session is complete
                if (!isReviewRound) { // Award bonus only if they got everything right on the first pass
                    const bonusXp = 100;
                    addXp(bonusXp, "Perfect Listening Session!");
                    setSessionXp(prev => prev + bonusXp);
                }
                setIsSessionComplete(true);
            }
        }
    };

    if (!deck || !deck.cards) {
        return <div className="text-center">Loading...</div>;
    }

    if (isSessionComplete) {
        return (
            <div className="text-center animate-fade-in">
                <h2 className="text-4xl font-bold text-teal-800 mb-4">🏆 Session Complete!</h2>
                <p className="text-lg text-gray-600 mb-6">You've finished this listening session. Great job!</p>
                <div className="bg-blue-100 border-2 border-blue-300 p-4 rounded-lg mb-6">
                    <p className="text-xl font-bold text-blue-800">You earned {sessionXp} XP!</p>
                </div>
                <div className="flex justify-center">
                    <button onClick={() => navigate('/')} className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-colors">Back to All Decks</button>
                </div>
            </div>
        );
    }
    
    if (!currentCard) {
        return <div className="text-center">Loading listening session...</div>;
    }

    const progressPercentage = ((deck.cards.length - sessionCards.length) / deck.cards.length) * 100;

    return (
        <div className="w-full animate-fade-in">
            <h1 className="text-xl font-bold text-teal-800 mb-2 text-center">{deck.title}</h1>
            {isReviewRound && <p className="text-center font-bold text-yellow-600 mb-2">Review Round!</p>}
            
            <div className="mb-4 bg-white p-3 rounded-lg shadow-inner">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                </div>
            </div>

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
                        {feedback === 'correct' ? (
                            <div>
                                <p>Correct!</p>
                                <p className="text-sm font-normal mt-1"><span className="font-semibold">{currentCard.spanish}</span></p>
                                <p className="text-sm font-normal mt-1 text-gray-500">{currentCard.english}</p>
                            </div>
                        ) : (
                            <div>
                                <p>Not quite. The correct answer is:</p>
                                <p className="text-sm font-normal mt-1"><span className="font-semibold">{currentCard.spanish}</span></p>
                            </div>
                        )}
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
            <button onClick={() => navigate('/')} className="mt-6 text-gray-500 hover:text-gray-700 transition-colors w-full text-center">← Back to Decks</button>
        </div>
    );
};

export default ListeningView;
