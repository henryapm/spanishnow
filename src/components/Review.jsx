import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';
import { useState, useEffect } from 'react';
import Modal from './Modal';
import { BsBookmarkFill } from 'react-icons/bs';

const ReviewItem = ({ word }) => {
    const [isRevealed, setIsRevealed] = useState(false);
    const savedWords = useDecksStore((state) => state.savedWordsSet);
    const isSaved = savedWords.has(word.id);
    const toggleSavedWord = useDecksStore((state) => state.toggleSavedWord);

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-custom-500 flex flex-row items-start justify-between gap-4">
            <div className="flex flex-col">
                <p className="font-bold text-lg text-gray-800 dark:text-gray-200 capitalize">{word.id}</p>
                <button type="button" onClick={() => setIsRevealed(!isRevealed)}>
                    <p className={`text-gray-600 dark:text-gray-400 text-sm text-left transition-all duration-300 ${isRevealed ? '' : 'blur-sm select-none'}`}>
                        {word.translation}
                    </p>
                    <span className="flex align-left text-xs text-gray-500 dark:text-gray-400">{`tap to ${isRevealed ? 'Hide' : 'Show'}`}</span>
                </button>
                <br />
                {word.translation === 'No translation' && <a href={`https://translate.google.com/?sl=es&tl=en&text=${encodeURIComponent(word.id)}&op=translate`} className="text-custom-200 hover:underline" target="_blank" rel="noopener noreferrer">Open in Google Translate</a>}
            </div>
            <button 
                    onClick={(e) => { 
                            e.stopPropagation();
                            if (confirm("You are about to remove this word from your list, hit OK to confirm.")) {
                                toggleSavedWord(word.id);
                            }
                        }}
                    className={`text-2xl ${isSaved ? 'text-yellow-400' : 'text-gray-400'} hover:text-yellow-300 transition-colors`}
                    title={isSaved ? "Remove from saved words" : "Save word for training"}
                >
                    {isSaved ? <BsBookmarkFill /> : ''}
            </button>
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
                <h2 className="text-lg font-bold text-custom-800 dark:text-custom-300">
                    {title}
                </h2>
                <div className="flex items-center gap-3">
                    <span className="bg-custom-100 text-custom-800 text-xs font-bold px-3 py-1 rounded-full dark:bg-custom-900 dark:text-custom-200">
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
    const saveWord = useDecksStore((state) => state.saveWord);
    const toggleSavedWord = useDecksStore((state) => state.toggleSavedWord);

    const [openSections, setOpenSections] = useState({
        stageZero: true,
        soon: true,
        three: false,
        week: false,
        twoWeeks: false,
        mastered: false
    });

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [newWord, setNewWord] = useState("");
    const [newTranslation, setNewTranslation] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 600000); // Update every hour to keep the "due soon" sections accurate
        return () => clearInterval(interval);
    }, []);

    const toggleSection = (key) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        if (currentUser) {
            fetchSavedWords();
        }
    }, [currentUser, fetchSavedWords]);
    
    // Filter words that are due for review
    const today = new Date(now);
    today.setHours(23, 59, 59, 999); // End of today
    const endOfToday = today.getTime();

    const dueWords = savedWordsList.filter(w => {
        if (w.stage >= 5) return false; // Mastered words are done
        if (!w.nextReviewDate) return true; // Legacy/New words are due
        return w.nextReviewDate <= endOfToday;
    });

    // Categorize words for display
    const oneDay = 24 * 60 * 60 * 1000;
    const threeDays = 3 * oneDay;
    const sevenDays = 7 * oneDay;

    const activeWords = savedWordsList.filter(w => w.stage < 5);
    const masteredWords = savedWordsList.filter(w => w.stage >= 5);

    // Sort due words for display in the first section
    const dueWordsSorted = [...dueWords].sort((a, b) => (a.nextReviewDate || 0) - (b.nextReviewDate || 0));

    const due24Hours = activeWords.filter(w => {
        // Exclude words already in dueWords (due today or earlier)
        if (!w.nextReviewDate || w.nextReviewDate <= endOfToday) return false;
        return (w.nextReviewDate - now) < oneDay;
    }).sort((a, b) => a.nextReviewDate - b.nextReviewDate);

    const dueSoon = activeWords.filter(w => {
        if (!w.nextReviewDate) return false;
        const diff = w.nextReviewDate - now;
        return diff >= oneDay && diff < threeDays;
    }).sort((a, b) => a.nextReviewDate - b.nextReviewDate);
    
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

    const handleAddWord = async () => {
        const spanish = String(newWord).trim();
        const english = String(newTranslation).trim();

        if (!spanish || !english) {
            alert("Please fill in both fields.");
            return;
        }

        if (spanish.split(/\s+/).length > 1) {
            alert("Spanish word must be a single word.");
            return;
        }

        if (english.split(/\s+/).length > 2) {
            alert("English translation must be at most 2 words.");
            return;
        }

        if (savedWordsList.some(w => w.id.toLowerCase() === spanish.toLowerCase())) {
            alert("Word already in your list.");
            return;
        }

        setIsAdding(true);
        try {
            await saveWord({ spanish: spanish.toLowerCase(), translation: english });
            await toggleSavedWord(spanish.toLowerCase());
            setIsAddModalOpen(false);
            setNewWord("");
            setNewTranslation("");
        } catch (error) {
            console.error("Error adding word:", error);
            alert("Failed to add word. Please try again.");
        } finally {
            setIsAdding(false);
        }
    };
    return (
        <div className="p-6 rounded-lg shadow-md w-full max-w-4xl mx-auto animate-fade-in">
            <h2 className="text-3xl font-bold text-custom-800 dark:text-custom-500 mb-6 text-center">Spaced Repetition</h2>
            
            {!currentUser ? (
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <p className="text-gray-600 dark:text-gray-300 mb-4">Please log in to save and review words.</p>
                </div>
            ) : (
                <>
                    <div className="flex justify-center mb-4">
                        <button 
                            onClick={() => isPremium ? setIsAddModalOpen(true) : setShowPremiumModal(true)} 
                            className="px-4 py-2 bg-custom-600 text-white font-semibold rounded-lg shadow-md hover:bg-custom-700 transition-colors flex items-center gap-2"
                        >
                            <span>+</span> Add Word {!isPremium && <span className="text-xs ml-1">🔒</span>}
                        </button>
                    </div>

                    <Modal 
                        isOpen={showPremiumModal} 
                        onClose={() => setShowPremiumModal(false)} 
                        title="Premium Feature 🔒"
                    >
                        <p>Adding custom words manually is a Premium feature. Upgrade to unlock this functionality!</p>
                    </Modal>

                    <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Word">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Spanish Word</label>
                                <input 
                                    type="text" 
                                    value={newWord} 
                                    onChange={(e) => setNewWord(e.target.value)} 
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-custom-500 outline-none"
                                    placeholder="e.g. contar"
                                />
                                <p className="text-xs text-gray-500 mt-1">Must be a single word.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">English Translation</label>
                                <input 
                                    type="text" 
                                    value={newTranslation} 
                                    onChange={(e) => setNewTranslation(e.target.value)} 
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-custom-500 outline-none"
                                    placeholder="e.g. to count"
                                />
                                <p className="text-xs text-gray-500 mt-1">Max 2 words.</p>
                            </div>
                            <button 
                                onClick={handleAddWord}
                                disabled={isAdding}
                                className="w-full py-2 bg-custom-600 text-white font-bold rounded hover:bg-custom-700 transition-colors disabled:opacity-50"
                            >
                                {isAdding ? "Adding..." : "Add Word"}
                            </button>
                        </div>
                    </Modal>

                    {dueWords.length === 0 ? (
                        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8">
                            <p className="text-gray-600 dark:text-gray-300 mb-4">You don't have any words due for review right now.</p>
                            <p className="text-gray-500 dark:text-gray-400">Read articles and click on words to save them!</p>
                            <button onClick={() => navigate('/reading')} className="mt-4 px-6 py-2 bg-custom-600 text-white rounded-full hover:bg-custom-700 transition-colors">
                                Go to Reading Library
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center mb-8">
                            <button 
                                onClick={handleStartReview}
                                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105 flex items-center gap-2"
                            >
                                <span>Start Flashcards review</span>
                                <span className="bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full">{dueWords.length}</span>
                            </button>
                        </div>
                    )}

                    <div className="space-y-4">
                        <StageSection title="New / Due Now" words={dueWordsSorted} isOpen={openSections.stageZero} onToggle={() => toggleSection('stageZero')} />
                        <StageSection title="Due in less than 24 hours" words={due24Hours} isOpen={openSections.soon} onToggle={() => toggleSection('soon')} />
                        <StageSection title="Due in less than 3 days" words={dueSoon} isOpen={openSections.three} onToggle={() => toggleSection('three')} />
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