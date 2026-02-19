import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDecksStore } from "../store";
import Modal from "./Modal";
import { BsBookmarkFill } from "react-icons/bs";

const Flashcards = ({decks}) => {
    // Helper function to group decks by topic
    const groupDecksByTopic = (decks) => {
        const topics = {};
        const TOPIC_ORDER = ['greetings', 'restaurant', 'airport', 'hospital', 'soccer', 'General'];
        TOPIC_ORDER.forEach(topic => {
            topics[topic] = [];
        });
    
        for (const deckId in decks) {
            const deck = decks[deckId];
            const topic = deck.topic || 'General';
            if (!topics[topic]) {
                topics[topic] = [];
            }
            topics[topic].push({ ...deck, id: deckId });
            topics[topic].sort((a, b) => (a.level || 0) - (b.level || 0));
        }
        return topics;
    };
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [limitModalMessage, setLimitModalMessage] = useState('')
    const deckProgress = useDecksStore((state) => state.deckProgress);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);
    const checkAndRecordDailyAccess = useDecksStore((state) => state.checkAndRecordDailyAccess);
    const addCardToSRS = useDecksStore((state) => state.addCardToSRS);
        
    const topics = useMemo(() => groupDecksByTopic(decks), [decks]);
    const navigate = useNavigate();
    

    const handleDeckClick = async (lessonCards, deck, mode) => {
        // --- Daily Limit Logic ---
        // 1. Check if the user has access (free deck OR admin OR subscription)
        // 2. If it's a paid deck and user is NOT admin/subscribed, perform daily check
        
        const isUserPremium = isAdmin || hasActiveSubscription;

        if (isUserPremium) {
            // Unrestricted access
                navigate(`/deck/${deck.id}`, { state: { lessonCards, deckId: deck.id, mode } });
        } else {
                // It's a paid deck and user is free tier
                // Check if they can use their "one free per day" token
                const canAccessToday = await checkAndRecordDailyAccess(deck.id);
                
                if (canAccessToday) {
                    navigate(`/deck/${deck.id}`, { state: { lessonCards, deckId: deck.id, mode } });
                } else {
                    const now = new Date();
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const dayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
                    setLimitModalMessage(`You've reached your daily limit for premium decks! You can access a new deck on ${dayName} after 12:00 AM. Subscribe to unlock unlimited access.`);
                    setShowLimitModal(true);
                }
        }
    };

    const handleAddDeckToSRS = async (deck) => {
        if (!deck.cards || deck.cards.length === 0) return;
        if (window.confirm(`Add all ${deck.cards.length} cards from "${deck.title}" to Spaced Repetition?`)) {
            for (const card of deck.cards) {
                await addCardToSRS(card, deck.title);
            }
        }
    };

    // Calculate score: (Correctly Answered Cards / Total Cards) * 100
    const calculateScore = (lessonCards, deckId) => {
        const totalCards = lessonCards.length;
        if (totalCards === 0) return 0;
        
        // Count cards with mastery >= 1 (Assuming 1 means they got it right at least once)
        const correctCount = lessonCards.filter(card => {
            // Check for mastery in the new SRS object structure or legacy number
            const cardData = progress[deckId]?.[card.id];
            const mastery = typeof cardData === 'object' ? cardData.mastery : cardData;
            return (mastery || 0) >= 1;
        }).length;
        
        const pointsPerCard = 100 / totalCards;
        const score = Math.round(correctCount * pointsPerCard);
        return score;
    };
    return (
                <div className="text-center">
                    <Modal 
                        isOpen={showLimitModal} 
                        onClose={() => setShowLimitModal(false)} 
                        title="Daily Limit Reached 🔒"
                    >
                        <p>{limitModalMessage}</p>
                    </Modal>
                    <h1 className="text-3xl font-bold text-custom-800 dark:text-custom-500 mb-6 text-center">Flashcards</h1>
                    <div className="space-y-8">
                        {Object.keys(topics).map(topicName => {
                            const topicDecks = topics[topicName];
                            if (!topicDecks || topicDecks.length === 0) return null;

                            const isTopicPremium = !topicDecks[0].isFree;
                            
                            return (
                                <div key={topicName} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                    <h2 className="text-2xl font-bold text-custom-700 dark:text-custom-400 capitalize mb-6 flex justify-between items-center">
                                        {topicName}
                                        {isTopicPremium && (
                                            <span className="text-xs font-bold bg-purple-600 text-white px-2 py-1 rounded-full">PREMIUM</span>
                                        )}
                                    </h2>
                                    <div className="flex flex-col gap-6">
                                        {topicDecks.map(deck => {
                                            const hasAccess = deck.isFree || isAdmin || hasActiveSubscription;
                                            
                                            // Use the full deck cards (No chunks)
                                            const lessonCards = deck.cards || [];
                                            const score = deckProgress[deck.id]?.percentage || 0;
                                            
                                            // Determine if content is premium (for visual indicator only)
                                            const isContentLocked = !hasAccess; 

                                            return (
                                                <div 
                                                    key={deck.id}
                                                    className={`border-2 rounded-xl p-4 transition-all ${score === 100 ? 'border-green-500 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-600'} hover:border-custom-300 dark:hover:border-custom-700`}
                                                >
                                                    {/* Header: Title & Score */}
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                                                                {deck.title}
                                                            </span>
                                                            {score === 100 ? (
                                                                <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
                                                                    Completed
                                                                </span>
                                                            ) : score > 0 ? (
                                                                <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full dark:bg-yellow-900 dark:text-yellow-300">
                                                                    {score}%
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {/* Add Whole Deck to SRS Button */}
                                                            <button
                                                                onClick={() => handleAddDeckToSRS(deck)}
                                                                className="ml-2 p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                                                                title="Add entire deck to Spaced Repetition"
                                                            >
                                                                <BsBookmarkFill />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons Row */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {/* 1. Flashcards (Learn) */}
                                                        <button
                                                            onClick={() => handleDeckClick(lessonCards, deck, 'flashcards')}
                                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-custom-50 dark:bg-gray-600 hover:bg-custom-100 dark:hover:bg-gray-500 transition-colors"
                                                        >
                                                            <span className="text-xl mb-1">📖</span>
                                                            <span className="text-xs font-semibold text-custom-700 dark:text-custom-300">Flashcards</span>
                                                        </button>

                                                        {/* 3. Test (Scored) */}
                                                        <button
                                                            onClick={() => handleDeckClick(lessonCards, deck, 'test')}
                                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50 dark:bg-gray-600 hover:bg-orange-100 dark:hover:bg-gray-500 transition-colors"
                                                        >
                                                            <span className="text-xl mb-1">📝</span>
                                                            <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Quiz</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {isAdmin && (
                        <div className="mt-12">
                            <button onClick={() => navigate('/create-deck')} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                                + Add New Deck
                            </button>
                        </div>
                    )}
                </div>
            );
};

export default Flashcards;