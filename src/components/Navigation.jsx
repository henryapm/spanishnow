import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaBookOpen } from 'react-icons/fa';
import { IoPersonSharp } from 'react-icons/io5';
import { PiCardsFill } from 'react-icons/pi';
import { RiBrain2Fill } from 'react-icons/ri';

const Navigation = () => {
    return (
        <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
            <style>{`
                @keyframes nav-glow {
                    0%, 100% { filter: drop-shadow(0 0 0px rgba(20, 184, 166, 0)); }
                    50% { filter: drop-shadow(0 0 8px rgba(20, 184, 166, 0.8)); }
                }
                .nav-item-active {
                    animation: nav-glow 2s ease-in-out infinite;
                }
            `}</style>
            <div className="max-w-2xl mx-auto flex justify-around items-center h-16">
                <NavLink 
                    to="/" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-teal-600 dark:text-teal-400 nav-item-active' : 'text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300'}`}
                >
                    <IoPersonSharp className="text-2xl mb-1" />
                    <span className="text-xs font-medium">Speak</span>
                </NavLink>

                <NavLink 
                    to="/reading" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-teal-600 dark:text-teal-400 nav-item-active' : 'text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300'}`}
                >
                    <FaBookOpen className="text-2xl mb-1" />
                    <span className="text-xs font-medium">Library</span>
                </NavLink>

                <NavLink 
                    to="/flashcards" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-teal-600 dark:text-teal-400 nav-item-active' : 'text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300'}`}
                >
                    <PiCardsFill className="text-2xl mb-1" />
                    <span className="text-xs font-medium">Flashcards</span>
                </NavLink>
                
                <NavLink 
                    to="/spaced-repetition" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-teal-600 dark:text-teal-400 nav-item-active' : 'text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300'}`}
                >
                    <RiBrain2Fill className="text-2xl mb-1" />
                    <span className="text-xs font-medium">Spaced Repetition</span>
                </NavLink>
            </div>
        </nav>
    );
};

export default Navigation;