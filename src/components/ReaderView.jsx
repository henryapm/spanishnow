import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store.js'; // Make sure this path is correct
import { LuTurtle } from "react-icons/lu";

const ReaderView = () => {
    const { articleId } = useParams(); 
    const navigate = useNavigate();
    
    // Get data and actions from the store
    const fetchArticleById = useDecksStore((state) => state.fetchArticleById);
    const article = useDecksStore((state) => state.articles[state.articleId] || state.articles[articleId]);
    const translations = useDecksStore((state) => state.activeArticleTranslations);
    const isLoading = useDecksStore((state) => state.isLoading);
    const isDictionaryLoading = useDecksStore((state) => state.isDictionaryLoading);
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const saveWordTranslation = useDecksStore((state) => state.saveWordTranslation);
    
    // State for UI features
    const [lookupResult, setLookupResult] = useState(null);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const [showTranslations, setShowTranslations] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        if (articleId) {
          fetchArticleById(articleId);
        }
    }, [articleId, fetchArticleById]);

    if (isLoading || !article) {
        return <div className="text-center p-8">Loading article...</div>;
    }

    const handleSpeak = (textToSpeak, rate = 1.0) => {
        if (!textToSpeak || !window.speechSynthesis) return;
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = listeningPreference;
        utterance.rate = rate;
        window.speechSynthesis.speak(utterance);
    };

    const handleWordClick = (e, word) => {
        e.stopPropagation();
        closePopup(); // Close any existing popup first
        const cleanedWord = word.toLowerCase().replace(/[¿?¡!.,]/g, '');
        if (!cleanedWord) return; // Don't do anything for empty strings

        const translation = translations.get(cleanedWord);

        const rect = e.target.getBoundingClientRect();
        const POPUP_WIDTH = 220;
        const PADDING = 16;
        let x = rect.left;
        let y = rect.bottom + 8;

        if (x + POPUP_WIDTH > window.innerWidth) {
            x = rect.right - POPUP_WIDTH;
        }
        if (x < 0) {
            x = PADDING;
        }

        setPopupPosition({ x, y });
        setLookupResult({ word: cleanedWord, translation: translation });
        setEditText(translation || '');
        
        // If admin clicks a word with no translation, go straight to edit mode
        if (isAdmin && !translation) {
            setIsEditing(true);
        }
    };

    const closePopup = () => {
        setLookupResult(null);
        setIsEditing(false);
        setEditText('');
    };

    const handleSaveTranslation = () => {
        if (lookupResult) {
            saveWordTranslation(lookupResult.word, editText);
            // Optimistically update the local state for immediate feedback
            setLookupResult(prev => ({ ...prev, translation: editText }));
            setIsEditing(false);
        }
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
                            style={{ backgroundColor: translations.get(word.toLowerCase().replace(/[¿?¡!.,]/g, '')) ? 'transparent' : '#fe9380ff' }}
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
        <div className="w-full animate-fade-in p-4" onClick={closePopup}>
            {lookupResult && (
                <div 
                    style={{ top: `${popupPosition.y}px`, left: `${popupPosition.x}px` }}
                    className="fixed w-[220px] bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg z-50 flex flex-col gap-2"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside popup
                >
                    <p className="font-bold capitalize">{lookupResult.word}</p>
                    
                    {isEditing ? (
                        <>
                            <input 
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white w-full"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsEditing(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                                <button onClick={handleSaveTranslation} className="text-xs bg-teal-500 hover:bg-teal-600 text-white font-bold py-1 px-2 rounded">Save</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p>&rarr; {lookupResult.translation || <span className="italic text-gray-400">No translation found.</span>}</p>
                            {isAdmin && (
                                <button 
                                    onClick={() => setIsEditing(true)} 
                                    className="text-xs self-start mt-1 text-teal-400 hover:text-teal-300"
                                >
                                    {lookupResult.translation ? 'Edit Translation' : 'Add Translation'}
                                </button>
                            )}
                        </>
                    )}
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

