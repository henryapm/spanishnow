import React, { useState } from 'react';
import { useDecksStore } from '../store'; // Import the store to get the listening preference
import Modal from './Modal';

// Component for a single Flashcard
const Flashcard = ({ cardData, isFlipped, onFlip }) => {
    // Get the user's listening preference from the store
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState('');

    const containerStyle = { perspective: '1000px' };
    const cardStyle = {
      transformStyle: 'preserve-3d',
      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
    };
    const faceStyle = { backfaceVisibility: 'hidden' };

    const handleShowMore = (e, text) => {
        e.stopPropagation(); // Prevent card flip
        setModalContent(text);
        setShowModal(true);
    };

    // Function to speak the Spanish sentence
    const speakSentence = (e) => {
        // Stop the click from bubbling up and flipping the card
        e.stopPropagation(); 
        
        if (!cardData || !window.speechSynthesis) return;

        // Cancel any speech that might be ongoing
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cardData.spanish);
        utterance.lang = listeningPreference; // Use the user's selected accent
        speechSynthesis.speak(utterance);
    };

    if (!cardData) {
        return <div className="w-full h-64 flex items-center justify-center bg-gray-200 rounded-xl">Loading card...</div>;
    }

    return (
        <>
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Full Text">
            <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200">{modalContent}</p>
        </Modal>
        <div style={containerStyle} className="w-full h-64 cursor-pointer" onClick={onFlip}>
            <div style={cardStyle} className="relative w-full h-full transition-transform duration-700">
                {/* Front of the card */}
                <div style={faceStyle} className="absolute w-full h-full bg-white rounded-xl shadow-lg flex flex-col justify-center items-center p-6">
                    <p className="text-3xl font-semibold text-gray-800 text-center mb-4">
                        {cardData.spanish && cardData.spanish.length > 80 ? (
                            <>
                                {cardData.spanish.substring(0, 80)}
                                <button 
                                    className="text-blue-500 hover:text-blue-700 ml-1 font-bold focus:outline-none"
                                    onClick={(e) => handleShowMore(e, cardData.spanish)}
                                >
                                    ...
                                </button>
                            </>
                        ) : (
                            cardData.spanish
                        )}
                    </p>
                    {/* --- NEW: Speak Button --- */}
                    <button 
                        onClick={speakSentence} 
                        className="p-3 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors"
                        aria-label="Listen to pronunciation"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    </button>
                </div>
                {/* Back of the card */}
                <div style={{...faceStyle, transform: 'rotateY(180deg)'}} className="absolute w-full h-full bg-teal-500 text-white rounded-xl shadow-lg flex flex-col justify-center items-center p-6">
                    <p className="text-2xl font-semibold text-center">
                        {cardData.english && cardData.english.length > 100 ? (
                            <>
                                {cardData.english.substring(0, 100)}
                                <button 
                                    className="text-teal-800 hover:text-white ml-1 font-bold focus:outline-none"
                                    onClick={(e) => handleShowMore(e, cardData.english)}
                                >
                                    ...More
                                </button>
                            </>
                        ) : (
                            cardData.english
                        )}
                    </p>
                    {cardData.english === "No translation found" && (
                        <a href={`https://translate.google.com/?sl=es&tl=en&text=${encodeURIComponent(cardData.spanish)}&op=translate`} className="text-teal-200 hover:underline" target="_blank" rel="noopener noreferrer">Open in Google Translate</a>
                    )}
                    <hr className="w-4/5 my-4 border-teal-300" />
                    {cardData.vocab && cardData.vocab.length > 0 && 
                        
                        (
                            <><p className="text-lg"><strong>Key Vocab:</strong> {cardData.vocab}</p>
                            <hr className="w-4/5 my-4 border-teal-300" />
                            </>
                        )}
                </div>
            </div>
        </div>
        </>
    );
};

export default Flashcard;
