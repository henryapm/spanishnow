import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';

// Helper function to group decks by topic
const groupDecksByTopic = (decks) => {
    const topics = {};
    for (const deckId in decks) {
        const deck = decks[deckId];
        // Default to 'General' if a topic isn't specified
        const topic = deck.topic || 'General'; 
        if (!topics[topic]) {
            topics[topic] = [];
        }
        // Sort decks by level within the topic
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
            navigate('/lesson', { state: { lessonCards } });
        } else {
            alert("This is a premium topic. Subscribe to get access!");
        }
    };

    return (
        <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-8">Choose a Topic to Learn</h1>

            <div className="space-y-8">
                {Object.keys(topics).map(topicName => {
                    const topicDecks = topics[topicName];
                    const isTopicPremium = !topicDecks[0].isFree;
                    const hasAccess = !isTopicPremium || isAdmin || hasActiveSubscription;
                    
                    let nextLessonFound = false;

                    return (
                        <div key={topicName} className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-2xl font-bold text-teal-700 capitalize mb-4 flex justify-between items-center">
                                {topicName}
                                {isTopicPremium && (
                                    <span className="text-xs font-bold bg-purple-600 text-white px-2 py-1 rounded-full">PREMIUM</span>
                                )}
                            </h2>
                            <div className="flex flex-col gap-3">
                                {topicDecks.map(deck => {
                                    const lessons = chunkArray(deck.cards, 3);
                                    return lessons.map((lessonCards, index) => {
                                        // --- CORRECTED COMPLETION LOGIC ---
                                        // A lesson is only completed if every card has a mastery level of 1 or higher.
                                        const isLessonCompleted = lessonCards.every(card => (progress[deck.id]?.[card.id] || 0) >= 1);
                                        
                                        let lessonStatus = 'locked'; // Default status
                                        if (isLessonCompleted) {
                                            lessonStatus = 'completed';
                                        } else if (!nextLessonFound) {
                                            lessonStatus = 'next';
                                            nextLessonFound = true;
                                        }

                                        const isDisabled = (lessonStatus === 'locked' && !isAdmin) || !hasAccess;

                                        return (
                                            <button
                                                key={`${deck.id}-lesson-${index}`}
                                                onClick={() => handleLessonClick(lessonCards, deck)}
                                                disabled={isDisabled}
                                                className={`w-full text-left p-4 rounded-md transition-colors flex justify-between items-center
                                                    ${lessonStatus === 'next' && hasAccess ? 'bg-blue-100 hover:bg-blue-200 border-2 border-blue-500' : ''}
                                                    ${lessonStatus === 'completed' ? 'bg-green-50 text-gray-500' : ''}
                                                    ${isDisabled ? 'bg-gray-200 opacity-60 cursor-not-allowed' : ''}
                                                `}
                                            >
                                                <span className={`font-semibold ${lessonStatus === 'next' && hasAccess ? 'text-blue-800' : 'text-gray-800'}`}>
                                                    {deck.title} - Lesson {index + 1}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {lessonStatus === 'completed' && <span role="img" aria-label="completed">✅</span>}
                                                    {isDisabled && <span role="img" aria-label="locked">🔒</span>}
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
