import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store.js';

const Header = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null); // Ref to detect clicks outside the menu

    const currentUser = useDecksStore((state) => state.currentUser);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const signOutUser = useDecksStore((state) => state.signOutUser);
    const signInWithGoogle = useDecksStore((state) => state.signInWithGoogle);

    // Effect to close the menu if the user clicks outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const handleNavigate = (path) => {
        navigate(path);
        setIsMenuOpen(false); // Close menu after navigation
    };

    return (
        <header className="w-full p-4 mb-4 flex justify-between items-center bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <h1 
                className="text-xl font-bold text-teal-700 dark:text-teal-400 cursor-pointer"
                onClick={() => navigate('/')}
            >
                Spanish Today With Henry
            </h1>
            <div>
                {currentUser ? (
                    <div className="relative" ref={menuRef}>
                        {/* --- Dropdown Toggle Button --- */}
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                            <img 
                                src={currentUser.photoURL || `https://i.pravatar.cc/150?u=${currentUser.uid}`} 
                                alt="Profile" 
                                className="w-8 h-8 rounded-full"
                            />
                            <span className="font-semibold text-gray-700 dark:text-gray-200 hidden sm:block">{currentUser.displayName.split(' ')[0]}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {/* --- Dropdown Menu --- */}
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg py-1 z-20 border dark:border-gray-700">
                                {isAdmin && (
                                    <button
                                        onClick={() => handleNavigate('/admin')}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        Admin Panel
                                    </button>
                                )}
                                <button
                                    onClick={() => handleNavigate('/account')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    My Account
                                </button>
                                <button
                                    onClick={() => handleNavigate('/flashcards')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Flashcards
                                </button>
                                <button
                                    onClick={() => handleNavigate('/reading')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Reading Library
                                </button>
                                <button
                                    onClick={() => handleNavigate('/speak')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Speak Companion
                                </button>
                                <button
                                    onClick={() => handleNavigate('/review')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Spaced Repetition
                                </button>
                                <button
                                    onClick={() => handleNavigate('/bookings')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Book a session
                                </button>
                                <button 
                                    onClick={signOutUser}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button 
                        onClick={signInWithGoogle}
                        className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
                    >
                        Sign in with Google
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;

