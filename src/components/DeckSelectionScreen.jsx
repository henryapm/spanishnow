import React, { useMemo, useState, useEffect } from 'react';
import { useDecksStore } from '../store';
import Lessons from './Flashcards';
import ReadingLibrary from './ReadingLibrary';
import SpeakCompanion from './SpeakCompanion';
import Review from './Review';
import Bookings from './Booking';



const DeckSelectionScreen = ({ decks }) => {      
    const currentUser = useDecksStore((state) => state.currentUser);
    const savedWordsList = useDecksStore((state) => state.savedWordsList);
    const fetchSavedWords = useDecksStore((state) => state.fetchSavedWords);
 
    // Fetch saved words when entering review tab
    useEffect(() => {
        if (tab === 'review' && currentUser) {
            fetchSavedWords();
        }
    }, [tab, currentUser, fetchSavedWords]);

    

    return (
        <div className="w-full animate-fade-in pb-24">
            {/* --- Tab Navigation --- */}
            <div className="mb-6 flex justify-center border-b border-gray-200 dark:border-gray-600">
                <button 
                    onClick={() => setTab('lessons')}
                    className={`px-6 py-3 font-semibold ${tab === 'lessons' ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}
                >
                    Lessons
                </button>
                <button 
                    onClick={() => setTab('reading')}
                    className={`px-6 py-3 font-semibold ${tab === 'reading' ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}
                >
                    Reading
                </button>
                <button 
                    onClick={() => setTab('speak')}
                    className={`px-6 py-3 font-semibold ${tab === 'speak' ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}
                >
                    Speak
                </button>
                <button 
                    onClick={() => setTab('review')}
                    className={`px-6 py-3 font-semibold ${tab === 'review' ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}
                >
                    Review <span className="ml-2 bg-teal-500 text-white px-2 py-1 rounded-full text-sm">{savedWordsList.length}</span>
                </button>
                <button 
                    onClick={() => setTab('bookings')}
                    className={`px-6 py-3 font-semibold ${tab === 'bookings' ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}
                >
                    Bookings
                </button>
            </div>

            {tab === 'reading' && <ReadingLibrary />}

            {tab === 'review' && <Review />}

            {tab === 'speak' && <SpeakCompanion />}

            {tab === 'bookings' && <Bookings />}
            
            {tab === 'lessons' && <Lessons decks={decks} />}
        </div>
    );
};

export default DeckSelectionScreen;