import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';

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

// Helper function to chunk an array into smaller arrays
const chunkArray = (array, size) => {
    const chunkedArr = [];
    for (let i = 0; i < array.length; i += size) {
        chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
};

const DeckSelectionScreen = ({ decks }) => {
    const navigate = useNavigate();
    
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);
    const progress = useDecksStore((state) => state.progress);

    const topics = useMemo(() => groupDecksByTopic(decks), [decks]);

    const handleLessonClick = (lessonCards, deck) => {
        const hasAccess = deck.isFree || isAdmin || hasActiveSubscription;
        if (hasAccess) {
            // --- FIX: Add the deckId to the navigation state ---
            // This ensures the SessionManager knows which deck the lesson belongs to.
            navigate('/lesson', { state: { lessonCards, deckId: deck.id } });
        } else {
            alert("This is a premium topic. Subscribe to get access!");
        }
    };

    let globalNextLessonFound = false;

    return (
        <div className="text-center">
            <div className="space-y-8">
                {Object.keys(topics).map(topicName => {
                    const topicDecks = topics[topicName];
                    if (!topicDecks || topicDecks.length === 0) return null;

                    const isTopicPremium = !topicDecks[0].isFree;
                    const hasAccess = !isTopicPremium || isAdmin || hasActiveSubscription;
                    
                    return (
                        <div key={topicName} className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-6 rounded-lg shadow-md">
                            <h2 className="text-2xl font-bold dark:text-teal-300 text-teal-700 capitalize mb-4 flex justify-between items-center">
                                {topicName}
                                {isTopicPremium && (
                                    <span className="text-xs font-bold bg-purple-600 text-white px-2 py-1 rounded-full">PREMIUM</span>
                                )}
                            </h2>
                            <div className="flex flex-col gap-3">
                                {topicDecks.map(deck => {
                                    const lessons = chunkArray(deck.cards, 4);
                                    return lessons.map((lessonCards, index) => {
                                        const isLessonCompleted = lessonCards.every(card => (progress[deck.id]?.[card.id] || 0) >= 1);
                                        
                                        let lessonStatus = 'locked';
                                        if (isLessonCompleted) {
                                            lessonStatus = 'completed';
                                        } else if (!globalNextLessonFound) {
                                            lessonStatus = 'next';
                                            globalNextLessonFound = true;
                                        }

                                        const isDisabled = (lessonStatus === 'locked' && !isAdmin) || !hasAccess;

                                        return (
                                            <button
                                                key={`${deck.id}-lesson-${index}`}
                                                onClick={() => handleLessonClick(lessonCards, deck)}
                                                disabled={isDisabled}
                                                className={`w-full text-left p-4 rounded-md transition-colors flex justify-between items-center
                                                    ${lessonStatus === 'next' && hasAccess ? 'bg-blue-100 dark:bg-blue-200 dark:hover:bg-blue-700 border-2 border-blue-500 hover:dark:border-blue-200 dark:text-blue-900 hover:dark:text-blue-200 cursor-pointer' : ''}
                                                    ${lessonStatus === 'completed' ? 'bg-green-50 hover:bg-green-200 text-gray-500 cursor-pointer' : ''}
                                                    ${isDisabled ? 'bg-gray-400 hover:bg-gray-100 opacity-60 cursor-not-allowed' : ''}
                                                `}
                                            >
                                                <span className={`font-semibold ${lessonStatus === 'next' && hasAccess ? '' : 'text-gray-800'}`}>
                                                    {deck.title} - Lesson {index + 1}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {lessonStatus === 'completed' && <span role="img" aria-label="completed">✅</span>}
                                                </div>
                                            </button>
                                        )
                                    })
                                })}
                            </div>
                        </div>
                    );
                })}
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
