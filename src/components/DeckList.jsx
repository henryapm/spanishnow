import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';

const DeckList = ({ decks, mode }) => {
    const navigate = useNavigate();
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const purchasedDeckIds = useDecksStore((state) => state.purchasedDeckIds);
    const progress = useDecksStore((state) => state.progress);

    const handleDeckClick = (deckKey, deck) => {
        const hasAccess = deck.isFree || isAdmin || purchasedDeckIds.includes(deckKey);
        if (hasAccess) {
            const path = mode === 'listen' ? `/listen/${deckKey}` : `/decks/${deckKey}`;
            navigate(path);
        } else {
            alert("This is a premium deck. Purchase to get access!");
        }
    };

    const calculateProgress = (deckId, deck) => {
        if (!deck.cards || deck.cards.length === 0) return 0;
        const deckProgress = progress[deckId];
        if (!deckProgress) return 0;
        const seenCount = deck.cards.filter(card => deckProgress[card.id] !== undefined).length;
        return (seenCount / deck.cards.length) * 100;
    };

    return (
        <div className="flex flex-col gap-4">
            {Object.keys(decks).map(deckKey => {
                const deck = decks[deckKey];
                const hasAccess = deck.isFree || isAdmin || purchasedDeckIds.includes(deckKey);
                const progressPercentage = calculateProgress(deckKey, deck);
                const isCompleted = progressPercentage === 100;

                return (
                    <div key={`${mode}-${deckKey}`} className="flex gap-2 items-center">
                        <button 
                            onClick={() => handleDeckClick(deckKey, deck)}
                            className={`relative overflow-hidden w-full p-5 text-white rounded-lg shadow-md text-left text-lg font-semibold transition-colors flex justify-between items-center 
                                ${hasAccess 
                                    ? (isCompleted && mode === 'study' ? 'bg-teal-800 opacity-80' : 'bg-teal-600 hover:bg-teal-700') 
                                    : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                            {isCompleted && mode === 'study' && (
                                <div className="absolute top-0 left-0 bg-yellow-400 text-gray-900 text-xs font-bold px-6 py-1 transform -rotate-45 -translate-x-8 translate-y-3">
                                    COMPLETED
                                </div>
                            )}

                            <div className="flex-grow">
                                <span>{deck.title}</span>
                                {hasAccess && mode === 'study' && (
                                    <div className="w-full bg-teal-900 rounded-full h-2.5 mt-2">
                                        <div 
                                            className={`h-2.5 rounded-full transition-all duration-500 ${isCompleted ? 'bg-yellow-400' : 'bg-green-400'}`} 
                                            style={{ width: `${progressPercentage}%` }}>
                                        </div>
                                    </div>
                                )}
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
};

export default DeckList;
