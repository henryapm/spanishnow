import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Import the store and our components
import { useDecksStore } from './store'; 
import FlashcardView from './components/FlashcardView';
import DeckForm from './components/DeckForm';
import Header from './components/Header';
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import AccountPage from './components/AccountPage';
import ListeningView from './components/ListeningView';
import SessionManager from './components/SessionManager';
import TopicManager from './components/TopicManager'; // Import the new TopicManager
import { useLocation } from 'react-router-dom';
import ArticleForm from './components/ArticleForm';
import ReaderView from './components/ReaderView';
import DictionaryManager from './components/DictionaryManager';
import ReadingLibrary from './components/ReadingLibrary';
import SpeakCompanion from './components/SpeakCompanion';
import Booking from './components/Booking';
import Review from './components/Review';
import Flashcards from './components/Flashcards';

// This component is the main layout for authenticated (logged-in) users.
const AppLayout = () => {
    const { decks, isLoading } = useDecksStore();
    const location = useLocation(); // Hook to get the current URL path

    if (isLoading && Object.keys(decks).length === 0) {
        return <h1 className="text-4xl font-bold text-sky-800 mb-8 text-center">Loading...</h1>;
    }

    return (
        <div className="w-full dark:text-gray-200 max-w-2xl">
            <Header />
            <main className="w-full text-gray-800 dark:bg-gray-800 dark:text-gray-200 p-2 rounded-lg shadow-inner pb-24">
                <div className="w-full max-w-xl mx-auto">
                    <Routes>
                        <Route path="/" element={<SpeakCompanion/>} />
                        <Route path="/flashcards" element={<Flashcards decks={decks} />} />
                        <Route path="/create" element={<DeckForm decks={decks} />} />
                        <Route path="/review/:deckId" element={<FlashcardView />} />
                        <Route path="/spaced-repetition" element={<Review />} />
                        <Route path="/account" element={<AccountPage decks={decks} />} />
                        <Route path="/listen/:deckId" element={<ListeningView decks={decks} />} />
                        <Route path="/reading/:articleId" element={<ReaderView />} />
                        <Route path="/reading" element={<ReadingLibrary />} />
                        <Route path="/deck/:deckId" element={<SessionManager />} />
                        <Route path="/bookings" element={<Booking />} />
                        {/* --- NEW: Admin Route --- */}
                        <Route path="/admin" element={<TopicManager decks={decks} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                        <Route path="/admin/create-article" element={<ArticleForm />} />
                        <Route path="/admin/edit-article/:articleId" element={<ArticleForm />} />
                        <Route path="/edit/:deckId" element={<DeckForm decks={decks} />} />
                        <Route path="/admin/dictionary" element={<DictionaryManager />} />
                    </Routes>
                </div>
            </main>
            <Navigation />
        </div>
    );
};

// The main App component that controls everything
export default function App() {
    const { currentUser, listenForAuthChanges, fetchDecks } = useDecksStore();
    const navigate = useNavigate();
    const prevUserRef = useRef(currentUser);
    const theme = useDecksStore((state) => state.theme);

    
    useEffect(() => {
        listenForAuthChanges(); 
        fetchDecks();
    }, []);

    useEffect(() => {
        if (!prevUserRef.current && currentUser) {
            navigate('/');
        }
        prevUserRef.current = currentUser;
    }, [currentUser, navigate]);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    return (
        <div className="dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen flex flex-col items-center justify-top font-sans p-4">
            <Routes>
                {currentUser ? (
                    <Route path="/*" element={<AppLayout />} />
                ) : (
                    <Route path="*" element={<LandingPage />} />
                )}
            </Routes>
        </div>
    );
}
