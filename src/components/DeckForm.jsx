import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDecksStore } from '../store';
import { v4 as uuidv4 } from 'uuid'; // Import the UUID library

const DeckForm = ({ decks }) => {
    const { deckId } = useParams();
    const navigate = useNavigate();
    const saveDeck = useDecksStore((state) => state.saveDeck);

    const isEditMode = Boolean(deckId);
    
    // --- Form State ---
    const [title, setTitle] = useState('');
    // Add an initial ID to the first card input
    const [cards, setCards] = useState([{ spanish: '', english: '', vocab: '', id: uuidv4() }]);
    const [isFree, setIsFree] = useState(true);
    const [price, setPrice] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isEditMode && decks[deckId]) {
            const initialData = decks[deckId];
            setTitle(initialData.title || '');
            // Ensure all existing cards from the database have an ID
            const cardsWithIds = initialData.cards ? initialData.cards.map(card => card.id ? card : { ...card, id: uuidv4() }) : [];
            setCards(cardsWithIds.length > 0 ? cardsWithIds : [{ spanish: '', english: '', vocab: '', id: uuidv4() }]);
            setIsFree(initialData.isFree !== undefined ? initialData.isFree : true);
            setPrice(initialData.price || 0);
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

    const handlePriceChange = (e) => {
        const newPrice = parseFloat(e.target.value) || 0;
        setPrice(newPrice);
        if (newPrice > 0) {
            setIsFree(false);
        }
    };

    const handleFreeToggle = (e) => {
        const newIsFree = e.target.checked;
        setIsFree(newIsFree);
        if (newIsFree) {
            setPrice(0);
        }
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
            isFree,
            price: isFree ? 0 : price,
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

                {/* --- Pricing and Free Toggle --- */}
                <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg mb-6">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="isFree"
                            checked={isFree}
                            onChange={handleFreeToggle}
                            className="h-5 w-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <label htmlFor="isFree" className="ml-2 text-gray-700 font-bold">
                            Free Deck
                        </label>
                    </div>
                    <div className="flex items-center">
                        <span className="text-gray-700 font-bold mr-2">$</span>
                        <input
                            type="number"
                            value={price}
                            onChange={handlePriceChange}
                            disabled={isFree}
                            min="0"
                            step="0.01"
                            className="shadow-inner appearance-none border rounded w-24 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />
                    </div>
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
