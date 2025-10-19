import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';

// Helper function to group decks by topic
const groupDecksByTopic = (decks) => {
    const topics = {};
    const TOPIC_ORDER = ['greetings', 'restaurant', 'airport', 'hospital', 'soccer', 'General'];
    TOPIC_ORDER.forEach(topic => {
        if (!topics[topic]) {
           topics[topic] = [];
        }
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


const TopicManager = () => {
    const navigate = useNavigate();
    const decks = useDecksStore((state) => state.decks);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const topics = useMemo(() => groupDecksByTopic(decks), [decks]);

    // If a non-admin somehow gets to this page, show an error.
    if (!isAdmin) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">You do not have permission to view this page.</p>
                <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg">Go to Home</button>
            </div>
        );
    }

    return (
        <div className="w-full animate-fade-in">
            <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-6 text-center">Admin Panel</h1>
            
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Content Management</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={() => navigate('/create')}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors text-center"
                    >
                        + Add New Deck
                    </button>
                    <button 
                        onClick={() => navigate('/admin/create-article')}
                        className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors text-center"
                    >
                        + Add New Article
                    </button>
                    <button 
                        onClick={() => navigate('/admin/dictionary')}
                        className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors text-center"
                    >
                        + Add New Word
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {Object.keys(topics).map(topicName => {
                    if (topics[topicName].length === 0) return null;
                    return (
                        <div key={topicName} className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
                            <h3 className="text-xl font-bold capitalize text-gray-800 dark:text-gray-200 mb-3">{topicName}</h3>
                            <div className="space-y-2">
                                {topics[topicName].map(deck => (
                                    <div key={deck.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-600 rounded-md">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{deck.title}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Level: {deck.level || 1}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/edit/${deck.id}`)}
                                            className="text-sm text-blue-500 hover:underline"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TopicManager;

