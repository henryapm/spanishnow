import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';

const ReaderView = () => {
    const { articleId } = useParams();
    const navigate = useNavigate();

    // Get necessary data from the store
    const articles = useDecksStore((state) => state.articles);
    const fetchArticles = useDecksStore((state) => state.fetchArticles);
    
    const article = articles[articleId];

    // State to toggle the visibility of translations
    const [showTranslations, setShowTranslations] = useState(false);

    // Fetch articles if they aren't already loaded
    useEffect(() => {
        if (!article) {
            fetchArticles();
        }
    }, [article, fetchArticles]);

    if (!article) {
        return <div className="text-center dark:text-gray-300">Loading article...</div>;
    }

    return (
        <div className="w-full animate-fade-in">
            <div className="mb-4 flex justify-between items-center">
                <button onClick={() => navigate('/reading-library')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700">
                    &larr; Back to Library
                </button>
                <button 
                    onClick={() => setShowTranslations(!showTranslations)}
                    className="px-4 py-2 bg-teal-500 text-white font-semibold rounded-lg shadow-sm hover:bg-teal-600 transition-colors"
                >
                    {showTranslations ? 'Hide' : 'Show'} Translations
                </button>
            </div>
            
            <h1 className="text-4xl font-bold text-teal-800 dark:text-teal-300 mb-2">{article.title}</h1>
            <p className="text-sm font-semibold uppercase text-teal-500 dark:text-teal-400 mb-8">{article.topic}</p>
            
            {/* The main article content */}
            <div className="text-lg text-gray-700 dark:text-gray-300 space-y-6">
                {(article.sentences || []).map((sentence, index) => (
                    <div key={index}>
                        <p className="leading-loose">{sentence.spanish}</p>
                        {showTranslations && (
                            <p className="leading-loose text-blue-600 dark:text-blue-400 mt-1 italic transition-opacity duration-300">
                                &rarr; {sentence.english}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReaderView;

