import React, { useState } from 'react';
import { useDecksStore } from '../store';

const LandingPage = () => {
    const [errorMessage, setErrorMessage] = useState('');
    const signInWithGoogle = useDecksStore((state) => state.signInWithGoogle);

    const handleGoogleSignIn = async () => {
        setErrorMessage('');
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Error signing in with Google", error);
            if (error.code === 'auth/popup-closed-by-user') {
                setErrorMessage('Sign-in was cancelled.');
            } else if (error.code === 'auth/popup-blocked') {
                setErrorMessage('Popup blocked. Please allow popups for this site.');
            } else {
                setErrorMessage('Failed to sign in. Please try again.');
            }
        }
    };

    return (
        <div className="text-center animate-fade-in">
            <h1 className="text-5xl font-extrabold text-teal-800 mb-4">
                Unlock Your Spanish Potential
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
                My name is Henry, and I'm here to help you learn Spanish the right way. This app uses interactive flashcards and real-world scenarios to make learning effective and fun.
            </p>
            <div className="mb-8">
                <button 
                    onClick={handleGoogleSignIn}
                    className="px-10 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
                >
                    Sign Up with Google & Start Learning
                </button>
                {errorMessage && <p className="text-red-500 mt-2 font-semibold">{errorMessage}</p>}
            </div>
            <div className="mt-12">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Find me on TikTok!</h2>
                <p className="text-gray-600 mb-4">
                    Get daily tips, cultural insights, and fun lessons by following my journey.
                </p>
                <a 
                    href="https://www.tiktok.com/@aprendespanishtoday"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition-colors"
                >
                    Follow on TikTok
                </a>
            </div>
        </div>
    );
};

export default LandingPage;