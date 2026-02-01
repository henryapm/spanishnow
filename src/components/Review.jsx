import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';
import { useState, useEffect } from 'react';

const ReviewItem = ({ word }) => {
    const [isRevealed, setIsRevealed] = useState(false);

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-teal-500 flex justify-between items-center">
            <div>
                <p className="font-bold text-lg text-gray-800 dark:text-gray-200 capitalize">{word.id}</p>
                <button type="button" onClick={() => setIsRevealed(!isRevealed)}>
                    <p className={`text-gray-600 dark:text-gray-400 text-sm text-left transition-all duration-300 ${isRevealed ? '' : 'blur-sm select-none'}`}>
                        {word.translation}
                    </p>
                    <span className="flex align-left text-xs text-gray-500 dark:text-gray-400">{`tap to ${isRevealed ? 'Hide' : 'Show'}`}</span>
                </button>
                <br />
                {word.translation === 'No translation' && <a href={`https://translate.google.com/?sl=es&tl=en&text=${encodeURIComponent(word.id)}&op=translate`} className="text-teal-200 hover:underline" target="_blank" rel="noopener noreferrer">Open in Google Translate</a>}
            </div>
        </div>
    );
};

const Review = () => {
    const navigate = useNavigate();
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);
    const isPremium = isAdmin || hasActiveSubscription;
    const currentUser = useDecksStore((state) => state.currentUser);
    const savedWordsList = useDecksStore((state) => state.savedWordsList);
    const prepareTrainingDeck = useDecksStore((state) => state.prepareTrainingDeck);
    const fetchSavedWords = useDecksStore((state) => state.fetchSavedWords);

    useEffect(() => {
        if (currentUser) {
            fetchSavedWords();
        }
    }, [currentUser, fetchSavedWords]);
    
    const handleStartReview = async () => {
        if (!savedWordsList || savedWordsList.length === 0) return;
        const words = savedWordsList.map(w => w.id);
        await prepareTrainingDeck(words);
        navigate('/review/training');
    };
    return (
        isPremium ? (
                    <div className="w-full max-w-4xl mx-auto p-6">
                        <h2 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-6 text-center">Spaced Repetition</h2>
                        
                        {!currentUser ? (
                            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                                <p className="text-gray-600 dark:text-gray-300 mb-4">Please log in to save and review words.</p>
                            </div>
                        ) : savedWordsList.length === 0 ? (
                            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                                <p className="text-gray-600 dark:text-gray-300 mb-4">You haven't saved any words yet.</p>
                                <p className="text-gray-500 dark:text-gray-400">Read articles and click on words to save them!</p>
                                <button onClick={() => navigate('/reading')} className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors">
                                    Go to Reading Library
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-center">
                                    <button 
                                        onClick={handleStartReview}
                                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105 flex items-center gap-2"
                                    >
                                        <span>Start Practice Session</span>
                                        <span className="bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full">{savedWordsList.length}</span>
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    {savedWordsList.map((word) => (
                                        <ReviewItem key={word.id} word={word} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <span className="text-6xl mb-4">🔒</span>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Premium Feature</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                            The Review feature is available for Premium users only. Subscribe to unlock this feature and practice your saved words!
                        </p>
                    </div>
                )
            )
};

export default Review;