import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store.js';
import ReadingLibrary from './ReadingLibrary.jsx';

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
    const [tab, setTab] = useState('lessons'); 
    
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);
    const progress = useDecksStore((state) => state.progress);

    const topics = useMemo(() => groupDecksByTopic(decks), [decks]);

    // Handle navigation with specific mode
    const handleDeckClick = (lessonCards, deck, mode) => {
        const hasAccess = deck.isFree || isAdmin || hasActiveSubscription;
        if (hasAccess) {
            navigate('/lesson', { state: { lessonCards, deckId: deck.id, mode } });
        } else {
            alert("This is a premium topic. Subscribe to get access!");
        }
    };

    let globalNextDeckFound = false;

    // Calculate score: (Correctly Answered Cards / Total Cards) * 100
    const calculateScore = (lessonCards, deckId) => {
        const totalCards = lessonCards.length;
        if (totalCards === 0) return 0;
        
        // Count cards with mastery >= 1
        const correctCount = lessonCards.filter(card => (progress[deckId]?.[card.id] || 0) >= 1).length;
        
        const pointsPerCard = 100 / totalCards;
        const score = Math.round(correctCount * pointsPerCard);
        return score;
    };

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
            </div>

            {tab === 'reading' ? (
                <ReadingLibrary />
            ) : (
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
                                            // Pass ALL cards to the session, no chunking
                                            const lessonCards = deck.cards || [];
                                            const score = calculateScore(lessonCards, deck.id);
                                            const isDeckCompleted = score === 100;
                                            
                                            let deckStatus = 'locked';
                                            if (isDeckCompleted) {
                                                deckStatus = 'completed';
                                            } else if (!globalNextDeckFound) {
                                                deckStatus = 'next';
                                                globalNextDeckFound = true;
                                            }

                                            // Allow access if it's the next deck, completed, or if user is admin
                                            const isLocked = deckStatus === 'locked' && !isAdmin;
                                            const isContentLocked = !hasAccess; 

                                            return (
                                                <div 
                                                    key={deck.id}
                                                    className={`border-2 rounded-xl p-4 transition-all ${
                                                        deckStatus === 'next' ? 'border-blue-500 bg-blue-50 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-600'
                                                    } ${isLocked || isContentLocked ? 'opacity-60 grayscale' : ''}`}
                                                >
                                                    {/* Header: Title & Score */}
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                                                            {deck.title}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            {isContentLocked ? (
                                                                 <span role="img" aria-label="locked">🔒</span>
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
                                                            disabled={isLocked || isContentLocked}
                                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-teal-50 dark:bg-gray-600 hover:bg-teal-100 dark:hover:bg-gray-500 transition-colors disabled:cursor-not-allowed"
                                                        >
                                                            <span className="text-xl mb-1">📖</span>
                                                            <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">Learn</span>
                                                        </button>

                                                        {/* 2. Practice (Quizzes) */}
                                                        <button
                                                            onClick={() => handleDeckClick(lessonCards, deck, 'practice')}
                                                            disabled={isLocked || isContentLocked}
                                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-indigo-50 dark:bg-gray-600 hover:bg-indigo-100 dark:hover:bg-gray-500 transition-colors disabled:cursor-not-allowed"
                                                        >
                                                            <span className="text-xl mb-1">🏋️</span>
                                                            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Practice</span>
                                                        </button>

                                                        {/* 3. Test (Scored) */}
                                                        <button
                                                            onClick={() => handleDeckClick(lessonCards, deck, 'test')}
                                                            disabled={isLocked || isContentLocked}
                                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50 dark:bg-gray-600 hover:bg-orange-100 dark:hover:bg-gray-500 transition-colors disabled:cursor-not-allowed"
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