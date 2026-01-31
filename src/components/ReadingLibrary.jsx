import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';
import Modal from './Modal';

const ReadingLibrary = () => {
    const navigate = useNavigate();

    const articles = useDecksStore((state) => state.articles);
    const fetchArticles = useDecksStore((state) => state.fetchArticles);
    const isLoading = useDecksStore((state) => state.isLoading);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);

    const isPremium = isAdmin || hasActiveSubscription;
    const [showLimitModal, setShowLimitModal] = useState(false);

    useEffect(() => {
        // Fetch articles when the component mounts
        fetchArticles();
    }, [fetchArticles]);

    // Handle the loading state while articles are being fetched
    if (isLoading && Object.keys(articles).length === 0) {
        return <div className="text-center dark:text-gray-300">Loading articles...</div>;
    }

    // Sort articles to ensure consistent "first 2" are free
    const articlesArray = Object.entries(articles)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => (a.title || "").localeCompare(b.title || ""));

    const handleArticleClick = (articleId, index) => {
        if (isPremium || index < 2) {
            navigate(`/reading/${articleId}`);
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
                <p>Free users can only access the first 2 articles. Upgrade to Premium to unlock the full library!</p>
            </Modal>
            <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-6 text-center">Reading Library</h1>
            
            {articlesArray.length > 0 ? (
                <div className="space-y-4">
                    {articlesArray.map((article, index) => {
                        const isLocked = !isPremium && index >= 2;
                        return (
                        <button
                            key={article.id}
                            onClick={() => handleArticleClick(article.id, index)}
                            className={`w-full text-left p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md hover:shadow-lg transition-transform ${!isLocked ? 'hover:-translate-y-1' : 'opacity-75'}`}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-semibold uppercase text-teal-500 dark:text-teal-400">{article.topic}</p>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{article.title}</h2>
                                </div>
                                {isLocked && <span className="text-2xl" role="img" aria-label="locked">🔒</span>}
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
