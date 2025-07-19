import React from 'react';

// Component for a single Flashcard
const Flashcard = ({ cardData, isFlipped, onFlip }) => {
    const containerStyle = { perspective: '1000px' };
    const cardStyle = {
      transformStyle: 'preserve-3d',
      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
    };
    const faceStyle = { backfaceVisibility: 'hidden' };

    // Handle case where cardData might not be loaded yet
    if (!cardData) {
        return <div className="w-full h-64 flex items-center justify-center bg-gray-200 rounded-xl">Loading card...</div>;
    }

    return (
        <div style={containerStyle} className="w-full h-64" onClick={onFlip}>
            <div style={cardStyle} className="relative w-full h-full transition-transform duration-700">
                <div style={faceStyle} className="absolute w-full h-full bg-white rounded-xl shadow-lg flex justify-center items-center p-6">
                    <p className="text-3xl font-semibold text-gray-800 text-center">{cardData.spanish}</p>
                </div>
                <div style={{...faceStyle, transform: 'rotateY(180deg)'}} className="absolute w-full h-full bg-teal-500 text-white rounded-xl shadow-lg flex flex-col justify-center items-center p-6">
                    <p className="text-2xl font-semibold text-center">{cardData.english}</p>
                    <hr className="w-4/5 my-4 border-teal-300" />
                    <p className="text-lg"><strong>Key Vocab:</strong> {cardData.vocab}</p>
                </div>
            </div>
        </div>
    );
};

export default Flashcard;
