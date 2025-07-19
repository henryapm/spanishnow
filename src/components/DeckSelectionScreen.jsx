import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';

const DeckSelectionScreen = ({ decks }) => {
    const navigate = useNavigate();
    
    // Selecting each piece of state individually to prevent re-render loops.
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const purchasedDeckIds = useDecksStore((state) => state.purchasedDeckIds);
    const progress = useDecksStore((state) => state.progress);

    // This function generates the list of cards that need review.
    const reviewCards = useMemo(() => {
        const cardsToReview = [];

        // --- FIX: New, simpler logic ---
        // Iterate through the user's progress data.
        for (const deckId in progress) {
            const deckData = decks[deckId];
            if (deckData && deckData.cards) {
                for (const cardId in progress[deckId]) {
                    const masteryLevel = progress[deckId][cardId];
                    
                    // A card needs review if its mastery level is 0.
                    // This means the user has seen it and marked it for review.
                    if (masteryLevel === 0) {
                        const cardData = deckData.cards.find(c => c.id === cardId);
                        if (cardData) {
                            // Add the full card data and its original deckId to the review list.
                            cardsToReview.push({ ...cardData, deckId });
                        }
                    }
                }
            }
        }
        return cardsToReview;
    }, [decks, progress]);  

    const handleDeckClick = (deckKey, deck, mode) => {
        const hasAccess = deck.isFree || isAdmin || purchasedDeckIds.includes(deckKey);
        if (hasAccess) {
            // Navigate to the correct mode (study or listen)
            const path = mode === 'listen' ? `/listen/${deckKey}` : `/decks/${deckKey}`;
            navigate(path);
        } else {
            alert("This is a premium deck. Purchase to get access!");
        }
    };

    const handleReviewClick = () => {
        if (reviewCards.length > 0) {
            navigate('/review', { state: { reviewCards } });
        } else {
            alert("Great job! You have no cards to review right now.");
        }
    };

    const calculateProgress = (deckId, deck) => {
        if (!deck.cards || deck.cards.length === 0) return 0;
        const deckProgress = progress[deckId];
        if (!deckProgress) return 0;
        const seenCount = deck.cards.filter(card => deckProgress[card.id] !== undefined).length;
        return (seenCount / deck.cards.length) * 100;
    };

    // This is a reusable component to render a list of decks for a specific mode
    const DeckList = ({ mode }) => (
        <div className="flex flex-col gap-4">
            {Object.keys(decks).map(deckKey => {
                const deck = decks[deckKey];
                const hasAccess = deck.isFree || isAdmin || purchasedDeckIds.includes(deckKey);
                const progressPercentage = calculateProgress(deckKey, deck);
                const isCompleted = progressPercentage === 100;

                return (
                    <div key={`${mode}-${deckKey}`} className="flex gap-2 items-center">
                        <button 
                            onClick={() => handleDeckClick(deckKey, deck, mode)}
                            className={`relative overflow-hidden w-full p-5 text-white rounded-lg shadow-md text-left text-lg font-semibold transition-colors flex justify-between items-center 
                                ${hasAccess 
                                    ? (isCompleted ? 'bg-teal-800 opacity-50' : 'bg-teal-600 hover:bg-teal-700') 
                                    : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                            {isCompleted && mode === 'study' && (
                                <div className="absolute top-0 left-0 bg-yellow-400 text-gray-900 text-xs font-bold px-6 py-1 transform -rotate-45 -translate-x-8 translate-y-3">
                                    COMPLETED
                                </div>
                            )}

                            <div className="flex-grow">
                                <span>{deck.title}</span>
                            </div>
                            <div className="flex items-center gap-2 pl-4">
                                {!hasAccess && <span role="img" aria-label="locked">🔒</span>}
                                {deck.isFree ? (
                                    <span className="text-xs font-bold bg-green-500 text-white px-2 py-1 rounded-full">FREE</span>
                                ) : (
                                    <span className="text-xs font-bold bg-yellow-500 text-gray-800 px-2 py-1 rounded-full">${deck.price?.toFixed(2)}</span>
                                )}
                            </div>
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => navigate(`/edit/${deckKey}`)}
                                className="p-5 bg-gray-500 text-white rounded-lg shadow-md hover:bg-gray-600 transition-colors"
                            >
                                ✏️
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    );

    return (
        <div className="text-center">
            {/* --- REVIEW SECTION --- */}
            <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-teal-800">Review Your Weak Cards</h2>
                <p className="text-gray-600 my-2">You have <span className="font-bold text-blue-600">{reviewCards.length}</span> cards below your average mastery.</p>
                <button onClick={handleReviewClick} disabled={reviewCards.length === 0} className="w-full px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                    Start Review Session
                </button>
            </div>

            {/* --- PRACTICE SECTIONS --- */}
            <div className="space-y-12">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-4 border-b-2 pb-2">Flashcard Practice</h2>
                    <DeckList mode="study" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-4 border-b-2 pb-2">Listening Practice</h2>
                    <DeckList mode="listen" />
                </div>
            </div>

            {isAdmin && (
                <div className="mt-12">
                    <button onClick={() => navigate('/create')} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                        + Add New Deck
                    </button>
                </div>
            )}
        </div>
    );
};

export default DeckSelectionScreen;
