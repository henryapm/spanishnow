import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store.js'; // Adjust path as needed
import { BsCardList } from "react-icons/bs";

const TrainingMode = () => {
    const navigate = useNavigate();
    
    // Get data and actions from the store
    const fetchSavedWords = useDecksStore((state) => state.fetchSavedWords);
    const savedWordsList = useDecksStore((state) => state.savedWordsList);
    const prepareTrainingDeck = useDecksStore((state) => state.prepareTrainingDeck);
    const isLoading = useDecksStore((state) => state.isLoading);

    // Fetch saved words when the component mounts
    useEffect(() => {
        fetchSavedWords();
    }, [fetchSavedWords]);

    // Group the saved words by month using useMemo for efficiency
    const wordsByMonth = useMemo(() => {
        return savedWordsList.reduce((acc, word) => {
            if (!word.addedAt) {
                return acc; // Skip words without a timestamp
            }
            const date = word.addedAt.toDate(); // Convert Firestore Timestamp to JS Date
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            if (!acc[monthYear]) {
                acc[monthYear] = [];
            }
            
            // --- MODIFIED: Store the object with translation ---
            acc[monthYear].push({
                spanish: word.id,
                translation: word.translation
            });
            return acc;
        }, {});
    }, [savedWordsList]);

    // Handle the "Start Training" button click
    const handleStartTraining = async () => {
        const allWords = savedWordsList.map(w => w.id);
        if (allWords.length === 0) {
            alert("You haven't saved any words yet!");
            return;
        }
        
        await prepareTrainingDeck(allWords);
        navigate('/lessons/training'); // Navigate to the special 'training' deck
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full">
            <h2 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-4">Training Mode</h2>
            
            <button
                onClick={handleStartTraining}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 text-white font-bold rounded-lg shadow-md hover:bg-teal-600 transition-colors duration-200 disabled:opacity-50"
            >
                <BsCardList />
                {isLoading ? "Loading..." : `Practice All Saved Words (${savedWordsList.length})`}
            </button>

            <div className="mt-6 space-y-4 max-h-60 overflow-y-auto pr-2">
                {Object.keys(wordsByMonth).length === 0 && !isLoading && (
                    <p className="text-gray-500 dark:text-gray-400">Save words from articles to start training!</p>
                )}
                
                {Object.entries(wordsByMonth).map(([monthYear, words]) => (
                    <div key={monthYear}>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{monthYear}</h3>
                        <div className="flex flex-wrap gap-2">
                            {/* --- MODIFIED: Render word and translation --- */}
                            {words.map(word => (
                                <span 
                                    key={word.spanish} 
                                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-medium"
                                >
                                    {word.spanish}: <span className="italic opacity-80">{word.translation}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TrainingMode;

