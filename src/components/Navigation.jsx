import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaBookOpen } from 'react-icons/fa';
import { IoPersonSharp } from 'react-icons/io5';
import { PiCardsFill } from 'react-icons/pi';
import { RiBrain2Fill } from 'react-icons/ri';
import { useDecksStore } from '../store';
import { MdHome } from 'react-icons/md';

const Navigation = () => {
    const savedWordsList = useDecksStore(state => state.savedWordsList);
    // Filter words that are due for review
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const endOfToday = today.getTime();

    const dueWords = savedWordsList.filter(w => {
        if (w.stage >= 5) return false; // Mastered words are done
        if (!w.nextReviewDate) return true; // Legacy/New words are due
        return w.nextReviewDate <= endOfToday;
    });

    return (
        <nav className="fixed bottom-0 left-0 w-full bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
            <div className="max-w-2xl mx-auto flex justify-around items-center h-16">
                <NavLink 
                    to="/" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full relative ${isActive ? 'text-custom-600 dark:text-custom-400 bg-custom-50 dark:bg-gray-700/50' : 'text-gray-500 dark:text-gray-400 hover:text-custom-500 dark:hover:text-custom-300 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                    aria-label="Reading practice"
                >
                    {({ isActive }) => (
                        <>
                            {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-custom-500 dark:bg-custom-400"></div>}
                            <MdHome className="text-2xl mb-1" />
                            <span className="text-xs font-bold uppercase tracking-wider">Home</span>
                        </>
                    )}
                </NavLink>

                <NavLink 
                    to="/reading-library" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full relative ${isActive ? 'text-custom-600 dark:text-custom-400 bg-custom-50 dark:bg-gray-700/50' : 'text-gray-500 dark:text-gray-400 hover:text-custom-500 dark:hover:text-custom-300 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                    aria-label="Reading practice"
                >
                    {({ isActive }) => (
                        <>
                            {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-custom-500 dark:bg-custom-400"></div>}
                            <FaBookOpen className="text-2xl mb-1" />
                            <span className="text-xs font-bold uppercase tracking-wider">Learn</span>
                        </>
                    )}
                </NavLink>

                <NavLink 
                    to="/spaced-repetition" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full relative ${isActive ? 'text-custom-600 dark:text-custom-400 bg-custom-50 dark:bg-gray-700/50' : 'text-gray-500 dark:text-gray-400 hover:text-custom-500 dark:hover:text-custom-300 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                    aria-label="Spaced repetition review"
                >
                    {({ isActive }) => (
                        <>
                            {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-custom-500 dark:bg-custom-400"></div>}
                            <div className="relative flex flex-col items-center">
                                <RiBrain2Fill className="text-2xl mb-1" />
                                {dueWords.length > 0 && (
                                    <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 border-2 border-white dark:border-gray-800 shadow-sm leading-none">
                                        {dueWords.length}
                                    </span>
                                )}
                                <span className="text-xs font-bold uppercase tracking-wider">Deck</span>
                            </div>
                        </>
                    )}
                </NavLink>

                <NavLink 
                    to="/speakCompanion" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full relative ${isActive ? 'text-custom-600 dark:text-custom-400 bg-custom-50 dark:bg-gray-700/50' : 'text-gray-500 dark:text-gray-400 hover:text-custom-500 dark:hover:text-custom-300 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                    aria-label="Speak with AI to learn spanish"
                >
                    {({ isActive }) => (
                        <>
                            {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-custom-500 dark:bg-custom-400"></div>}
                            <IoPersonSharp className="text-2xl mb-1" />
                            <span className="text-xs font-bold uppercase tracking-wider">SandBox</span>
                        </>
                    )}
                </NavLink>

            </div>
        </nav>
    );
};

export default Navigation;