import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';
import { v4 as uuidv4 } from 'uuid';

const DeckForm = ({ decks }) => {
    const { deckId } = useParams();
    const navigate = useNavigate();
    const saveDeck = useDecksStore((state) => state.saveDeck);

    const isEditMode = Boolean(deckId);
    
    // --- Form State ---
    const [title, setTitle] = useState('');
    const [cards, setCards] = useState([{ spanish: '', english: '', vocab: '', id: uuidv4() }]);
    const [isFree, setIsFree] = useState(true); // A deck is free by default
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isEditMode && decks[deckId]) {
            const initialData = decks[deckId];
            setTitle(initialData.title || '');
            // Ensure all existing cards have an ID, add one if missing
            const cardsWithIds = initialData.cards ? initialData.cards.map(card => card.id ? card : { ...card, id: uuidv4() }) : [];
            setCards(cardsWithIds.length > 0 ? cardsWithIds : [{ spanish: '', english: '', vocab: '', id: uuidv4() }]);
            // A deck is free if isFree is explicitly true. Otherwise, it's premium.
            setIsFree(initialData.isFree === true);
        } else {
            // Default for new decks is free
            setIsFree(true);
        }
    }, [deckId, decks, isEditMode]);

    const handleCardChange = (index, field, value) => {
        const newCards = [...cards];
        newCards[index][field] = value;
        setCards(newCards);
    };

    const addCardInput = () => {
        // Add a unique ID to every new card
        setCards([...cards, { spanish: '', english: '', vocab: '', id: uuidv4() }]);
    };

    const handleSave = async () => {
        if (!title.trim() || cards.some(c => !c.spanish.trim() || !c.english.trim())) {
            alert('Please fill out the deck title and at least one full card.');
            return;
        }
        setIsSaving(true);
        const deckData = {
            title,
            // Ensure all cards have an ID before saving
            cards: cards.filter(c => c.spanish.trim() && c.english.trim()).map(c => c.id ? c : { ...c, id: uuidv4() }),
            isFree, // Save the isFree status. If false, it's part of the premium subscription.
        };
        await saveDeck(deckData, deckId);
        navigate('/');
    };
    
    if (isEditMode && !decks[deckId]) {
        return <div>Loading deck data...</div>
    }

    return (
        <div className="w-full animate-fade-in">
            <h1 className="text-3xl font-bold text-teal-800 mb-6 text-center">{isEditMode ? 'Edit Deck' : 'Create New Deck'}</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <label className="block text-gray-700 text-sm font-bold mb-2">Deck Title</label>
                <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., At the Airport"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-6"
                />

                {/* --- Simplified Free vs. Premium Toggle --- */}
                <div className="bg-gray-100 p-4 rounded-lg mb-6">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="isFree"
                            checked={isFree}
                            onChange={(e) => setIsFree(e.target.checked)}
                            className="h-5 w-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <label htmlFor="isFree" className="ml-3 text-gray-700 font-bold">
                            This is a Free Deck
                        </label>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 ml-8">If unchecked, this deck will require a premium subscription to access.</p>
                </div>


                {cards.map((card, index) => (
                    // Use the card's unique ID as the key for better performance
                    <div key={card.id} className="mb-4 p-4 border rounded-md">
                        <h3 className="font-bold mb-2">Card {index + 1}</h3>
                        <input type="text" value={card.spanish} onChange={(e) => handleCardChange(index, 'spanish', e.target.value)} placeholder="Spanish" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-2"/>
                        <input type="text" value={card.english} onChange={(e) => handleCardChange(index, 'english', e.target.value)} placeholder="English" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-2"/>
                        <input type="text" value={card.vocab} onChange={(e) => handleCardChange(index, 'vocab', e.target.value)} placeholder="Key Vocab (optional)" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"/>
                    </div>
                ))}

                <button onClick={addCardInput} className="text-blue-500 font-semibold mb-6">+ Add Another Card</button>

                <div className="flex justify-between items-center">
                    <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 disabled:bg-gray-400">
                        {isSaving ? 'Saving...' : 'Save Deck'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeckForm;
