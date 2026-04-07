import React from 'react';

export default function SessionComplete({ onFinish }) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
            <h1 className="text-5xl mb-4">🎉</h1>
            <h2 className="text-4xl font-bold text-custom-600 mb-4">Lesson Complete!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">Great job finishing today's session.</p>
            <button onClick={onFinish} className="px-8 py-3 bg-gray-800 text-white font-bold rounded-full shadow-lg hover:bg-gray-900 transition-colors">
                Return to Dashboard
            </button>
        </div>
    );
}
