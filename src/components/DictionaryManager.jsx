import React, { useState, useEffect } from 'react';
import { useDecksStore } from '../store.js';

const DictionaryManager = () => {
    const dictionary = useDecksStore((state) => state.dictionary);
    const fetchDictionary = useDecksStore((state) => state.fetchDictionary);
    const saveWord = useDecksStore((state) => state.saveWord);

    const [spanishWord, setSpanishWord] = useState('');
    const [englishTranslation, setEnglishTranslation] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (Object.keys(dictionary).length === 0) {
            fetchDictionary();
        }
    }, [dictionary, fetchDictionary]);

    const handleSave = async () => {
        if (!spanishWord.trim() || !englishTranslation.trim()) {
            alert('Please fill out both fields.');
            return;
        }
        setIsSaving(true);
        await saveWord({ spanish: spanishWord.toLowerCase(), translation: englishTranslation });
        setIsSaving(false);
        setSpanishWord('');
        setEnglishTranslation('');
    };

    const dictionaryArray = Object.entries(dictionary).sort(([a], [b]) => a.localeCompare(b));

    return (
        <div className="w-full animate-fade-in">
            <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-6 text-center">Dictionary Manager</h1>

            {/* Form for adding new words */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8 space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Add New Word</h2>
                <div>
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Spanish Word</label>
                    <input
                        type="text"
                        value={spanishWord}
                        onChange={(e) => setSpanishWord(e.target.value)}
                        placeholder="e.g., mesa"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
                <div>
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">English Translation</label>
                    <input
                        type="text"
                        value={englishTranslation}
                        onChange={(e) => setEnglishTranslation(e.target.value)}
                        placeholder="e.g., table"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
                <div className="text-right">
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 disabled:bg-gray-400">
                        {isSaving ? 'Saving...' : 'Save Word'}
                    </button>
                </div>
            </div>

            {/* List of existing words */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">Existing Words ({dictionaryArray.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {dictionaryArray.map(([word, translation]) => (
                        <div key={word} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-600 rounded-md">
                            <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">{word}</span>
                            <span className="text-gray-600 dark:text-gray-400">{translation}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DictionaryManager;

