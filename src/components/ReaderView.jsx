import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store.js';
import { LuTurtle } from "react-icons/lu";

const ReaderView = () => {
    const { articleId } = useParams(); 
    const navigate = useNavigate();
    const fetchArticleById = useDecksStore((state) => state.fetchArticleById);
    const article = useDecksStore((state) => state.articles[articleId]);
    const isLoading = useDecksStore((state) => state.isLoading);
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    
    // --- MODIFIED: Get the new on-demand translations Map instead of the whole dictionary ---
    const translations = useDecksStore((state) => state.activeArticleTranslations);
    // You can also get the new loading state if you want to show a spinner for translations
    const isDictionaryLoading = useDecksStore((state) => state.isDictionaryLoading);

    const [lookupResult, setLookupResult] = useState(null);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const [showTranslations, setShowTranslations] = useState(false);

    useEffect(() => {
        if (articleId) {
          fetchArticleById(articleId);
        }
    }, [articleId, fetchArticleById]);

    // --- MODIFIED: Handle the new, secondary loading state ---
    if (isLoading || !article) {
        return <div>Loading article...</div>;
    }

    const handleSpeak = (textToSpeak, rate = 1.0) => {
        if (!textToSpeak || !window.speechSynthesis) return;
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = listeningPreference;
        utterance.rate = rate;
        window.speechSynthesis.speak(utterance);
    };

    // --- MODIFIED: This function now uses the new `translations` Map ---
    const handleWordClick = (e, word) => {
        e.stopPropagation();
        const cleanedWord = word.toLowerCase().replace(/[¿?¡!.,]/g, '');
        const rect = e.target.getBoundingClientRect();
        
        // Use `translations.get()` to look up the word in our on-demand Map
        const translation = translations.get(cleanedWord);

        if (translation) {
            setLookupResult({ word: cleanedWord, translation: translation });
            setPopupPosition({ x: rect.left, y: rect.bottom });
        } else {
            setLookupResult(null); // No translation found for this word
        }
    };

    const closePopup = () => {
        setLookupResult(null);
    };

    const renderedContent = (article.sentences || []).map((sentenceObj, sIndex) => (
        <div key={sIndex}>
            <div className="flex gap-4 items-start">
                <div className="flex flex-col items-center">
                    <button 
                        onClick={() => handleSpeak(sentenceObj.spanish)}
                        className="mt-1 text-gray-400 hover:text-teal-500 transition-colors"
                        title="Read paragraph aloud"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    </button>
                    <button 
                        onClick={() => handleSpeak(sentenceObj.spanish, 0.5)}
                        className="mt-2 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Read paragraph slowly"
                    >
                        <LuTurtle />
                    </button>
                </div>
                <p className="leading-loose">
                    {sentenceObj.spanish.split(' ').map((word, wIndex) => (
                        <span 
                            key={wIndex} 
                            className="cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-600 rounded transition-colors duration-150"
                            onClick={(e) => handleWordClick(e, word)}
                        >
                            {word}{' '}
                        </span>
                    ))}
                </p>
            </div>
            {showTranslations && (
                <p className="leading-loose text-blue-600 dark:text-blue-400 mt-2 italic pl-10">
                    &rarr; {sentenceObj.english}
                </p>
            )}
        </div>
    ));

    return (
        <div className="w-full animate-fade-in" onClick={closePopup}>
            {lookupResult && (
                <div 
                    style={{ top: `${popupPosition.y}px`, left: `${popupPosition.x < 0 ? 0 : popupPosition.x}px` }}
                    className="fixed max-w-sm bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg z-50"
                >
                    <p className="font-bold capitalize">{lookupResult.word}</p>
                    <p>&rarr; {lookupResult.translation}</p>
                </div>
            )}

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
            
            <div className="text-lg text-gray-700 dark:text-gray-300 space-y-6">
                {isDictionaryLoading ? <p>Loading translations...</p> : renderedContent}
            </div>
        </div>
    );
};

export default ReaderView;
