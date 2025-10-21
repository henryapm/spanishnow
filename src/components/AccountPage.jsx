import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';

const AccountPage = ({ decks }) => {
    const navigate = useNavigate();
    
    // Selecting each piece of state individually to prevent infinite re-render loops.
    const currentUser = useDecksStore((state) => state.currentUser);
    const progress = useDecksStore((state) => state.progress);
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    const updateListeningPreference = useDecksStore((state) => state.updateListeningPreference);

    const handlePreferenceChange = (e) => {
        const newPreference = e.target.value;
        updateListeningPreference(newPreference); 
    };

    const stats = useMemo(() => {
        let totalCardsMastered = 0;
        let decksCompleted = 0;
        
        for (const deckId in decks) {
            const deck = decks[deckId];
            if (deck.cards && deck.cards.length > 0) {
                const deckProgress = progress[deckId] || {};
                const masteredCount = deck.cards.filter(card => (deckProgress[card.id] || 0) >= 3).length;
                totalCardsMastered += masteredCount;
                if (masteredCount === deck.cards.length) {
                    decksCompleted++;
                }
            }
        }
        return { totalCardsMastered, decksCompleted };
    }, [decks, progress]);

    const calculateProgress = (deckId, deck) => {
        if (!deck.cards || deck.cards.length === 0) return 0;
        const deckProgress = progress[deckId] || {};
        const seenCount = deck.cards.filter(card => deckProgress[card.id] !== undefined).length;
        return (seenCount / deck.cards.length) * 100;
    };

    if (!currentUser) {
        return <div className="text-center">Loading user data...</div>;
    }

    return (
        <div className="animate-fade-in">
            {/* --- Profile Section (Now Responsive) --- */}
            <div className="flex flex-col sm:flex-row items-center bg-white p-6 rounded-lg shadow-md mb-8">
                <img 
                    src={currentUser.photoURL || `https://i.pravatar.cc/150?u=${currentUser.uid}`} 
                    alt="Profile" 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mb-4 sm:mb-0 sm:mr-6"
                />
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{currentUser.displayName}</h1>
                    <p className="text-gray-500 break-all">{currentUser.email}</p>
                </div>
            </div>

            {/* --- Settings Section --- */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Settings</h2>
                <div className="flex items-center justify-between">
                    <label htmlFor="listening-preference" className="font-bold text-gray-700">Listening Accent</label>
                    <select 
                        id="listening-preference"
                        value={listeningPreference}
                        onChange={handlePreferenceChange}
                        className="p-2 border border-gray-300 rounded-md shadow-sm text-gray-700"
                    >
                        <option value="es-ES">Spain</option>
                        <option value="es-MX">Mexico</option>
                        <option value="es-US">United States</option>
                    </select>
                </div>
            </div>

            {/* --- Overall Stats Section --- */}
            <div className="grid grid-cols-2 gap-4 text-center mb-8">
                <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-3xl font-bold text-teal-600">{stats.totalCardsMastered}</p>
                    <p className="text-gray-500">Cards Mastered</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-3xl font-bold text-teal-600">{stats.decksCompleted}</p>
                    <p className="text-gray-500">Decks Completed</p>
                </div>
            </div>

            {/* --- Deck Progress Section --- */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Progress</h2>
                <div className="flex flex-col gap-3">
                    {Object.keys(decks).map(deckId => {
                        const deck = decks[deckId];
                        const progressPercentage = calculateProgress(deckId, deck);
                        return (
                            <div key={deckId} className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-gray-700">{deck.title}</span>
                                    <span className="text-sm font-semibold text-gray-600">{Math.round(progressPercentage)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                        className={`h-2.5 rounded-full ${progressPercentage === 100 ? 'bg-yellow-400' : 'bg-green-500'}`} 
                                        style={{ width: `${progressPercentage}%` }}>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
             <button onClick={() => navigate('/')} className="mt-8 text-gray-500 hover:text-gray-700 transition-colors w-full text-center">← Back to Decks</button>
        </div>
    );
};

export default AccountPage;
