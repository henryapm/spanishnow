import React, { useState, useEffect } from 'react';
import { useDecksStore } from '../store.js';
import { LuTurtle } from "react-icons/lu";
import { BsBookmark, BsBookmarkFill, BsFillVolumeUpFill } from "react-icons/bs";
import { FaInfoCircle } from 'react-icons/fa';

const StoryReader = ({ articleId, onComplete }) => {
    // --- Store Data ---
    const fetchArticleById = useDecksStore((state) => state.fetchArticleById);
    const article = useDecksStore((state) => state.articles[articleId]);
    const isLoading = useDecksStore((state) => state.isLoading);
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    const translations = useDecksStore((state) => state.activeArticleTranslations);
    const isDictionaryLoading = useDecksStore((state) => state.isDictionaryLoading);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const currentUser = useDecksStore((state) => state.currentUser);
    const fetchSavedWords = useDecksStore((state) => state.fetchSavedWords);
    
    const savedWords = useDecksStore((state) => state.savedWordsSet);
    const toggleSavedWord = useDecksStore((state) => state.toggleSavedWord);
    const saveWordTranslation = useDecksStore((state) => state.saveWordTranslation);
    const fetchTranslationForWord = useDecksStore((state) => state.fetchTranslationForWord);
    const fetchArticleTranslationsForAdmin = useDecksStore((state) => state.fetchArticleTranslationsForAdmin);
    const markArticleAsFinished = useDecksStore((state) => state.markArticleAsFinished);
    const activeSession = useDecksStore((state) => state.activeSession);
    
    // --- UI State ---
    const [lookupResult, setLookupResult] = useState(null);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const [showTranslations, setShowTranslations] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const POPUP_WIDTH = 220; 
    const POPUP_HEIGHT_ESTIMATE = 120;

    const sessionWords = activeSession?.wordsSavedInSession || [];

    useEffect(() => {
        if (articleId) {
          fetchArticleById(articleId);
        }
    }, [articleId, fetchArticleById]);

    useEffect(() => {
        if (currentUser) {
            fetchSavedWords();
        }
    }, [currentUser, fetchSavedWords]);

    useEffect(() => {
        if (article && isAdmin) {
            const fullText = article.sentences.map(s => s.spanish).join(' ');
            fetchArticleTranslationsForAdmin(fullText);
        }
    }, [article, isAdmin, fetchArticleTranslationsForAdmin]);

    if (isLoading || !article) {
        return (
            <div className="p-4 flex flex-col justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading your story...</p>
            </div>
        );
    }

    // --- Event Handlers ---
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
        const cleanedWordMatch = word.toLowerCase().match(/[\p{L}]+/gu);
        if (!cleanedWordMatch) return; 
        
        const cleanedWord = cleanedWordMatch[0];
        const rect = e.target.getBoundingClientRect();
        
        if (!translations.has(cleanedWord)) {
            fetchTranslationForWord(cleanedWord);
        }
        const translation = translations.get(cleanedWord) || "Loading...";
        
        // Smart Popup Positioning
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Adjusting Y coordinate to not use window.scrollY because we are in an overflow container
        let x = rect.left;
        if (x + POPUP_WIDTH > screenWidth) {
            x = screenWidth - POPUP_WIDTH - 16; 
        }
        if (x < 16) {
            x = 16;
        }
        
        let y;
        if (rect.bottom + POPUP_HEIGHT_ESTIMATE > screenHeight) {
            y = rect.top - POPUP_HEIGHT_ESTIMATE - 8;
        } else {
            y = rect.bottom + 8;
        }
        
        setLookupResult({ word: cleanedWord, translation: translation });
        setPopupPosition({ x, y });
        setIsEditing(false); 
        setEditText((translation === "No translation found." || translation === "Loading...") ? "" : translation);
    };

    const closePopup = () => {
        setLookupResult(null);
        setIsEditing(false);
    };

    const handleSaveEdit = (e) => {
        e.stopPropagation(); 
        if (!lookupResult) return;
        
        saveWordTranslation(lookupResult.word, editText);
        setLookupResult(prev => ({ ...prev, translation: editText }));
        setIsEditing(false);
    };

    // --- Component Renders ---
    const renderedContent = (article.sentences || []).map((sentenceObj, sIndex) => (
        <div key={sIndex}>
            <div className="flex gap-4 items-start">
                <div className="flex flex-col items-center">
                    <button 
                        onClick={() => handleSpeak(sentenceObj.spanish)}
                        className="mt-1 text-gray-400 hover:text-blue-500 transition-colors"
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
                    {sentenceObj.spanish.split(' ').map((word, wIndex) => {
                        const cleanedWordMatch = word.toLowerCase().match(/[\p{L}]+/gu);
                        const cleanedWord = cleanedWordMatch ? cleanedWordMatch[0] : "";
                        const isSessionWord = sessionWords.includes(cleanedWord);
                        const baseClass = `cursor-pointer rounded transition-colors duration-150 ${isSessionWord ? 'bg-yellow-300 dark:bg-yellow-700 text-gray-900 dark:text-white font-medium hover:bg-yellow-400 dark:hover:bg-yellow-600' : 'hover:bg-yellow-200 dark:hover:bg-yellow-600'}`;
                        return (
                            <span 
                                key={wIndex} 
                                className={baseClass}
                                onClick={(e) => handleWordClick(e, word)}
                            >
                                {word}{' '}
                            </span>
                        );
                    })}
                </p>
            </div>
            {showTranslations && (
                <p className="leading-loose text-blue-600 dark:text-blue-400 mt-2 italic pl-10">
                    &rarr; {sentenceObj.english}
                </p>
            )}
        </div>
    ));

    const renderPopup = () => {
        if (!lookupResult) return null;

        const isSaved = savedWords.has(lookupResult.word);
        const liveTranslation = translations.get(lookupResult.word) || lookupResult.translation;

        return (
            <div 
                style={{ top: `${popupPosition.y}px`, left: `${popupPosition.x}px` }}
                className={`fixed w-55 bg-gray-800 text-white text-sm font-semibold px-4 py-3 rounded-lg shadow-lg z-50`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <p className="font-bold capitalize text-base">{lookupResult.word}</p>
                        <button onClick={() => handleSpeak(lookupResult.word)} className="text-gray-400 hover:text-blue-400"><BsFillVolumeUpFill size={16} /></button>
                    </div>
                    <button 
                        onClick={(e) => { 
                                e.stopPropagation(); 
                                if (!isSaved && sessionWords.length >= 10) {
                                    alert("You can only save up to 10 words per session to keep your practice concise.");
                                    return;
                                }
                                toggleSavedWord(lookupResult.word, { translation: liveTranslation, source: `Lesson (${article.title})` })
                        }}
                        className={`text-2xl ${isSaved ? 'text-yellow-400' : 'text-gray-400'} hover:text-yellow-300 transition-colors`}
                    >
                        {isSaved ? <BsBookmarkFill /> : <BsBookmark />}
                    </button>
                </div>
                
                <div>
                    <p className="font-normal">&rarr; {liveTranslation}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full overflow-y-auto p-6 pb-24 animate-fade-in bg-white dark:bg-gray-900" onClick={closePopup}>
            {renderPopup()}
            <div className="max-w-xl m-auto bg-gray-700 p-5 rounded-lg shadow-lg mb-8">
                <div className="flex items-center justify-between text-center text-md color-gray-100 dark:text-gray-800 mb-5 bg-amber-900 dark:bg-amber-100 p-3 rounded">
                    <span><FaInfoCircle /></span>
                    <p className="italic">Click on any word to see its translation and save it for later review </p>
                    <span>
                        <BsBookmark />
                    </span>
                </div>
                    <div className="mb-3 max-w-2xl mx-auto">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{article.title}</h1>
                    </div>
                <div className="mb-4 flex justify-between items-center max-w-2xl mx-auto">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                            {sessionWords.length}/10 Words
                        </span>
                        <button onClick={() => setShowTranslations(!showTranslations)} className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            {showTranslations ? 'Hide translations' : 'Show translations'}
                        </button>
                    </div>
                </div>
                
                <div className="text-lg text-gray-700 dark:text-gray-200 space-y-6 max-w-2xl mx-auto">
                    {isDictionaryLoading ? <p>Loading...</p> : renderedContent}
                </div>
                <div className="mt-12 flex justify-center pb-12">
                    <button onClick={async () => { await markArticleAsFinished(articleId); onComplete(); }} className="px-10 py-4 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105 flex items-center gap-2">
                        Continue to Review ➔
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoryReader;