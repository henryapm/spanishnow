import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Import the store and our components
import { useDecksStore } from './store'; 
import DeckSelectionScreen from './components/DeckSelectionScreen';
import FlashcardView from './components/FlashcardView';
import DeckForm from './components/DeckForm';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import AccountPage from './components/AccountPage';
import ListeningView from './components/ListeningView';

// This component is the main layout for authenticated (logged-in) users.
const AppLayout = () => {
    const { decks, isLoading } = useDecksStore();
    const location = useLocation(); // Hook to get the current URL path

    // --- NEW LOGIC ---
    // Define the paths where the header should be hidden.
    // We use startsWith to catch dynamic paths like /decks/someId and /listen/someId.
    const hideHeaderOnPaths = ['/decks/', '/listen/', '/review'];
    const shouldHideHeader = hideHeaderOnPaths.some(path => location.pathname.startsWith(path));

    if (isLoading && Object.keys(decks).length === 0) {
        return <h1 className="text-4xl font-bold text-teal-800 mb-8 text-center">Loading...</h1>;
    }

    return (
        <div className="w-full max-w-2xl">
            {/* The Header is now rendered conditionally based on the current path */}
            {!shouldHideHeader && <Header />}
            
            {/* The main content area's styling is also adjusted for a more seamless look */}
            <main className={`w-full ${!shouldHideHeader ? 'bg-gray-50 p-6 rounded-lg shadow-inner' : ''}`}>
                <div className="w-full max-w-md mx-auto">
                    <Routes>
                        <Route path="/" element={<DeckSelectionScreen decks={decks} />} />
                        <Route path="/decks/:deckId" element={<FlashcardView decks={decks} />} />
                        <Route path="/create" element={<DeckForm decks={decks} />} />
                        <Route path="/edit/:deckId" element={<DeckForm decks={decks} />} />
                        <Route path="/review" element={<FlashcardView decks={decks} />} />
                        <Route path="/account" element={<AccountPage decks={decks} />} />
                        <Route path="/listen/:deckId" element={<ListeningView decks={decks} />} />
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
    
    useEffect(() => {
        listenForAuthChanges(); 
        fetchDecks();
    }, []);

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
