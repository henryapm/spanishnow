import React, { useEffect, useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useDecksStore } from '../store';
import { CircularProgress } from './SpeakCompanion';
import { BsCheckCircleFill } from 'react-icons/bs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaArrowCircleRight } from 'react-icons/fa';

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

    // Fetch Scenarios and Goals from Firestore
    useEffect(() => {
        fetchScenarios();
        fetchSpeakProgress();
    }, [fetchScenarios, fetchSpeakProgress]);

    useEffect(() => {
        const lastFetch = sessionStorage.getItem('articles_last_fetch');
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;

        // Fetch if we have no articles, OR if there's no fetch history, OR if 1 day has passed
        if (Object.keys(articles).length === 0 || !lastFetch || (now - parseInt(lastFetch, 10) > ONE_DAY)) {
            fetchArticles();
            sessionStorage.setItem('articles_last_fetch', now.toString());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {/* --- Profile Section --- */}
            <div className="flex flex-col sm:flex-row items-center bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md my-8">
                <img 
                    src={currentUser.photoURL || `https://i.pravatar.cc/150?u=${currentUser.uid}`} 
                    alt="Profile" 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mb-4 sm:mb-0 sm:mr-6"
                    referrerPolicy="no-referrer"
                />
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200">Hi {currentUser.displayName}!</h1>
                </div>
            </div>
            {/* --- PRUEBA --- */}
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 text-center mb-8">Your Stats</h1>
            <div className="flex flex-row gap-3  items-center align-center justify-center mb-4 ">
                <div className="flex flex-col bg-linear-to-b wrap-break-word from-yellow-500 w-50 p-2 to-red-700 md:p-6 sm:p-6 text-center rounded-lg shadow-md">
                    <h2 className="md:text-2xl sm:text-xl text-gray-800 tracking-widest">Learning</h2>
                    <p className='flex flex-col items-center gap-1 justify-center md:text-6xl sm:text-2xl xs:text-lg bold text-blue-100'><span className="font-extrabold text-2xl">{dueForReviewWords.length}</span> <span className='text-sm text-gray-200'>Words</span></p>
                </div>
                                    
                <div className="flex flex-col bg-linear-to-b wrap-break-word from-sky-500 p-2 w-50 to-blue-700 md:p-6 sm:p-6 text-center rounded-lg shadow-md">
                    <h2 className="md:text-2xl sm:text-xl text-gray-800 tracking-widest">Read</h2>
                    <p className='flex flex-col items-center gap-1 justify-center md:text-6xl sm:text-2xl xs:text-lg bold text-blue-100'><span className="font-extrabold text-2xl">{wordsRead}</span> <span className='text-sm text-gray-200'>Words</span></p>
                </div>
            </div>
            <div className="flex flex-row gap-3 items-center align-center justify-center mb-8">
                <div className="flex flex-col bg-linear-to-b wrap-break-word from-green-500 p-2 w-75 to-green-900 md:p-6 sm:p-6 text-center rounded-lg shadow-md">
                    <h2 className="md:text-2xl sm:text-xl text-gray-800 tracking-widest">Completed</h2>
                    <p className='flex flex-col items-center gap-1 justify-center md:text-6xl sm:text-2xl xs:text-lg bold text-blue-200'><span className="font-extrabold text-2xl">{scenariosCompleted}</span> <span className='text-sm text-gray-200'>Roles</span></p>
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
                            <Line type="monotone" dataKey="xp" name="XP Gained" stroke="#4F46E5" strokeWidth={2} activeDot={{ r: 8 }} />
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

        </div>
    );
};

export default AccountPage;