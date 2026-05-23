import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen w-full max-w-4xl mx-auto p-6 md:p-12 font-sans animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline mb-8 inline-block font-semibold">
                    &larr; Back to Home
                </Link>
                
                <h1 className="text-3xl md:text-4xl font-extrabold mb-8 text-gray-900 dark:text-white">Privacy Policy</h1>
                
                <div className="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Information We Collect</h2>
                        <p>When you sign in using your Google account, we collect your public profile information provided by Google, specifically your Name, Email Address, and Profile Picture.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. How We Use Your Information</h2>
                        <p>We use this information solely to create and manage your account, save your learning progress, and personalize your experience on The Spanish Suite. We will never use your email to send spam.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Data Sharing</h2>
                        <p>We do not sell, rent, or share your personal information with third parties. All data is securely stored using Google Firebase.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Account Deletion</h2>
                        <p>You have the right to request the deletion of your account and all associated data at any time by contacting us.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
