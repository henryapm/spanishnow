import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
    const fetchNewsConfig = useDecksStore((state) => state.fetchNewsConfig);
    const navigate = useNavigate();
    const decks = useDecksStore((state) => state.decks);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const topics = useMemo(() => groupDecksByTopic(decks), [decks]);
    
    const usersList = useDecksStore((state) => state.usersList) || [];
    const isUsersLoading = useDecksStore((state) => state.isUsersLoading);
    const fetchAllUsers = useDecksStore((state) => state.fetchAllUsers);
    
    const newsApiFrequency = useDecksStore((state) => state.newsApiFrequency);
    const storedNewsTopic = useDecksStore((state) => state.newsTopic);

    // --- NEW: State for News API Configuration ---
    const [newsFrequency, setNewsFrequency] = useState(24);
    const [newsTopic, setNewsTopic] = useState('noticias');
    const [isSavingNews, setIsSavingNews] = useState(false);
    const [isFetchingNews, setIsFetchingNews] = useState(false);

    // Fetch configuration exactly once when the component mounts
    useEffect(() => {
        fetchNewsConfig();
    }, [fetchNewsConfig]);

    // Sync local form state when the store finishes fetching from Firestore
    useEffect(() => {
        if (newsApiFrequency !== undefined) setNewsFrequency(newsApiFrequency);
        if (storedNewsTopic) setNewsTopic(storedNewsTopic);
    }, [newsApiFrequency, storedNewsTopic]);

    useEffect(() => {
        if (isAdmin) {
            fetchAllUsers();
        }
    }, [isAdmin, fetchAllUsers]);

    const premiumUsersCount = usersList.filter(u => u.isAdmin || u.hasActiveSubscription).length;
    const freeUsersCount = usersList.length - premiumUsersCount;

    const handleManualFetch = async () => {
        setIsFetchingNews(true);
        try {
            const functions = getFunctions(getApp());
            const manualFetchNews = httpsCallable(functions, 'manualFetchNews');
            const result = await manualFetchNews({ topic: newsTopic });
            alert(result.data.message || "Fetch triggered successfully!");
        } catch (error) {
            console.error("Error triggering manual fetch:", error);
            alert("Failed to trigger fetch: " + error.message);
        } finally {
            setIsFetchingNews(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSavingNews(true);
        try {
            const db = getFirestore(getApp());
            await setDoc(doc(db, "settings", "newsApi"), {
                topic: newsTopic,
                frequency: parseInt(newsFrequency, 10)
            }, { merge: true });
            alert("News configuration saved successfully!");
        } catch (error) {
            console.error("Error saving config:", error);
            alert("Failed to save config: " + error.message);
        } finally {
            setIsSavingNews(false);
        }
    };

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
            
            {/* Users Dashboard Section */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Users Dashboard</h2>
                {isUsersLoading ? (
                    <p className="text-gray-600 dark:text-gray-400">Loading user statistics...</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg shadow">
                            <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{usersList.length}</p>
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-wide">Total Users</p>
                        </div>
                        <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-lg shadow">
                            <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">{premiumUsersCount}</p>
                            <p className="text-sm font-semibold text-purple-600 dark:text-purple-300 uppercase tracking-wide">Premium Users</p>
                        </div>
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow">
                            <p className="text-3xl font-bold text-gray-800 dark:text-gray-200">{freeUsersCount}</p>
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Free Users</p>
                        </div>
                    </div>
                )}
            </div>

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

            {/* News API Configuration Section */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">News Auto-Fetch (GNews)</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Configure how often to automatically pull Spanish news stories into the Reading Library.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Search Topic</label>
                        <input 
                            type="text" 
                            value={newsTopic} 
                            onChange={(e) => setNewsTopic(e.target.value)} 
                            className="w-full p-2 border rounded dark:bg-gray-600 dark:text-white focus:ring-2 focus:ring-custom-500 outline-none" 
                            placeholder="e.g., tecnología" 
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Fetch Frequency</label>
                        <select 
                            value={newsFrequency} 
                            onChange={(e) => setNewsFrequency(e.target.value)} 
                            className="w-full p-2 border rounded dark:bg-gray-600 dark:text-white focus:ring-2 focus:ring-custom-500 outline-none"
                        >
                            <option value="6">Every 6 Hours</option>
                            <option value="12">Every 12 Hours</option>
                            <option value="24">Daily</option>
                            <option value="168">Weekly</option>
                            <option value="0">Disabled</option>
                        </select>
                    </div>
                    <button 
                        onClick={handleSaveConfig}
                        disabled={isSavingNews}
                        className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors h-[42px] disabled:opacity-50"
                    >
                        {isSavingNews ? 'Saving...' : 'Save Config'}
                    </button>
                    <button 
                        onClick={handleManualFetch}
                        disabled={isFetchingNews}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors h-[42px] disabled:opacity-50"
                    >
                        {isFetchingNews ? 'Fetching...' : 'Test Fetch'}
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
