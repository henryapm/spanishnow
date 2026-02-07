import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';
import Modal from './Modal';
import { BsCheckCircleFill } from 'react-icons/bs';

const ReadingLibrary = () => {
    const navigate = useNavigate();

    const articles = useDecksStore((state) => state.articles);
    const fetchArticles = useDecksStore((state) => state.fetchArticles);
    const isLoading = useDecksStore((state) => state.isLoading);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);

    const isPremium = isAdmin || hasActiveSubscription;
    const [showLimitModal, setShowLimitModal] = useState(false);
    const finishedArticles = useDecksStore((state) => state.finishedArticles);

    const [sortBy, setSortBy] = useState('title');
    const [filterLevel, setFilterLevel] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        // Fetch articles when the component mounts
        fetchArticles();
    }, [fetchArticles]);

    // Handle the loading state while articles are being fetched
    if (isLoading && Object.keys(articles).length === 0) {
        return <div className="text-center dark:text-gray-300">Loading articles...</div>;
    }

    const levelOrder = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
    const getLevelValue = (level) => levelOrder[level?.toUpperCase()] || 99;

    const articlesArray = Object.entries(articles)
        .map(([id, data]) => ({ id, ...data }))
        .filter(article => filterLevel === 'All' || article.level?.toUpperCase() === filterLevel)
        .filter(article => {
            if (filterStatus === 'Free') return !article.premium;
            if (filterStatus === 'Premium') return article.premium;
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'level') {
                const diff = getLevelValue(a.level) - getLevelValue(b.level);
                if (diff !== 0) return diff;
            }
            if (sortBy === 'premium') {
                return (a.premium === b.premium) ? 0 : a.premium ? 1 : -1;
            }
            return (a.title || "").localeCompare(b.title || "");
        });

    const getLevelColor = (level) => {
        switch (level?.toUpperCase()) {
            case 'A1': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'A2': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300';
            case 'B1': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'B2': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'C1': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const handleArticleClick = (article) => {
        if (isPremium || !article.premium) {
            navigate(`/reading/${article.id}`);
        } else {
            setShowLimitModal(true);
        }
    };

    return (
        <div className="w-full animate-fade-in">
            <Modal 
                isOpen={showLimitModal} 
                onClose={() => setShowLimitModal(false)} 
                title="Premium Content 🔒"
            >
                <p>This article is only available to Premium users. Upgrade to Premium to unlock the full library!</p>
            </Modal>
            <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-6 text-center">Reading Library</h1>
            
            <div className="flex flex-wrap justify-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <label htmlFor="sort-select" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sort by:</label>
                    <select 
                        id="sort-select"
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        className="p-2 rounded-lg bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                        <option value="title">Title</option>
                        <option value="level">Level</option>
                        <option value="premium">Free/Premium</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="filter-select" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter Level:</label>
                    <select 
                        id="filter-select"
                        value={filterLevel} 
                        onChange={(e) => setFilterLevel(e.target.value)}
                        className="p-2 rounded-lg bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                        <option value="All">All</option>
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                        <option value="C1">C1</option>
                        <option value="C2">C2</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="filter-status-select" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Type:</label>
                    <select 
                        id="filter-status-select"
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="p-2 rounded-lg bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                        <option value="All">All</option>
                        <option value="Free">Free</option>
                        <option value="Premium">Premium</option>
                    </select>
                </div>
            </div>

            {articlesArray.length > 0 ? (
                <div className="space-y-4">
                    {articlesArray.map((article, index) => {
                        const isLocked = !isPremium && article.premium;
                        return (
                        <button
                            key={article.id}
                            onClick={() => handleArticleClick(article)}
                            className={`w-full text-left p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md hover:shadow-lg transition-transform ${!isLocked ? 'hover:-translate-y-1' : 'opacity-75'}`}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-semibold uppercase text-teal-500 dark:text-teal-400">{article.topic}</p>
                                    <h2 className="flex flex-col-2 items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-200">
                                        {article.title}
                                        {finishedArticles?.includes(article.id) && <span className="ml-2 text-green-500 text-lg" title="Finished"><BsCheckCircleFill /></span>}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    {article.level && (
                                        <span className={`text-md font-bold px-2 py-1 rounded-full ${getLevelColor(article.level)}`}>
                                            {article.level}
                                        </span>
                                    )}
                                    {isLocked && <span className="text-2xl" role="img" aria-label="locked">🔒</span>}
                                </div>
                            </div>
                        </button>
                    )})}
                </div>
            ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">No articles available yet. Check back soon!</p>
            )}
        </div>
    );
};

export default ReadingLibrary;
