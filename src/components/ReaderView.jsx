import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store.js'; // Make sure this path is correct
import { LuTurtle } from "react-icons/lu";
// --- NEW: Import bookmark icons for the "save word" feature ---
import { BsBookmark, BsBookmarkFill, BsFillVolumeUpFill } from "react-icons/bs";

const ReaderView = () => {
    const { articleId } = useParams(); 
    const navigate = useNavigate();
    
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
    
    // --- NEW: Get saved words state and actions from the store ---
    const savedWords = useDecksStore((state) => state.savedWordsSet);
    const toggleSavedWord = useDecksStore((state) => state.toggleSavedWord);
    const saveWordTranslation = useDecksStore((state) => state.saveWordTranslation);
    const fetchTranslationForWord = useDecksStore((state) => state.fetchTranslationForWord);
    
    // --- UI State ---
    const [lookupResult, setLookupResult] = useState(null);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const [showTranslations, setShowTranslations] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const POPUP_WIDTH = 220; // Fixed width for popup calculations
    // --- NEW: Add an estimated height for vertical checks ---
    const POPUP_HEIGHT_ESTIMATE = 120; // Estimated height for admin popup

    // Fetch article and translations when component mounts
    useEffect(() => {
        if (articleId) {
          fetchArticleById(articleId);
        }
    }, [articleId, fetchArticleById]);

    // Fetch saved words when component mounts or user changes
    useEffect(() => {
        if (currentUser) {
            fetchSavedWords();
        }
    }, [currentUser, fetchSavedWords]);

    if (isLoading || !article) {
        return <div className="p-4">Loading article...</div>;
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

    // --- MODIFIED: Upgraded positioning logic ---
    const handleWordClick = (e, word) => {
        e.stopPropagation();
        // Clean the word to match dictionary keys
        const cleanedWordMatch = word.toLowerCase().match(/[\p{L}]+/gu);
        if (!cleanedWordMatch) return; // Not a valid word
        
        const cleanedWord = cleanedWordMatch[0];
        
        const rect = e.target.getBoundingClientRect();
        
        if (!translations.has(cleanedWord)) {
            fetchTranslationForWord(cleanedWord);
        }
        const translation = translations.get(cleanedWord) || "Loading...";
        
        // --- Smart Popup Positioning Logic ---
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const scrollY = window.scrollY;

        // --- X Axis (Horizontal) Calculation ---
        let x = rect.left;
        if (x + POPUP_WIDTH > screenWidth) {
            x = screenWidth - POPUP_WIDTH - 16; // 16px buffer
        }
        if (x < 16) {
            x = 16; // 16px buffer
        }
        
        // --- Y Axis (Vertical) Calculation ---
        let y;
        if (rect.bottom + POPUP_HEIGHT_ESTIMATE > screenHeight) {
            // Not enough space below, place it ABOVE the word
            y = rect.top + scrollY - POPUP_HEIGHT_ESTIMATE - 8;
        } else {
            // Default: place it BELOW the word
            y = rect.bottom + scrollY + 8; // 8px buffer
        }
        
        setLookupResult({ word: cleanedWord, translation: translation });
        setPopupPosition({ x, y });
        setIsEditing(false); // Reset editing state on new word click
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

    // --- NEW: Handler for the save/unsave word button ---
    const handleToggleSaveWord = (e) => {
        e.stopPropagation(); // Stop click from bubbling to the main div
        if (!lookupResult) return;
        toggleSavedWord(lookupResult.word);
    };

    // --- Component Renders ---

    // This renders the main article content
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
                    {/* --- MODIFIED: Added logic to conditionally style words for admins --- */}
                    {sentenceObj.spanish.split(' ').map((word, wIndex) => {
                        const baseClass = "cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-600 rounded transition-colors duration-150";
                        let adminClass = "";

                        // Check if admin is logged in and if word is missing translation
                        if (isAdmin && word.length > 0) {
                            const cleanedWordMatch = word.toLowerCase().match(/[\p{L}]+/gu);
                            if (cleanedWordMatch) {
                                const cleanedWord = cleanedWordMatch[0];
                                if (translations.has(cleanedWord)) {
                                    const translation = translations.get(cleanedWord);
                                    
                                    // If no translation is found, apply the admin highlight class
                                    if (!translation || translation === "No translation found.") {
                                        adminClass = "bg-red-200 dark:bg-red-700 opacity-75"; // Highlight missing words
                                    }
                                }
                            }
                        }

                        return (
                            <span 
                                key={wIndex} 
                                className={`${baseClass} ${adminClass}`}
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

    // This renders the word-click popup
    const renderPopup = () => {
        if (!lookupResult) return null;

        // Check if the current word is in the user's savedWords Set
        const isSaved = savedWords.has(lookupResult.word);
        const liveTranslation = translations.get(lookupResult.word) || lookupResult.translation;

        return (
            <div 
                style={{ top: `${popupPosition.y}px`, left: `${popupPosition.x}px` }}
                // --- MODIFIED: Changed 'fixed' to 'absolute' to scroll with the page ---
                className={`absolute w-[220px] bg-gray-800 text-white text-sm font-semibold px-4 py-3 rounded-lg shadow-lg z-50`}
                onClick={(e) => e.stopPropagation()} // Prevents popup from closing when clicking inside it
            >
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <p className="font-bold capitalize text-base">{lookupResult.word}</p>
                        <button 
                            onClick={() => handleSpeak(lookupResult.word)}
                            className="text-gray-400 hover:text-teal-400 transition-colors"
                            title="Listen"
                        >
                            <BsFillVolumeUpFill size={16} />
                        </button>
                    </div>
                    
                    {/* --- NEW: Save Word Button --- */}
                    <button 
                        onClick={handleToggleSaveWord}
                        className={`text-2xl ${isSaved ? 'text-yellow-400' : 'text-gray-400'} hover:text-yellow-300 transition-colors`}
                        title={isSaved ? "Remove from saved words" : "Save word for training"}
                    >
                        {isSaved ? <BsBookmarkFill /> : <BsBookmark />}
                    </button>
                </div>
                
                {/* Admin Editing UI */}
                {isEditing ? (
                    <div>
                        <textarea
                            className="w-full bg-gray-700 text-white rounded p-2 text-sm"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={2}
                        />
                        <button
                            onClick={handleSaveEdit}
                            className="w-full mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white font-bold"
                        >
                            Save
                        </button>
                    </div>
                ) : (
                    // Standard Translation View
                    <div>
                        <p className="font-normal">&rarr; {liveTranslation}</p>
                        {isAdmin && (
                            <button
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditText((liveTranslation === "No translation found." || liveTranslation === "Loading...") ? "" : liveTranslation);
                                }}
                                className="w-full mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold text-xs"
                            >
                                {liveTranslation === "No translation found." ? "Add" : "Edit"} Translation
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // --- Main Component Return ---
    return (
        <div className="w-full animate-fade-in" onClick={closePopup}>
            {renderPopup()}
            
            <div className="mb-4 flex justify-between items-center">
                <button onClick={() => navigate('/')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700">
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
