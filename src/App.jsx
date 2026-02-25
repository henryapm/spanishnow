import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// Import the store and our components
import { useDecksStore } from './store'; 
import Header from './components/Header';
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';

// Lazy load components to improve initial load time
const FlashcardView = lazy(() => import('./components/FlashcardView'));
const DeckForm = lazy(() => import('./components/DeckForm'));
const AccountPage = lazy(() => import('./components/AccountPage'));
const ListeningView = lazy(() => import('./components/ListeningView'));
const SessionManager = lazy(() => import('./components/SessionManager'));
const TopicManager = lazy(() => import('./components/TopicManager'));
const ArticleForm = lazy(() => import('./components/ArticleForm'));
const ReaderView = lazy(() => import('./components/ReaderView'));
const DictionaryManager = lazy(() => import('./components/DictionaryManager'));
const ReadingLibrary = lazy(() => import('./components/ReadingLibrary'));
const SpeakCompanion = lazy(() => import('./components/SpeakCompanion'));
const Booking = lazy(() => import('./components/Booking'));
const Review = lazy(() => import('./components/Review'));
const Flashcards = lazy(() => import('./components/Flashcards'));

// This component is the main layout for authenticated (logged-in) users.
const AppLayout = () => {
    const { decks, isLoading, fetchDecks, fetchUserProgress } = useDecksStore();
    const location = useLocation(); // Hook to get the current URL path

    // Define routes that require decks to be loaded
    const deckRoutes = ['/flashcards', '/create', '/review', '/account', '/listen', '/deck', '/edit', '/admin'];
    const shouldLoadDecks = deckRoutes.some(route => location.pathname.startsWith(route));

    useEffect(() => {
        if (shouldLoadDecks) {
            fetchDecks();
            fetchUserProgress(); // Lazy load progress only when needed
        }
    }, [shouldLoadDecks, fetchDecks, fetchUserProgress]);

    if (shouldLoadDecks && (isLoading || Object.keys(decks).length === 0)) {
        return <h1 className="text-4xl font-bold text-sky-800 mb-8 text-center">Loading...</h1>;
    }

    return (
        <div className="w-full dark:text-gray-200 max-w-2xl">
            <Header />
            <main className="w-full text-gray-800 dark:bg-gray-800 dark:text-gray-200 p-2 rounded-lg shadow-inner pb-24">
                <div className="w-full max-w-xl mx-auto">
                    <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
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
                    </Suspense>
                </div>
            </main>
            <Navigation />
        </div>
    );
};

// The main App component that controls everything
export default function App() {
    const { currentUser, listenForAuthChanges } = useDecksStore();
    const navigate = useNavigate();
    const prevUserRef = useRef(currentUser);
    const theme = useDecksStore((state) => state.theme);

    
    useEffect(() => {
        const unsubscribe = listenForAuthChanges();
        return () => {
            if (unsubscribe) unsubscribe();
        };
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
