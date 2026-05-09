import React, { useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useDecksStore } from '../store';
import { CircularProgress } from './SpeakCompanion';

const AccountPage = ({ decks }) => {
    const navigate = useNavigate();
    
    // Selecting each piece of state individually to prevent infinite re-render loops.
    const currentUser = useDecksStore((state) => state.currentUser);
    const scenarios = useDecksStore((state) => state.scenarios);
    const userProgress = useDecksStore((state) => state.speakProgress);
    const progress = useDecksStore((state) => state.progress);
    const savedWordsList = useDecksStore((state) => state.savedWordsList);
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    const updateListeningPreference = useDecksStore((state) => state.updateListeningPreference);
    const theme = useDecksStore((state) => state.theme);
    const toggleTheme = useDecksStore((state) => state.toggleTheme);

    const handlePreferenceChange = (e) => {
        const newPreference = e.target.value;
        updateListeningPreference(newPreference); 
    };

    // Filter words that are due for review
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const endOfToday = today.getTime();

    const masteredWords = savedWordsList.filter(w => {
        return w.stage === 5; // Mastered words are done
    });

    const dueForReviewWords = savedWordsList.filter(w => {
        if (w.stage >= 5) return false; // Mastered words are done
        if (!w.nextReviewDate) return true; // Legacy/New words are due
        return w.nextReviewDate <= endOfToday;
    });


    const stats = useMemo(() => {
        let totalCardsMastered = 0;
        let decksCompleted = 0;
        
        for (const deckId in decks) {
            const deck = decks[deckId];
            if (deck.cards && deck.cards.length > 0) {
                const deckProgress = progress[deckId] || {};
                
                // Count cards with mastery >= 3 (SRS logic)
                const masteredCount = deck.cards.filter(card => {
                    const cardData = deckProgress[card.id];
                    return (cardData?.mastery || 0) >= 3;
                }).length;
                
                totalCardsMastered += masteredCount;

                if (masteredCount === deck.cards.length) {
                    decksCompleted++;
                }
            }
        }
        return { totalCardsMastered, decksCompleted };
    }, [decks, progress]);

    const calculateProgress = (deckId, deck) => {
        if (!deck.cards || deck.cards.length === 0) return 0;
        const deckProgress = progress[deckId] || {};
        
        // Count cards that have been attempted (exist in progress)
        const seenCount = deck.cards.filter(card => deckProgress[card.id] !== undefined).length;
        return (seenCount / deck.cards.length) * 100;
    };

    if (!currentUser) {
        return <div className="text-center dark:text-gray-300">Loading user data...</div>;
    }

    return (
        <div className="animate-fade-in">
            {/* --- Profile Section --- */}
            <div className="flex flex-col sm:flex-row items-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
                <img 
                    src={currentUser.photoURL || `https://i.pravatar.cc/150?u=${currentUser.uid}`} 
                    alt="Profile" 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mb-4 sm:mb-0 sm:mr-6"
                    referrerPolicy="no-referrer"
                />
                <div className="text-center sm:text-left">
                    Welcome <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200">{currentUser.displayName}</h1>
                </div>
            </div>

            {/* --- Overall Stats Section --- */}
            { dueForReviewWords.length > 0 && masteredWords.length > 0 ? (
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md gap-4 text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Spaced Repetition Stats</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-2 border-sky-600 dark:border-sky-400">
                                <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{dueForReviewWords.length}</p>
                                <p className="text-gray-500 dark:text-gray-400">Words saved for review</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-2 border-sky-600 dark:border-sky-400">
                                <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{masteredWords.length}</p>
                                <p className="text-gray-500 dark:text-gray-400">Words Mastered</p>
                            </div>
                        </div>
                        <NavLink
                            to="/reading-library"
                            className=" mt-4 inline-block bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                            Explore Library
                        </NavLink>
                    </div>           
            ) : (
                <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">No Progress Yet</h2>
                    <p className="text-gray-600 dark:text-gray-400">Go to our 
                    <NavLink 
                        to="/reading-library" 
                        className={'ml-1 text-custom-600 dark:text-custom-400 nav-item-active hover:text-custom-500 dark:hover:text-custom-300'}
                        aria-label="Reading practice"
                    >
                        Library
                    </NavLink> page to start learning!</p>
                </div>
            )}
            {/* --- Role play Progress Section --- */}
            <div className="bg-white text-center dark:bg-gray-700 p-6 rounded-lg shadow-md my-8">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Role Plays Completed</h2>
                {scenarios.map(scenario => {
                        // --- NEW: Calculate progress for this scenario ---
                        const completedCount = userProgress[scenario.id]?.length || 0;
                        const totalCount = scenario.rolePlays ? scenario.rolePlays.length : 0;
                        const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                        return (
                            progressPercent === 100 && (
                                <div key={scenario.id} className="mb-4">
                                    <div className="flex items-center justify-between mb-1 border-2 border-sky-600 dark:border-sky-400 rounded-lg p-4 ">
                                        <span className="font-bold text-gray-700 dark:text-gray-300">{scenario.name}</span>
                                        <CircularProgress percentage={progressPercent} />
                                    </div>
                                </div>
                            )
                        )
                })}
                <NavLink
                    to="/speakCompanion"
                    className=" mt-4 inline-block bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                >
                    Role Play Now
                </NavLink>
            </div>
            {/* --- Settings Section --- */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Settings</h2>
                <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Appearance</span>
                    <button
                        onClick={toggleTheme}
                        className="px-4 py-2  border-gray-700 dark:border-gray-200 bg-white-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <label htmlFor="listening-preference" className="font-bold text-gray-700 dark:text-gray-300">Listening Accent</label>
                    <select 
                        id="listening-preference"
                        value={listeningPreference}
                        onChange={handlePreferenceChange}
                        className="p-2  border-gray-700 dark:border-gray-200 rounded-md shadow-sm bg-white-100 dark:bg-gray-700 dark:text-gray-200"
                    >
                        <option value="es-ES">Spain</option>
                        <option value="es-MX">Mexico</option>
                        <option value="es-US">United States</option>
                    </select>
                </div>
            </div>

        </div>
    );
};

export default AccountPage;