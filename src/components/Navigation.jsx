import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaBookOpen, FaCalendarAlt } from 'react-icons/fa';
import { IoPersonSharp } from 'react-icons/io5';
import { PiCardsFill } from 'react-icons/pi';

const Navigation = () => {
    return (
        <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-xl bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
            <div className="max-w-2xl mx-auto flex justify-between items-center h-16">
                <NavLink 
                    to="/speak" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300'}`}
                >
                    <IoPersonSharp className="text-2xl mb-1" />
                    <span className="text-xs font-medium">Speak</span>
                </NavLink>

                <NavLink 
                    to="/reading" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300'}`}
                >
                    <FaBookOpen className="text-2xl mb-1" />
                    <span className="text-xs font-medium">Library</span>
                </NavLink>

                <NavLink 
                    to="/decks" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300'}`}
                >
                    <PiCardsFill className="text-2xl mb-1" />
                    <span className="text-xs font-medium">Decks</span>
                </NavLink>
                
                <NavLink 
                    to="/bookings" 
                    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300'}`}
                >
                    <FaCalendarAlt className="text-2xl mb-1" />
                    <span className="text-xs font-medium">Bookings</span>
                </NavLink>
            </div>
        </nav>
    );
};

export default Navigation;