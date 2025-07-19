import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';

const Header = () => {
    const navigate = useNavigate();
    // Get the current user and auth actions from the Zustand store
    const { currentUser, signInWithGoogle, signOutUser } = useDecksStore();

    return (
        <header className="w-full p-4 mb-4 flex justify-between items-center bg-white shadow-md rounded-lg">
            <h1 
                className="text-xl font-bold text-teal-700 cursor-pointer"
                onClick={() => navigate('/')}
            >
                Spanish Flashcards
            </h1>
            <div>
                {currentUser ? (
                    <div className="flex items-center gap-4">
                        <span className="text-gray-700 hidden sm:block">Welcome, {currentUser.displayName.split(' ')[0]}!</span>
                        {/* --- NEW: Account Button --- */}
                        <button
                            onClick={() => navigate('/account')}
                            className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 transition-colors"
                        >
                            My Account
                        </button>
                        <button 
                            onClick={signOutUser}
                            className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-sm hover:bg-red-600 transition-colors"
                        >
                            Sign Out
                        </button>
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
