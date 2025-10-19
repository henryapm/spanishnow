import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';

const ReadingLibrary = () => {
    const navigate = useNavigate();

    const articles = useDecksStore((state) => state.articles);
    const fetchArticles = useDecksStore((state) => state.fetchArticles);
    const isLoading = useDecksStore((state) => state.isLoading);

    useEffect(() => {
        // Fetch articles when the component mounts
        fetchArticles();
    }, [fetchArticles]);

    // Handle the loading state while articles are being fetched
    if (isLoading && Object.keys(articles).length === 0) {
        return <div className="text-center dark:text-gray-300">Loading articles...</div>;
    }

    const articlesArray = Object.entries(articles).map(([id, data]) => ({ id, ...data }));

    return (
        <div className="w-full animate-fade-in">
            <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-6 text-center">Reading Library</h1>
            
            {articlesArray.length > 0 ? (
                <div className="space-y-4">
                    {articlesArray.map(article => (
                        <button
                            key={article.id}
                            onClick={() => navigate(`/reading/${article.id}`)}
                            className="w-full text-left p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-1 transition-transform"
                        >
                            <p className="text-xs font-semibold uppercase text-teal-500 dark:text-teal-400">{article.topic}</p>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{article.title}</h2>
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">No articles available yet. Check back soon!</p>
            )}
        </div>
    );
};

export default ReadingLibrary;

