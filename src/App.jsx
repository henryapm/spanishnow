import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Import the store and our components
import { useDecksStore } from './store'; 
import DeckSelectionScreen from './components/DeckSelectionScreen';
import FlashcardView from './components/FlashcardView';
import DeckForm from './components/DeckForm';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import AccountPage from './components/AccountPage';
import ListeningView from './components/ListeningView';
import SessionManager from './components/SessionManager';
import TopicManager from './components/TopicManager'; // Import the new TopicManager
import { useLocation } from 'react-router-dom';

// This component is the main layout for authenticated (logged-in) users.
const AppLayout = () => {
    const { decks, isLoading } = useDecksStore();
    const location = useLocation(); // Hook to get the current URL path

    // --- FIX: Add '/lesson' to the list of paths where the header should be hidden ---
    const hideHeaderOnPaths = ['/decks/', '/listen/', '/review', '/lesson'];
    const shouldHideHeader = hideHeaderOnPaths.some(path => location.pathname.startsWith(path));

    if (isLoading && Object.keys(decks).length === 0) {
        return <h1 className="text-4xl font-bold text-teal-800 mb-8 text-center">Loading...</h1>;
    }

    return (
        <div className="w-full max-w-2xl">
            {!shouldHideHeader && <Header />}
            <main className="w-full bg-gray-50 p-6 rounded-lg shadow-inner">
                <div className="w-full max-w-md mx-auto">
                    <Routes>
                        <Route path="/" element={<DeckSelectionScreen decks={decks} />} />
                        <Route path="/decks/:deckId" element={<FlashcardView decks={decks} />} />
                        <Route path="/create" element={<DeckForm decks={decks} />} />
                        <Route path="/edit/:deckId" element={<DeckForm decks={decks} />} />
                        <Route path="/review" element={<FlashcardView decks={decks} />} />
                        <Route path="/account" element={<AccountPage decks={decks} />} />
                        <Route path="/listen/:deckId" element={<ListeningView decks={decks} />} />
                        <Route path="/lesson" element={<SessionManager />} />
                        {/* --- NEW: Admin Route --- */}
                        <Route path="/admin" element={<TopicManager decks={decks} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

// The main App component that controls everything
export default function App() {
    const { currentUser, listenForAuthChanges, fetchDecks } = useDecksStore();
    const navigate = useNavigate();
    const prevUserRef = useRef(currentUser);
    
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


    return (
        <div className="bg-gray-100 min-h-screen flex flex-col items-center justify-center font-sans p-4">
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
