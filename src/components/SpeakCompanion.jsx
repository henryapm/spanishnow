import React, { useState, useEffect, useRef } from 'react';
import { useDecksStore } from '../store';
import Modal from './Modal';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { CgPlayButtonR } from "react-icons/cg";

const PERSONAS = [
    { id: 'barista', name: 'Barista ☕', context: 'You are a friendly barista at a coffee shop in Madrid. Ask the customer what they would like to drink or eat. Keep responses concise.' },
    { id: 'taxi', name: 'Taxi Driver 🚕', context: 'You are a talkative taxi driver in Mexico City. Ask the passenger where they are going and make small talk about the traffic or weather.' },
    { id: 'friend', name: 'Amigo 👋', context: 'You are a close friend catching up. Ask how their week has been and what their plans are for the weekend.' },
    { id: 'doctor', name: 'Doctor 🩺', context: 'You are a doctor in a clinic. Ask the patient what their symptoms are and how they are feeling.' },
];

const MAX_FREE_INTERACTIONS = 5;
const MAX_FREE_CHARS = 100;

const SpeakCompanion = () => {
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);
    const currentUser = useDecksStore((state) => state.currentUser);
    const isPremium = isAdmin || hasActiveSubscription;

    const [isRecording, setIsRecording] = useState(false);
    const [userSpeech, setUserSpeech] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [interactionCount, setInteractionCount] = useState(0);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [limitMessage, setLimitMessage] = useState('');
    const recognitionRef = useRef(null);
    const chatContainerRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const finalTranscriptRef = useRef('');


    // Listen for interaction count changes from Firebase
    useEffect(() => {
        if (currentUser && !isPremium) {
            const db = getFirestore(getApp());
            const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in Local Time
            const userRef = doc(db, 'users', currentUser.uid, 'daily_limits', 'speak');
            
            const unsubscribe = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.date === today) {
                        setInteractionCount(data.count || 0);
                    } else {
                        setInteractionCount(0);
                    }
                } else {
                    setInteractionCount(0);
                }
            }, (error) => {
                console.error("Error fetching speak usage:", error);
            });

            return () => unsubscribe();
        }
    }, [currentUser, isPremium]);

    useEffect(() => {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true; // Keep listening to allow pauses
            recognitionRef.current.interimResults = true; // Get real-time results
            // Default to Spanish, use store preference if available
            recognitionRef.current.lang = listeningPreference || 'es-ES';

            let silenceTimer;

            recognitionRef.current.onstart = () => {
                setIsRecording(true);
                // Start a timer in case the user doesn't say anything initially
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    if (recognitionRef.current) {
                        recognitionRef.current.stop();
                    }
                }, 3000);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };

            recognitionRef.current.onresult = (event) => {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscriptRef.current += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setUserSpeech(finalTranscriptRef.current + interimTranscript);

                // Wait 5 seconds of silence before stopping automatically
                silenceTimerRef.current = setTimeout(() => {
                    if (recognitionRef.current) {
                        recognitionRef.current.stop();
                    }
                }, 3000);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsRecording(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };
        }
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, [listeningPreference]);

    // Scroll to bottom of chat when history changes
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isAiProcessing]);

    const startListening = () => {
        if (recognitionRef.current && !isRecording) {
            try {
                setUserSpeech(''); // Clear previous speech
                finalTranscriptRef.current = '';
                recognitionRef.current.start();
            } catch (error) {
                console.error("Error starting speech recognition:", error);
            }
        } else if (!recognitionRef.current) {
            alert("Speech Recognition is not supported in this browser.");
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
        }
    };

    const speakText = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = listeningPreference || 'es-ES';
        window.speechSynthesis.speak(utterance);
    };

    const handleSend = async () => {
        if (!userSpeech.trim()) return;
        
        if (!isPremium) {
            if (interactionCount >= MAX_FREE_INTERACTIONS) {
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
                setLimitMessage(`You've reached the limit of ${MAX_FREE_INTERACTIONS} interactions for the free tier. You can chat again on ${dayName} after 12:00 AM. Upgrade to Premium for unlimited conversations!`);
                setShowLimitModal(true);
                return;
            }
            if (userSpeech.length > MAX_FREE_CHARS) {
                setLimitMessage(`Your message is too long (${userSpeech.length} chars). Free tier limit is ${MAX_FREE_CHARS} characters.`);
                setShowLimitModal(true);
                return;
            }
        }

        const newUserMessage = { role: 'user', text: userSpeech };
        const newHistory = [...chatHistory, newUserMessage];
        setChatHistory(newHistory);
        setUserSpeech(''); // Clear input
        setIsAiProcessing(true);

        try {
            const functions = getFunctions(getApp());
            const chatWithGemini = httpsCallable(functions, 'chatWithGemini');
            const today = new Date().toLocaleDateString('en-CA'); // Get local date to send to backend
            
            const result = await chatWithGemini({
                history: newHistory,
                personaId: selectedPersona.id,
                date: today
            });

            const aiResponseText = result.data.text;

            setChatHistory(prev => [...prev, { role: 'model', text: aiResponseText }]);
            speakText(aiResponseText);

        } catch (error) {
            console.error("Error calling Gemini:", error);
            if (error.message.includes('limit')) {
                setLimitMessage(error.message);
                setShowLimitModal(true);
                setInteractionCount(MAX_FREE_INTERACTIONS);
            } else {
                setChatHistory(prev => [...prev, { role: 'model', text: `Error: ${error.message}` }]);
            }
        } finally {
            setIsAiProcessing(false);
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-3xl">
            <Modal 
                isOpen={showLimitModal} 
                onClose={() => setShowLimitModal(false)} 
                title="Premium Limit Reached 🔒"
            >
                <p>{limitMessage}</p>
            </Modal>
            <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-4">Speak Companion</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
                Welcome to the Speak Companion! Interact with an AI persona to practice your Spanish.
            </p>
            
            {/* Persona Selector */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-gray-700 dark:text-gray-300 font-bold">Choose a Persona:</label>
                    {!isPremium && (
                        <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                            Free: {interactionCount}/{MAX_FREE_INTERACTIONS}
                        </span>
                    )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {PERSONAS.map(persona => (
                        <button
                            key={persona.id}
                            onClick={() => {
                                setSelectedPersona(persona);
                                setChatHistory([]); // Reset chat on persona change
                            }}
                            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                                selectedPersona.id === persona.id
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            {persona.name}
                        </button>
                    ))}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">{selectedPersona.context}</p>
            </div>

            {/* Chat History */}
            <div ref={chatContainerRef} className="mb-6 h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
                {chatHistory.length === 0 && (
                    <p className="text-center text-gray-400 mt-20">Start the conversation by saying "Hola"!</p>
                )}
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                            msg.role === 'user' 
                                ? 'bg-teal-500 text-white rounded-br-none' 
                                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-bl-none'
                        }`}>
                            {msg.text}
                        </div>
                        {msg.role !== 'user' && (
                            <div className="ml-2 cursor-pointer hover:text-teal-500 transition-colors flex flex-col justify-center flex-start w-10 h-10" onClick={() => speakText(msg.text)}>
                                <CgPlayButtonR className="inline mr-1 w-10 h-10" />
                            </div>
                        )}
                    </div>
                ))}
                {isAiProcessing && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 dark:bg-gray-700 text-gray-500 px-4 py-2 rounded-lg rounded-bl-none animate-pulse">
                            Thinking...
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700">
                <button 
                    onClick={isRecording ? stopListening : startListening}
                    className={`p-6 rounded-full shadow-lg transition-all transform hover:scale-105 ${
                        isRecording 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'bg-teal-500 text-white hover:bg-teal-600'
                    }`}
                    aria-label="Start recording"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>
                
                <div className="mt-6 text-center min-h-[3rem]">
                    {isRecording ? (
                        <p className="text-red-500 font-semibold animate-pulse">Listening...</p>
                    ) : userSpeech ? (
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">You said:</p>
                            <p className="text-xl font-medium text-gray-800 dark:text-gray-200">"{userSpeech}"</p>
                            <div className="mt-4 flex gap-2 justify-center">
                                <button 
                                    onClick={handleSend}
                                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors"
                                >
                                    Send Response
                                </button>
                                <button 
                                    onClick={() => setUserSpeech('')}
                                    className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg shadow hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">Tap the microphone to start speaking</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpeakCompanion;