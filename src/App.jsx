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

// This component is the main layout for authenticated (logged-in) users.
const AppLayout = () => {
    const { decks, isLoading } = useDecksStore();

    if (isLoading && Object.keys(decks).length === 0) {
        return <h1 className="text-4xl font-bold text-teal-800 mb-8 text-center">Loading...</h1>;
    }

    return (
        <div className="w-full max-w-2xl">
            <Header />
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
    
    // --- FIX: Use a ref to track the previous user state ---
    const prevUserRef = useRef(currentUser);
    
    useEffect(() => {
        listenForAuthChanges(); 
        fetchDecks();
    }, []);

    // This effect now correctly handles navigation ONLY on the transition from logged-out to logged-in.
    useEffect(() => {
        // Check if the user state has changed from null/undefined to a logged-in user object.
        if (!prevUserRef.current && currentUser) {
            // This is the moment the user has just logged in.
            navigate('/');
        }
        // Update the ref to the current user for the next render cycle.
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
