import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store.js';
import { MdCalendarToday } from 'react-icons/md';
import { FaBookOpen } from 'react-icons/fa';
import { IoPersonSharp } from 'react-icons/io5';
import { RiBrain2Fill } from 'react-icons/ri';
import { PiCardsFill } from 'react-icons/pi';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getApp } from 'firebase/app';

const Header = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null); // Ref to detect clicks outside the menu
    const [errorMessage, setErrorMessage] = useState('');

    const currentUser = useDecksStore((state) => state.currentUser);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const signOutUser = useDecksStore((state) => state.signOutUser);
    const savedWordsList = useDecksStore((state) => state.savedWordsList);
    const fetchSavedWords = useDecksStore((state) => state.fetchSavedWords);
    const theme = useDecksStore((state) => state.theme);
    const toggleTheme = useDecksStore((state) => state.toggleTheme);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);
    const isPremium = isAdmin || hasActiveSubscription;

    useEffect(() => {
        if (currentUser) {
            fetchSavedWords();
        }
    }, [currentUser, fetchSavedWords]);

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

    // Filter words that are due for review
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const endOfToday = today.getTime();

    const dueWords = savedWordsList.filter(w => {
        if (w.stage >= 5) return false; // Mastered words are done
        if (!w.nextReviewDate) return true; // Legacy/New words are due
        return w.nextReviewDate <= endOfToday;
    });

    const handleGoogleSignIn = async () => {
        setErrorMessage('');
        const auth = getAuth(getApp());
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            if (error.code === 'auth/popup-closed-by-user') {
                setErrorMessage('Sign-in cancelled.');
            } else if (error.code === 'auth/popup-blocked') {
                setErrorMessage('Popup blocked.');
            } else {
                setErrorMessage('Sign-in failed.');
            }
            setTimeout(() => setErrorMessage(''), 5000);
        }
    };

    return (
        <header className="w-full p-4 mb-4 flex justify-between items-center bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <h1 
                className="p-3 text-xl font-bold cursor-pointer text-custom-800 dark:text-custom-200"
                onClick={() => navigate('/')}
            >
                <span className='underline decoration-amber-500'>Spanish Now</span> <span className="underline decoration-sky-500">With</span> <span className='underline decoration-red-500'>Henry</span> <span className="text-xs font-normal text-gray-500 ml-1">v1.1</span>
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
                            <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-900 rounded-md shadow-lg py-1 z-20 border dark:border-gray-700">
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
                                    className="flex flex-row items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <img 
                                        src={currentUser.photoURL || `https://i.pravatar.cc/150?u=${currentUser.uid}`} 
                                        alt="Profile" 
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <span className="ml-2">My Account</span>
                                </button>
                                <button
                                    onClick={() => handleNavigate('/flashcards')}
                                    className="flex flex-row items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <PiCardsFill />
                                    <span className="ml-2">Flashcards</span>
                                </button>
                                <button
                                    onClick={() => handleNavigate('/reading')}
                                    className="flex flex-row items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <FaBookOpen />
                                    <span className="ml-2">Reading Library</span>
                                </button>
                                <button
                                    onClick={() => handleNavigate('/speak')}
                                    className="flex flex-row items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <IoPersonSharp />
                                    <span className="ml-2">Speak Companion</span>
                                </button>
                                <button
                                    onClick={() => handleNavigate('/spaced-repetition')}
                                    className="flex flex-row items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <RiBrain2Fill />
                                    <span className="ml-2">Spaced Repetition</span>
                                    <span className="ml-2 text-xs bg-teal-500 text-white px-2 py-1 rounded-full">{dueWords.length}</span>
                                </button>
                                <button
                                    onClick={() => handleNavigate('/bookings')}
                                    className="flex flex-row items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <MdCalendarToday />
                                    <span className="ml-2">Book a session</span>
                                </button>
                                <button
                                    onClick={() => { toggleTheme(); setIsMenuOpen(false); }}
                                    className="flex flex-row items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <span className="text-lg">{theme === 'dark' ? '🌙' : '☀️'}</span>
                                    <span className="ml-2">Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
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
                    <div className="flex flex-col items-end">
                        <button 
                            onClick={handleGoogleSignIn}
                            className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
                        >
                            Sign in with Google
                        </button>
                        {errorMessage && <span className="text-red-500 text-xs mt-1">{errorMessage}</span>}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
