import React, { useState, useEffect } from 'react';
import { useDecksStore } from '../store';
import { getAuth, sendEmailVerification } from 'firebase/auth';

const VerifyEmailPage = () => {
    const [cooldown, setCooldown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const currentUser = useDecksStore((state) => state.currentUser);
    const checkEmailVerification = useDecksStore((state) => state.checkEmailVerification);
    const signOutUser = useDecksStore((state) => state.signOutUser);

    // Cooldown timer logic
    useEffect(() => {
        let interval = null;
        if (cooldown > 0) {
            interval = setInterval(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        } else if (cooldown === 0 && interval) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [cooldown]);

    const handleCheckStatus = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await checkEmailVerification();
            const auth = getAuth();
            if (auth.currentUser && !auth.currentUser.emailVerified) {
                setError("Email is not verified yet. Please check your inbox and click the verification link.");
            }
        } catch (err) {
            console.error("Error reloading user:", err);
            setError("Could not verify status. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        if (cooldown > 0) return;
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const auth = getAuth();
            if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
                setMessage("Verification email has been sent successfully!");
                setCooldown(60); // 60 seconds cooldown
            } else {
                setError("No user signed in.");
            }
        } catch (err) {
            console.error("Error sending verification email:", err);
            if (err.code === 'auth/too-many-requests') {
                setError("Too many requests. Please wait a moment before trying again.");
            } else {
                setError("Failed to send verification email. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[75vh] flex flex-col items-center justify-center w-full max-w-md mx-auto p-4 md:p-6 animate-fade-in">
            {/* Logo/Title */}
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    The Spanish <span className="text-teal-600 dark:text-teal-400">Suite</span>
                </h1>
            </div>

            {/* Verification Card */}
            <div className="w-full bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-xl border border-gray-200 dark:border-gray-700">
                <div className="mb-6 text-center">
                    <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verify Your Email</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        We sent a verification link to <br />
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{currentUser?.email}</span>
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleCheckStatus}
                        disabled={loading}
                        className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white rounded-xl shadow-md transition-transform transform active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-center"
                    >
                        {loading ? 'Checking...' : "I've Verified My Email"}
                    </button>

                    <div className="text-center pt-2">
                        <button
                            onClick={handleResendEmail}
                            disabled={loading || cooldown > 0}
                            className="text-sm text-teal-600 dark:text-teal-400 hover:underline font-semibold disabled:text-gray-400 dark:disabled:text-gray-600 disabled:no-underline disabled:cursor-not-allowed"
                        >
                            {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend Verification Email'}
                        </button>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 my-4 pt-4 text-center">
                        <button
                            onClick={signOutUser}
                            className="text-sm text-red-600 dark:text-red-400 hover:underline font-semibold"
                        >
                            Log Out
                        </button>
                    </div>
                </div>

                {message && (
                    <div className="p-3 mt-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-200 dark:border-green-800 text-center font-medium">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="p-3 mt-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800 text-center font-medium">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailPage;
