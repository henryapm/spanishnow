import React from 'react';
import { useDecksStore } from '../store';

// Note: You will need to create or adapt these child components next to accept the onComplete prop
import StoryReader from './StoryReader';
import FlashcardReview from './FlashcardReview';
import AIChatPractice from './AIChatPractice';
import SessionComplete from './SessionComplete';

export default function LessonFlow() {
    const { activeSession, advanceSessionStep, endSession } = useDecksStore();

    if (!activeSession.isActive) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4">
                <p className="text-lg text-gray-700 dark:text-gray-300">No active lesson. Go back to the dashboard.</p>
                <button 
                    onClick={endSession}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Return Home
                </button>
            </div>
        );
    }

    // Helper to determine progress percentage for the top bar
    const getProgress = () => {
        switch (activeSession.step) {
            case 'reading': return 25;
            case 'review': return 50;
            case 'practice': return 75;
            case 'completed': return 100;
            default: return 0;
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-white dark:bg-gray-900 fixed inset-0 z-50">
            {/* Progress Bar Header */}
            <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <button 
                    onClick={() => {
                        if (window.confirm("Are you sure you want to quit? Your progress won't be saved.")) {
                            endSession();
                        }
                    }}
                    className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    aria-label="Quit lesson"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex-1 mx-4 max-w-2xl">
                    <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-500 ease-in-out" 
                            style={{ width: `${getProgress()}%` }}
                        ></div>
                    </div>
                </div>

                <div className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-20 text-right">
                    {activeSession.step}
                </div>
            </header>

            {/* Render Current Step */}
            <main className="flex-1 overflow-hidden relative">
                {activeSession.step === 'reading' && (
                    <StoryReader 
                        articleId={activeSession.articleId} 
                        onComplete={() => advanceSessionStep('review')} 
                    />
                )}
                
                {activeSession.step === 'review' && (
                    <FlashcardReview 
                        wordsToReview={activeSession.wordsSavedInSession}
                        onComplete={() => advanceSessionStep('practice')} 
                    />
                )}
                
                {activeSession.step === 'practice' && (
                    <AIChatPractice 
                        articleId={activeSession.articleId}
                        targetVocabulary={activeSession.wordsSavedInSession}
                        onComplete={() => advanceSessionStep('completed')} 
                    />
                )}

                {activeSession.step === 'completed' && (
                    <SessionComplete onFinish={endSession} />
                )}
            </main>
        </div>
    );
}
