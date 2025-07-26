import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';

// Helper function to group decks by topic (can be shared or redefined)
const groupDecksByTopic = (decks) => {
    const topics = {};
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

const TopicManager = ({ decks }) => {
    const navigate = useNavigate();
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const topics = useMemo(() => groupDecksByTopic(decks), [decks]);

    // If a non-admin somehow gets to this page, show an error.
    if (!isAdmin) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                <p className="text-gray-600 mt-2">You do not have permission to view this page.</p>
                <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg">Go to Home</button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">Content Management</h1>
            <div className="space-y-6">
                {Object.keys(topics).map(topicName => (
                    <div key={topicName} className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-bold text-teal-700 capitalize mb-4 border-b pb-2">
                            Topic: {topicName}
                        </h2>
                        <div className="flex flex-col gap-3">
                            {topics[topicName].map(deck => (
                                <div key={deck.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                    <div>
                                        <p className="font-semibold text-gray-800">{deck.title}</p>
                                        <p className="text-sm text-gray-500">Level: {deck.level || 1}</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/edit/${deck.id}`)}
                                        className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 transition-colors"
                                    >
                                        Edit
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-8 text-center">
                 <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 transition-colors">← Back to Lessons</button>
            </div>
        </div>
    );
};

export default TopicManager;
