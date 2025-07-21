import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';
import DeckList from './DeckList';

// This is the component for the review screen content
const ReviewView = ({ reviewCards, onStartReview }) => (
    <div className="text-center p-4">
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-3xl font-bold text-teal-800">Review Your Weak Cards</h2>
            <p className="text-gray-600 my-3">
                Spaced repetition is the key to mastery. This session contains all the cards you've recently marked for review.
            </p>
            <p className="text-lg text-gray-800 my-4">
                You have <span className="font-bold text-blue-600 text-xl">{reviewCards ? reviewCards.length : 0}</span> cards ready for practice.
            </p>
            <button 
                onClick={onStartReview} 
                disabled={!reviewCards || reviewCards.length === 0} 
                className="w-full px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Start Review Session
            </button>
        </div>
    </div>
);


const DeckSelectionScreen = ({ decks }) => {
    const navigate = useNavigate();
    const [activeMode, setActiveMode] = useState('study'); // 'study', 'listen', or 'review'

    const isAdmin = useDecksStore((state) => state.isAdmin);
    const progress = useDecksStore((state) => state.progress);
    // --- NEW: Get subscription status from the store ---
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);

    const reviewCards = useMemo(() => {
        const cardsToReview = [];
        if (progress) {
            for (const deckId in progress) {
                const deckData = decks[deckId];
                if (deckData && deckData.cards) {
                    for (const cardId in progress[deckId]) {
                        const masteryLevel = progress[deckId][cardId];
                        if (masteryLevel === 0) {
                            const cardData = deckData.cards.find(c => c.id === cardId);
                            if (cardData) {
                                cardsToReview.push({ ...cardData, deckId });
                            }
                        }
                    }
                }
            }
        }
        return cardsToReview;
    }, [decks, progress]);

    const handleReviewClick = () => {
        if (reviewCards && reviewCards.length > 0) {
            navigate('/review', { state: { reviewCards } });
        } else {
            alert("Great job! You have no cards to review right now.");
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* --- Main Content Area --- */}
            <div className="flex-grow overflow-y-auto px-4 pb-28">
                {activeMode === 'review' ? (
                    <ReviewView reviewCards={reviewCards} onStartReview={handleReviewClick} />
                ) : (
                    <div className="text-center p-4">
                        <h1 className="text-4xl font-bold text-gray-800 mb-4">Select a Deck</h1>
                        {/* Pass the subscription status to the DeckList component */}
                        <DeckList decks={decks} mode={activeMode} hasActiveSubscription={hasActiveSubscription} />

                        {isAdmin && (
                            <div className="mt-12">
                                <button onClick={() => navigate('/create')} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                                    + Add New Deck
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- Bottom Navigation Menu --- */}
            <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-10">
                <div className="flex justify-around max-w-md mx-auto">
                    <button 
                        onClick={() => setActiveMode('study')}
                        className={`flex-1 py-4 text-center font-bold transition-colors ${activeMode === 'study' ? 'text-teal-600 border-b-4 border-teal-600' : 'text-gray-500'}`}
                    >
                        Flashcards
                    </button>
                    <button 
                        onClick={() => setActiveMode('listen')}
                        className={`flex-1 py-4 text-center font-bold transition-colors ${activeMode === 'listen' ? 'text-teal-600 border-b-4 border-teal-600' : 'text-gray-500'}`}
                    >
                        Listening
                    </button>
                    <button 
                        onClick={() => setActiveMode('review')}
                        className={`relative flex-1 py-4 text-center font-bold transition-colors ${activeMode === 'review' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-500'}`}
                    >
                        Review
                        {reviewCards && reviewCards.length > 0 && (
                            <span className="absolute top-2 right-2 flex h-5 w-5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center">
                                    {reviewCards.length}
                                </span>
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeckSelectionScreen;
