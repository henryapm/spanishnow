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

const StageSection = ({ title, words, isOpen, onToggle }) => {
    if (words.length === 0) return null;

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            <button 
                onClick={onToggle}
                className="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
            >
                <h2 className="text-lg font-bold text-teal-800 dark:text-teal-300">
                    {title}
                </h2>
                <div className="flex items-center gap-3">
                    <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full dark:bg-teal-900 dark:text-teal-200">
                        {words.length}
                    </span>
                    <svg 
                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>
            
            {isOpen && (
                <div className="p-4 grid grid-cols-1 gap-4 border-t border-gray-200 dark:border-gray-700">
                    {words.map((word) => <ReviewItem key={word.id} word={word} />)}
                </div>
            )}
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

    const [openSections, setOpenSections] = useState({
        stageZero: true,
        soon: true,
        week: false,
        twoWeeks: false,
        mastered: false
    });

    const toggleSection = (key) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        if (currentUser) {
            fetchSavedWords();
        }
    }, [currentUser, fetchSavedWords]);
    
    // Filter words that are due for review
    const dueWords = savedWordsList.filter(w => {
        if (w.stage >= 4) return false; // Mastered words are done
        if (!w.nextReviewDate) return true; // Legacy/New words are due
        return w.nextReviewDate <= Date.now();
    });

    // Categorize words for display
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const threeDays = 3 * oneDay;
    const sevenDays = 7 * oneDay;

    const activeWords = savedWordsList.filter(w => w.stage < 4);
    const masteredWords = savedWordsList.filter(w => w.stage >= 4);

    const stageZeroWords = activeWords.filter(w => w.stage === 0);

    const dueSoon = activeWords.filter(w => w.stage !== 0 && (w.nextReviewDate - now) < threeDays)
        .sort((a, b) => a.nextReviewDate - b.nextReviewDate);
    
    const dueWeek = activeWords.filter(w => {
        const diff = w.nextReviewDate - now;
        return diff >= threeDays && diff < sevenDays;
    }).sort((a, b) => a.nextReviewDate - b.nextReviewDate);

    const dueTwoWeeks = activeWords.filter(w => (w.nextReviewDate - now) >= sevenDays)
        .sort((a, b) => a.nextReviewDate - b.nextReviewDate);

    const handleStartReview = async () => {
        if (dueWords.length === 0) return;
        const words = dueWords.map(w => w.id);
        await prepareTrainingDeck(words);
        navigate('/review/training');
    };
    return (
        <div className="w-full max-w-4xl mx-auto p-6">
            <h2 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-6 text-center">Spaced Repetition</h2>
            
            {!isPremium ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <span className="text-6xl mb-4">🔒</span>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Premium Feature</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                        The Review feature is available for Premium users only. Subscribe to unlock this feature and practice your saved words!
                    </p>
                </div>
            ) : !currentUser ? (
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <p className="text-gray-600 dark:text-gray-300 mb-4">Please log in to save and review words.</p>
                </div>
            ) : (
                <>
                    {dueWords.length === 0 ? (
                        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8">
                            <p className="text-gray-600 dark:text-gray-300 mb-4">You don't have any words due for review right now.</p>
                            <p className="text-gray-500 dark:text-gray-400">Read articles and click on words to save them!</p>
                            <button onClick={() => navigate('/reading')} className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors">
                                Go to Reading Library
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center mb-8">
                            <button 
                                onClick={handleStartReview}
                                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105 flex items-center gap-2"
                            >
                                <span>Start Training Session</span>
                                <span className="bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full">{dueWords.length}</span>
                            </button>
                        </div>
                    )}

                    <div className="space-y-4">
                        <StageSection title="New / Due Now" words={stageZeroWords} isOpen={openSections.stageZero} onToggle={() => toggleSection('stageZero')} />
                        <StageSection title="Due in less than 3 days" words={dueSoon} isOpen={openSections.soon} onToggle={() => toggleSection('soon')} />
                        <StageSection title="Due in less than a week" words={dueWeek} isOpen={openSections.week} onToggle={() => toggleSection('week')} />
                        <StageSection title="Due in less than 2 weeks" words={dueTwoWeeks} isOpen={openSections.twoWeeks} onToggle={() => toggleSection('twoWeeks')} />
                        <StageSection title="Mastered Words 🎓" words={masteredWords} isOpen={openSections.mastered} onToggle={() => toggleSection('mastered')} />
                    </div>
                </>
            )}
        </div>
    );
};

export default Review;