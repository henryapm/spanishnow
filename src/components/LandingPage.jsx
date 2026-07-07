import React, { useState } from 'react';
import { useDecksStore } from '../store';
import { FaTiktok } from 'react-icons/fa';
import { BsCheckCircleFill } from 'react-icons/bs';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    const [errorMessage, setErrorMessage] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const signInWithGoogle = useDecksStore((state) => state.signInWithGoogle);
    const signInWithFacebook = useDecksStore((state) => state.signInWithFacebook);

    const handleSignUp = async () => {
        setErrorMessage('');

        try {
            await signInWithGoogle({ isSignUpFlow: true });
        } catch (error) {
            console.error("Error signing up with Google", error);
            if (error.code === 'auth/popup-closed-by-user') {
                setErrorMessage('Sign-up was cancelled.');
            } else if (error.code === 'auth/popup-blocked') {
                setErrorMessage('Popup blocked. Please allow popups for this site.');
            } else {
                setErrorMessage('An unexpected error occurred. Please try again.');
            }
        }
    };

    const handleFacebookSignUp = async () => {
        setErrorMessage('');

        try {
            await signInWithFacebook({ isSignUpFlow: true });
        } catch (error) {
            console.error("Error signing up with Facebook", error);
            if (error.code === 'auth/popup-closed-by-user') {
                setErrorMessage('Sign-up was cancelled.');
            } else if (error.code === 'auth/popup-blocked') {
                setErrorMessage('Popup blocked. Please allow popups for this site.');
            } else {
                setErrorMessage('An unexpected error occurred. Please try again.');
            }
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto mt-4 lg:mt-10 animate-fade-in">

            <div className="flex flex-col lg:flex-row gap-8 items-start">

                {/* --- Left Column: Main Content --- */}
                <div className="flex-1 w-full space-y-8">

                    {/* Header */}
                    <div className="text-center lg:text-left">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
                            The Spanish <span className="text-teal-600 dark:text-teal-400">Suite</span>
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto lg:mx-0">
                            Unlock your Spanish potential through interactive stories, spaced repetition, and real-world AI conversations.
                        </p>
                    </div>

                    {/* Media Placeholder (Video/Image) */}
                    <div className="aspect-video w-full bg-gray-200 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 flex items-center justify-center shadow-inner overflow-hidden relative group cursor-pointer">
                        <div className="absolute inset-0 bg-linear-to-br from-teal-500/10 to-blue-600/10 group-hover:scale-105 transition-transform duration-700"></div>
                        <span className="text-gray-500 dark:text-gray-400 flex flex-col items-center relative z-10">
                            <svg className="w-16 h-16 mb-2 opacity-80 drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold tracking-wide uppercase text-sm">Welcome Video</span>
                        </span>
                    </div>

                    {/* About Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">About this platform</h2>
                        <div className="text-gray-700 dark:text-gray-300 space-y-4 leading-relaxed text-lg">
                            <p>
                                ¡Hola! My name is Henry, and I'm here to help you learn Spanish the right way. I built this app to combine the most effective language learning methods into one seamless, daily experience.
                            </p>
                            <p>
                                Instead of boring grammar drills, you'll learn through context and practice:
                            </p>
                            <ul className="space-y-4 mt-6 pb-2">
                                <li className="flex items-start">
                                    <BsCheckCircleFill className="text-teal-500 mt-1.5 mr-3 shrink-0 text-xl" />
                                    <span><strong>Reading Library:</strong> Immerse yourself in Spanish stories tailored to your level. Save words you don't know with a single click.</span>
                                </li>
                                <li className="flex items-start">
                                    <BsCheckCircleFill className="text-teal-500 mt-1.5 mr-3 shrink-0 text-xl" />
                                    <span><strong>Spaced Repetition:</strong> Review your saved vocabulary using a smart algorithm that ensures you never forget what you've learned.</span>
                                </li>
                                <li className="flex items-start">
                                    <BsCheckCircleFill className="text-teal-500 mt-1.5 mr-3 shrink-0 text-xl" />
                                    <span><strong>AI Speak Companion:</strong> Put your knowledge to the test in real-time. Practice ordering at a restaurant, booking a hotel, or chatting with a friend.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* --- Right Column: Sticky CTA Card --- */}
                <div className="w-full lg:w-96 shrink-0">
                    <div className="sticky top-8 bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-xl border border-gray-200 dark:border-gray-700">

                        <div>
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Join the Community</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Create a free account to start practicing Spanish.</p>
                            </div>

                            {/* Terms & Conditions Checkbox */}
                            <div className="flex items-center gap-3 mb-6">
                                <input
                                    type="checkbox"
                                    id="terms-checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-750 cursor-pointer mt-0.5"
                                />
                                <label htmlFor="terms-checkbox" className="text-xs text-gray-600 dark:text-gray-400 leading-normal select-none cursor-pointer">
                                    I agree to the <Link to="/terms" className="text-blue-600 dark:text-teal-400 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-blue-600 dark:text-teal-400 hover:underline">Privacy Policy</Link>
                                </label>
                            </div>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={handleSignUp}
                                    disabled={!agreedToTerms}
                                    className="flex-1 py-3.5 px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-250 dark:disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                    title="Sign Up with Google"
                                >
                                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleFacebookSignUp}
                                    disabled={!agreedToTerms}
                                    className="flex-1 py-3.5 px-4 bg-[#1877F2] hover:bg-[#166FE5] disabled:bg-gray-400 dark:disabled:bg-gray-700 text-white rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-transform transform active:scale-95 disabled:scale-100 flex items-center justify-center"
                                    title="Sign Up with Facebook"
                                >
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </button>
                            </div>

                            <div className="text-center mt-6">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Already have an account?{' '}
                                    <Link to="/login" className="text-blue-600 dark:text-teal-400 font-bold hover:underline">
                                        Log In
                                    </Link>
                                </p>
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="p-3 mt-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800 text-center font-medium">
                                {errorMessage}
                            </div>
                        )}
                        <br />
                        <a
                            href="https://www.tiktok.com/@aprendespanishtoday"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 px-4 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <FaTiktok className="text-lg" />
                            Follow on TikTok
                        </a>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="mt-16 pb-8 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>&copy; {new Date().getFullYear()} The Spanish Suite. All rights reserved.</p>
                <div className="mt-3 space-x-6">
                    <Link to="/privacy" className="hover:text-gray-800 dark:hover:text-gray-200 hover:underline transition-colors">Privacy Policy</Link>
                    <Link to="/terms" className="hover:text-gray-800 dark:hover:text-gray-200 hover:underline transition-colors">Terms of Service</Link>
                </div>
            </div>

        </div>
    );
};

export default LandingPage;