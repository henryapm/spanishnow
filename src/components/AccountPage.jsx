import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useDecksStore } from '../store';
import { CircularProgress } from './SpeakCompanion';
import { BsCheckCircleFill } from 'react-icons/bs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FaArrowCircleRight, FaFire } from 'react-icons/fa';

const AccountPage = ({ decks }) => {
    const navigate = useNavigate();
    
    const currentUser = useDecksStore((state) => state.currentUser);
    {/* Fetch Scenarios */}
    const scenarios = useDecksStore((state) => state.scenarios);
    const userProgress = useDecksStore((state) => state.speakProgress);
    const fetchScenarios = useDecksStore((state) => state.fetchScenarios);
    const fetchSpeakProgress = useDecksStore((state) => state.fetchSpeakProgress);
    {/* Fetch everything for articles */}
    const fetchArticles = useDecksStore((state) => state.fetchArticles);
    const articles = useDecksStore((state) => state.articles);
    
    const finishedArticles = useDecksStore((state) => state.finishedArticles);
    const xpHistory = useDecksStore((state) => state.xpHistory);
    const totalXp = useDecksStore((state) => state.totalXp);
    const fetchXpHistory = useDecksStore((state) => state.fetchXpHistory);
    const streak = useDecksStore((state) => state.streak);
    
    {/* fetch SRS */}
    const savedWordsList = useDecksStore((state) => state.savedWordsList);
    {/* Fetch settings */}
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    const updateListeningPreference = useDecksStore((state) => state.updateListeningPreference);
    const theme = useDecksStore((state) => state.theme);
    const toggleTheme = useDecksStore((state) => state.toggleTheme);

    const isAdmin = useDecksStore((state) => state.isAdmin);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);
    const isPremium = isAdmin || hasActiveSubscription;
    const startSession = useDecksStore((state) => state.startSession);

    // --- NEW: Account Deletion State ---
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const deleteUserAccount = useDecksStore((state) => state.deleteUserAccount);
    const signOutUser = useDecksStore((state) => state.signOutUser);

    {/* --- Calculate the sentences and words read on the finished articles --- */}
    const { wordsRead, sentencesRead, articlesRead } = useMemo(() => {
        let wordCount = 0;
        let sentenceCount = 0;
        let articleCount = 0;
        Object.entries(articles).forEach(([key, article]) => {
            if (finishedArticles.has(key) && article.sentences) {
                sentenceCount += article.sentences.length;
                articleCount++;
                article.sentences.forEach(sentence => {
                    if (sentence.spanish && sentence.spanish.trim()) {
                        wordCount += sentence.spanish.trim().split(/\s+/).length;
                    }
                });
            }
        });
        return { wordsRead: wordCount, sentencesRead: sentenceCount, articlesRead: articleCount };
    }, [articles, finishedArticles]);

    {/* --- NEW: Calculate completed scenarios --- */}
    const scenariosCompleted = useMemo(() => {
        let count = 0;
        scenarios.forEach(scenario => {
            const completedCount = userProgress[scenario.id]?.length || 0;
            const totalCount = scenario.rolePlays ? scenario.rolePlays.length : 0;
            const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
            if (progressPercent === 100 && totalCount > 0) {
                count++;
            }
        });
        return count;
    }, [scenarios, userProgress]);
    
    const levelOrder = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
    const getLevelValue = (level) => levelOrder[level?.toUpperCase()] || 99;

    const nextArticle = useMemo(() => {
        const availableArticles = Object.entries(articles)
            .map(([id, data]) => ({ id, ...data }))
            .filter(article => !finishedArticles.has(article.id))
            .filter(article => isPremium || !article.premium)
            .sort((a, b) => {
                const diff = getLevelValue(a.level) - getLevelValue(b.level);
                if (diff !== 0) return diff;
                return (a.title || "").localeCompare(b.title || "");
            });
        
        return availableArticles.length > 0 ? availableArticles[0] : null;
    }, [articles, finishedArticles, isPremium]);

    const getLevelColor = (level) => {
        switch (level?.toUpperCase()) {
            case 'A1': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'A2': return 'bg-custom-100 text-custom-800 dark:bg-custom-900 dark:text-custom-300';
            case 'B1': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'B2': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'C1': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const handlePreferenceChange = (e) => {
        const newPreference = e.target.value;
        updateListeningPreference(newPreference); 
    };

    // --- NEW: Handle Account Deletion ---
    const handleDeleteAccount = async () => {
        if (deleteConfirmation.toLowerCase() !== 'delete') return;
        setIsDeleting(true);
        const result = await deleteUserAccount();
        
        if (result.success) {
            // Firebase automatically triggers onAuthStateChanged which handles the logout
            setShowDeleteModal(false);
        } else if (result.requiresRecentLogin) {
            alert("For security reasons, you must have logged in recently to delete your account. You will now be logged out. Please log back in and try again.");
            setShowDeleteModal(false);
            signOutUser();
        } else {
            alert(`Error deleting account: ${result.error}`);
            setIsDeleting(false);
        }
    };

    // Fetch Scenarios and Goals from Firestore
    useEffect(() => {
        fetchScenarios();
        fetchSpeakProgress();
        fetchXpHistory();
    }, [fetchScenarios, fetchSpeakProgress, fetchXpHistory]);

    useEffect(() => {
        const lastFetch = sessionStorage.getItem('articles_last_fetch');
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;

        // Fetch if we have no articles, OR if there's no fetch history, OR if 1 day has passed
        if (Object.keys(articles).length === 0 || !lastFetch || (now - parseInt(lastFetch, 10) > ONE_DAY)) {
            fetchArticles();
            sessionStorage.setItem('articles_last_fetch', now.toString());
        }
    }, [fetchArticles]);

    const weeklyXpData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const day = new Date(today);
            day.setDate(today.getDate() - i);

            const dateString = day.toLocaleDateString('en-CA'); // YYYY-MM-DD format
            const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });

            const xp = xpHistory[dateString] || 0;
            data.push({ name: dayName, xp });
        }
        return data;
    }, [xpHistory]);

    // Filter words that are due for review
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const endOfToday = today.getTime();

    const masteredWords = savedWordsList.filter(w => {
        return w.stage === 5; // Mastered words are done
    });

    let count = 0;
    const dueForReviewWords = savedWordsList.filter(w => {
        return w.stage < 5;
    });

    if (!currentUser) {
        return <div className="text-center dark:text-gray-300">Loading user data...</div>;
    }

    return (
        <div className="animate-fade-in">
            {/* --- Delete Account Confirmation Modal --- */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative transform transition-all">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Delete Account</h2>
                        
                        <div className="space-y-4">
                            <div className="p-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 rounded-lg font-semibold text-sm border border-red-200 dark:border-red-800">
                                Warning: This action is irreversible. All your progress, XP, streaks, and saved words will be permanently lost.
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                                To confirm, please type <strong>delete</strong> in the box below:
                            </p>
                            <input 
                                type="text"
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                placeholder="Type 'delete' here..."
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                disabled={isDeleting}
                            />
                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    onClick={() => !isDeleting && setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleDeleteAccount}
                                    disabled={deleteConfirmation.toLowerCase() !== 'delete' || isDeleting}
                                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl shadow-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Profile Section --- */}
            <div className="inline-flex items-center bg-white dark:bg-gray-700 p-2 shadow-lg rounded-full my-8 text-left">
                {/* add profile image */}
                <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0 mr-4">
                    {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-gray-400 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                            {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                    )}
                </div>
                <h1 className="text-3xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200 pr-2">Hi {currentUser.displayName.split(' ')[0]}!</h1>
            </div>
            
            {nextArticle && (
                <div className="bg-linear-to-r from-red-500 to-purple-500 rounded-xl shadow-lg p-6 mb-8 text-white flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-bold mb-2">Ready to learn?</h2>
                        <p className="mb-1 text-blue-100">Your next recommended article is waiting:</p>
                        <p className="font-semibold text-lg">"{nextArticle.title}" <span className="text-sm bg-white/20 px-2 py-0.5 rounded ml-2">{nextArticle.level}</span></p>
                    </div>
                    <button 
                        onClick={() => {
                            startSession(nextArticle.id);
                            navigate('/lesson');
                        }}
                        className="px-6 py-3 bg-white text-blue-600 font-bold rounded-full shadow-md hover:bg-gray-100 transition-transform transform hover:scale-105 flex items-center gap-2 whitespace-nowrap"
                    >
                        Start Learning <FaArrowCircleRight />
                    </button>
                </div>
            )}

            {/* --- STATS --- */}
            <div className="flex justify-center my-8">
                <h1 className="text-4xl font-bold  dark:bg-gray-700 p-6 shadow-lg rounded-lg text-centergray-800 dark:text-gray-200 text-center">Your Stats</h1>
            </div>
            <div className="grid grid-cols-2 place-items-center gap-3 items-center justify-center mb-4 ">
                <div className="flex flex-col bg-linear-to-b wrap-break-word from-purple-400 w-50 p-2 to-purple-700 md:p-6 sm:p-6 text-center rounded-lg shadow-md">
                    <h2 className="md:text-2xl sm:text-xl text-gray-800 tracking-widest">Learning</h2>
                    <p className='flex flex-col items-center gap-1 justify-center md:text-6xl sm:text-2xl xs:text-lg bold text-blue-100'><span className="font-extrabold text-2xl">{dueForReviewWords.length}</span> <span className='text-sm text-gray-200'>Words</span></p>
                </div>
                <div className="flex flex-col bg-linear-to-b wrap-break-word from-sky-500 p-2 w-50 to-blue-700 md:p-6 sm:p-6 text-center rounded-lg shadow-md">
                    <h2 className="md:text-2xl sm:text-xl text-gray-800 tracking-widest">Read</h2>
                    <p className='flex flex-col items-center gap-1 justify-center md:text-6xl sm:text-2xl xs:text-lg bold text-blue-100'><span className="font-extrabold text-2xl">{wordsRead}</span> <span className='text-sm text-gray-200'>Words</span></p>
                </div>
                <div className="flex flex-col bg-linear-to-b wrap-break-word from-green-500 p-2 w-50 to-green-900 md:p-6 sm:p-6 text-center rounded-lg shadow-md">
                    <h2 className="md:text-2xl sm:text-xl text-gray-800 tracking-widest">Completed</h2>
                    <p className='flex flex-col items-center gap-1 justify-center md:text-6xl sm:text-2xl xs:text-lg bold text-blue-200'><span className="font-extrabold text-2xl">{scenariosCompleted}</span> <span className='text-sm text-gray-200'>Roles</span></p>
                </div>
                <div className="flex flex-col bg-linear-to-b wrap-break-word from-orange-500 p-2 w-50 to-red-700 md:p-6 sm:p-6 text-center rounded-lg shadow-md">
                    <h2 className="md:text-2xl sm:text-xl text-gray-800 tracking-widest">Streak</h2>
                    <p className='flex flex-col items-center gap-1 justify-center md:text-6xl sm:text-2xl xs:text-lg bold text-orange-200'><span className="inline-flex items-center font-extrabold text-2xl">{streak}<FaFire className="text-2xl" /></span> <span className='text-sm text-gray-200'>Days</span> </p>
                </div>
            </div>
            {/* --- Weekly XP Chart --- */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Weekly Activity</h2>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <LineChart
                            data={weeklyXpData}
                            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4A5568' : '#E2E8F0'} />
                            <XAxis dataKey="name" stroke={theme === 'dark' ? '#A0AEC0' : '#4A5568'} />
                            <YAxis stroke={theme === 'dark' ? '#A0AEC0' : '#4A5568'} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF',
                                    borderColor: theme === 'dark' ? '#4A5568' : '#E2E8F0'
                                }}
                                labelStyle={{ color: theme === 'dark' ? '#E2E8F0' : '#1A202C' }}
                            />
                            <Line type="monotone" dataKey="xp" name="XP Gained" stroke="#DC143C" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
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

            {/* --- Danger Zone --- */}
            <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-lg shadow-sm mb-8 border border-red-100 dark:border-red-900/30">
                <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2">Danger Zone</h2>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <p className="text-gray-700 dark:text-gray-300 text-sm max-w-md">
                        Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                        onClick={() => {
                            setDeleteConfirmation('');
                            setShowDeleteModal(true);
                        }}
                        className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-lg shadow hover:bg-red-700 transition-colors w-full sm:w-auto shrink-0"
                    >
                        Delete Account
                    </button>
                </div>
            </div>

        </div>
    );
};

export default AccountPage;