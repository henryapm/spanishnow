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
                        <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated: June 2026</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Information We Collect</h2>
                        <p>We collect information to provide, personalize, and improve our language learning service. This includes:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Account Credentials:</strong> When you sign in using third-party authentication services (such as Google, Microsoft Outlook, or Facebook via Firebase Authentication), we collect your public profile details, specifically your name, email address, and profile picture.</li>
                            <li><strong>Learning and Progress Data:</strong> We track and save your XP points, learning streaks, completed role-playing scenarios, lessons read, and customized flashcard decks inside our Spaced Repetition System (SRS).</li>
                            <li><strong>Chat and Voice Inputs:</strong> To power the conversation simulator ("Speak Companion"), we process the text transcripts and voice messages you submit during AI sessions.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. How We Use Your Information</h2>
                        <p>We use the collected information for the following purposes:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li>To create, manage, and verify your account.</li>
                            <li>To process your learning progress, schedule card review intervals, and save study history.</li>
                            <li>To transmit chat inputs to AI sub-processors to generate intelligent, dynamic conversational responses.</li>
                            <li>To communicate vital account alerts or system updates (we will never send spam).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Third-Party Service Providers (Sub-Processors)</h2>
                        <p>We work with trusted third-party services to securely host our data, handle billing, and perform AI translations. <strong>We do not sell, rent, or trade your personal data.</strong> The third-party services we use include:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Google Firebase:</strong> Used for secure cloud hosting, Firestore database storage, and account authentication management.</li>
                            <li><strong>Stripe:</strong> Used to manage billing and recurring premium subscription payments. Your credit card information is processed directly by Stripe on their secure servers; we do not store your raw payment details.</li>
                            <li><strong>Google Gemini AI:</strong> Used to process conversational inputs to generate educational, contextual Spanish language replies.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Data Security</h2>
                        <p>We prioritize the safety of your information. We utilize HTTPS encryption, Firebase security rules, and secure hosting protocols to prevent unauthorized access. However, please note that no internet transmission or electronic storage method is 100% secure, and we cannot guarantee absolute data security.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Data Retention, Account Deletion, and Subscriptions</h2>
                        <p>We retain your account details and progress logs for as long as your account is active.</p>
                        <p className="mt-2 font-semibold text-gray-900 dark:text-white">Account Deletion and Active Subscriptions:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You have the right to permanently delete your account and all associated study data (XP, vocabulary lists, stats) via the "Delete Account" button on your Account settings page.</li>
                            <li><strong>IMPORTANT:</strong> Deleting your account from our app does not automatically cancel recurring subscription renewals on Stripe. If you have an active premium membership, you must cancel your subscription via the "Manage Billing & Subscription" portal <strong>before</strong> deleting your account to ensure future billing ceases.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Children's Privacy</h2>
                        <p>The Service is intended for general audiences. We do not knowingly collect personal data from children under the age of 13. If you believe we have accidentally collected data from a child under 13, please contact support, and we will take immediate steps to delete the information.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">7. Changes to This Privacy Policy</h2>
                        <p>We may update this Privacy Policy from time to time. When we make updates, we will update the "Last Updated" date at the top of this page. Your continued use of the Service after changes are posted constitutes acceptance of the modified policy.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">8. Disclosures to Public Authorities and Law Enforcement</h2>
                        <p>We may disclose user personal data to public authorities or law enforcement agencies only when required by valid legal process (e.g., a subpoena, warrant, or court order). In handling such requests, we adhere to the following principles:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Legality Review:</strong> We strictly review the legality and validity of any data request received from public authorities before disclosing any user information.</li>
                            <li><strong>Challenging Unlawful Requests:</strong> We reserve the right to challenge, appeal, or limit any requests that we determine to be overbroad, unlawful, or procedurally deficient.</li>
                            <li><strong>Data Minimization:</strong> We practice data minimization, disclosing only the absolute minimum amount of personal information legally required to satisfy the request.</li>
                            <li><strong>Secure Documentation:</strong> We maintain secure, confidential logs of all legal data requests, including the legal justification, requested scopes, and our actions taken.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">9. Contact Us</h2>
                        <p>If you have any questions, concerns, or requests regarding this Privacy Policy or your data rights, please contact us at [admin@thespanishsuiteapp.com].</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
