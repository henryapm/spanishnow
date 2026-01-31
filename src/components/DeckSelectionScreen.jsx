import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';
import ReadingLibrary from './ReadingLibrary';
import Modal from './Modal';
import SpeakCompanion from './SpeakCompanion';
import Review from './Review';

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

const DeckSelectionScreen = ({ decks }) => {
    const navigate = useNavigate();
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [limitModalMessage, setLimitModalMessage] = useState('');
    
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);
    const progress = useDecksStore((state) => state.progress);
    const currentUser = useDecksStore((state) => state.currentUser);
    const checkAndRecordDailyAccess = useDecksStore((state) => state.checkAndRecordDailyAccess);
    const savedWordsList = useDecksStore((state) => state.savedWordsList);
    const fetchSavedWords = useDecksStore((state) => state.fetchSavedWords);

    const topics = useMemo(() => groupDecksByTopic(decks), [decks]);
    const tab = useDecksStore((state) => state.tab);
    const setTab = useDecksStore((state) => state.setTab);
    // Handle navigation with specific mode
    const handleDeckClick = async (lessonCards, deck, mode) => {
        // --- Daily Limit Logic ---
        // 1. Check if the user has access (free deck OR admin OR subscription)
        // 2. If it's a paid deck and user is NOT admin/subscribed, perform daily check
        
        const isUserPremium = isAdmin || hasActiveSubscription;

        if (isUserPremium) {
            // Unrestricted access
             navigate('/lesson', { state: { lessonCards, deckId: deck.id, mode } });
        } else {
             // It's a paid deck and user is free tier
             // Check if they can use their "one free per day" token
             const canAccessToday = await checkAndRecordDailyAccess(deck.id);
             
             if (canAccessToday) {
                 navigate('/lesson', { state: { lessonCards, deckId: deck.id, mode } });
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

    // Fetch saved words when entering review tab
    useEffect(() => {
        if (tab === 'review' && currentUser) {
            fetchSavedWords();
        }
    }, [tab, currentUser, fetchSavedWords]);

    

    return (
        <div className="w-full animate-fade-in pb-24">
            <Modal 
                isOpen={showLimitModal} 
                onClose={() => setShowLimitModal(false)} 
                title="Daily Limit Reached 🔒"
            >
                <p>{limitModalMessage}</p>
            </Modal>

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
            </div>

            {tab === 'reading' && <ReadingLibrary />}

            {tab === 'review' && <Review />}

            {tab === 'speak' && <SpeakCompanion />}
            
            {tab === 'lessons' && (
                <div className="text-center">
                    <div className="space-y-8">
                        {Object.keys(topics).map(topicName => {
                            const topicDecks = topics[topicName];
                            if (!topicDecks || topicDecks.length === 0) return null;

                            const isTopicPremium = !topicDecks[0].isFree;
                            
                            return (
                                <div key={topicName} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                    <h2 className="text-2xl font-bold text-teal-700 dark:text-teal-400 capitalize mb-6 flex justify-between items-center">
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
                                            const score = calculateScore(lessonCards, deck.id);
                                            
                                            // Determine if content is premium (for visual indicator only)
                                            const isContentLocked = !hasAccess; 

                                            return (
                                                <div 
                                                    key={deck.id}
                                                    className="border-2 rounded-xl p-4 transition-all border-gray-200 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-700"
                                                >
                                                    {/* Header: Title & Score */}
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                                                            {deck.title}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            {isContentLocked ? (
                                                                 <span role="img" aria-label="premium" title="Premium Deck">💎</span>
                                                            ) : (
                                                                <span className={`text-sm font-bold px-2 py-1 rounded ${score === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                    Score: {score}/100
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons Row */}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {/* 1. Flashcards (Learn) */}
                                                        <button
                                                            onClick={() => handleDeckClick(lessonCards, deck, 'flashcards')}
                                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-teal-50 dark:bg-gray-600 hover:bg-teal-100 dark:hover:bg-gray-500 transition-colors"
                                                        >
                                                            <span className="text-xl mb-1">📖</span>
                                                            <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">Learn</span>
                                                        </button>

                                                        {/* 2. Practice (Quizzes) */}
                                                        <button
                                                            onClick={() => handleDeckClick(lessonCards, deck, 'practice')}
                                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-indigo-50 dark:bg-gray-600 hover:bg-indigo-100 dark:hover:bg-gray-500 transition-colors"
                                                        >
                                                            <span className="text-xl mb-1">🏋️</span>
                                                            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Practice</span>
                                                        </button>

                                                        {/* 3. Test (Scored) */}
                                                        <button
                                                            onClick={() => handleDeckClick(lessonCards, deck, 'test')}
                                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50 dark:bg-gray-600 hover:bg-orange-100 dark:hover:bg-gray-500 transition-colors"
                                                        >
                                                            <span className="text-xl mb-1">📝</span>
                                                            <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Test</span>
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
            )}
        </div>
    );
};

export default DeckSelectionScreen;