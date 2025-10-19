import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store.js';

const ArticleForm = () => {
    const navigate = useNavigate();
    const { articleId } = useParams();
    const isEditMode = Boolean(articleId);

    // We'll need to add logic to fetch a single article for editing later
    // For now, this setup works for creating new articles.
    const saveArticle = useDecksStore((state) => state.saveArticle);

    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!title.trim() || !topic.trim() || !content.trim()) {
            alert('Please fill out all fields.');
            return;
        }
        setIsSaving(true);
        const articleData = { title, topic, content };
        await saveArticle(articleData, articleId);
        setIsSaving(false);
        navigate('/admin'); // Go back to the admin panel after saving
    };

    return (
        <div className="w-full animate-fade-in">
            <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-6 text-center">
                {isEditMode ? 'Edit Article' : 'Create New Article'}
            </h1>
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md space-y-6">
                <div>
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Article Title</label>
                    <input 
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., A Trip to the Market"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
                <div>
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Topic</label>
                    <input 
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Travel Stories"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
                <div>
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Content (in Spanish)</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Start writing your article here..."
                        rows="15"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
                <div className="flex justify-between items-center">
                    <button onClick={() => navigate('/admin')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 disabled:bg-gray-400">
                        {isSaving ? 'Saving...' : 'Save Article'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArticleForm;

