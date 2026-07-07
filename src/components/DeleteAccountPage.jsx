import React from 'react';
import { Link } from 'react-router-dom';

const DeleteAccountPage = () => {
    return (
        <div className="min-h-screen w-full max-w-4xl mx-auto p-6 md:p-12 font-sans animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline mb-8 inline-block font-semibold">
                    &larr; Back to Home
                </Link>

                <h1 className="text-3xl md:text-4xl font-extrabold mb-8 text-gray-900 dark:text-white">
                    Account Data Deletion Instructions
                </h1>

                <div className="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                    <section>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated: July 2026</p>
                        <p className="mt-4">
                            At <strong>The Spanish Suite</strong> (SpanishNow), we respect your privacy and provide transparent ways for you to control and permanently delete your user profile and all associated data.
                        </p>
                    </section>

                    <section className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            1. How to Request Deletion via Email (Option 1)
                        </h2>
                        <p>
                            You may request manual deletion of your account and all associated personal data from our systems at any time. To do so:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li>Send an email to: <a href="mailto:admin@thespanishsuiteapp.com" className="text-blue-600 dark:text-blue-400 hover:underline">admin@thespanishsuiteapp.com</a>.</li>
                            <li>Use the subject line: <strong>"Account Deletion Request"</strong>.</li>
                            <li>Provide your registered email address or your user profile display name.</li>
                        </ul>
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                            Our administration team will process your request and permanently purge your database records (including study logs, XP points, and vocabulary decks) within 5 business days. You will receive a confirmation email once complete.
                        </p>
                    </section>

                    <section className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            2. Instant Account Deletion within the App (Option 2)
                        </h2>
                        <p>
                            If you are currently signed in, you can delete your account instantly yourself without waiting:
                        </p>
                        <ol className="list-decimal pl-6 mt-2 space-y-2">
                            <li>Log in to your account and navigate to your <strong>Account settings</strong> page.</li>
                            <li>Scroll down to the bottom to locate the <strong>Delete Account</strong> section.</li>
                            <li>Click the <strong>Delete Account</strong> button, type "delete" to confirm, and click <strong>Permanently Delete</strong>.</li>
                        </ol>
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                            This action immediately and irreversibly deletes your profile and all associated progress logs from our servers.
                        </p>
                    </section>

                    <section className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            3. Revoking Facebook Permissions (Optional)
                        </h2>
                        <p>
                            If you signed up or logged in using Facebook, you can also revoke our app's access to your Facebook profile by following these steps:
                        </p>
                        <ol className="list-decimal pl-6 mt-2 space-y-2">
                            <li>Go to your Facebook account's <strong>Settings & Privacy</strong> &gt; <strong>Settings</strong>.</li>
                            <li>In the left sidebar, click on <strong>Apps and Websites</strong>.</li>
                            <li>Find <strong>The Spanish Suite</strong> in the list and click the <strong>Remove</strong> button next to it.</li>
                        </ol>
                    </section>

                    <section className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            4. Contact Us for Support
                        </h2>
                        <p>
                            If you run into any issues during the deletion process or have questions regarding your data privacy rights, please reach out to us at <a href="mailto:admin@thespanishsuiteapp.com" className="text-blue-600 dark:text-blue-400 hover:underline">admin@thespanishsuiteapp.com</a>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountPage;
