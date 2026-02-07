import React, { useState, useEffect, useRef } from 'react';
import { useDecksStore } from '../store';
import Modal from './Modal';
import { getFirestore, doc, onSnapshot, collection, setDoc, arrayUnion } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { CgPlayButtonR } from "react-icons/cg";
import { BsCheckCircleFill } from "react-icons/bs";

const MAX_FREE_INTERACTIONS = 3;
const MAX_FREE_CHARS = 100;

// --- NEW: Custom Circular Progress Component ---
const CircularProgress = ({ percentage, size = 50, strokeWidth = 4 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Background Circle */}
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress Circle */}
                <circle
                    className="text-teal-500 transition-all duration-1000 ease-out"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <span className="absolute text-xs font-bold text-gray-700 dark:text-gray-200">
                {Math.round(percentage)}%
            </span>
        </div>
    );
};

const SpeakCompanion = () => {
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);
    const currentUser = useDecksStore((state) => state.currentUser);
    const isPremium = isAdmin || hasActiveSubscription;


    const scenarios = useDecksStore((state) => state.scenarios);
    const scenariosAiInstructions = useDecksStore((state) => state.scenariosAiInstructions);
    const fetchScenarios = useDecksStore((state) => state.fetchScenarios);
    const isScenariosLoading = useDecksStore((state) => state.isScenariosLoading);
    const [isRecording, setIsRecording] = useState(false);
    const [userSpeech, setUserSpeech] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [selectedContextAndObjectives, setSelectedContextAndObjectives] = useState(null);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [interactionCount, setInteractionCount] = useState(0);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [limitMessage, setLimitMessage] = useState('');
    // --- NEW: State for user progress ---
    const [userProgress, setUserProgress] = useState({}); // { [scenarioId]: [completedRolePlayName1, ...] }
    
    const recognitionRef = useRef(null);
    const chatContainerRef = useRef(null);
    const finalTranscriptRef = useRef('');
    const shouldListenRef = useRef(false);

    // Fetch Scenarios and Goals from Firestore
    useEffect(() => {
        fetchScenarios();
    }, [fetchScenarios]);

    // --- NEW: Fetch User Progress ---
    useEffect(() => {
        if (currentUser) {
            const db = getFirestore(getApp());
            const progressRef = collection(db, 'users', currentUser.uid, 'speakProgress');
            
            const unsubscribe = onSnapshot(progressRef, (snapshot) => {
                const progressMap = {};
                snapshot.forEach(doc => {
                    progressMap[doc.id] = doc.data().completedRolePlays || [];
                });
                setUserProgress(progressMap);
            }, (error) => {
                console.error("Error fetching user progress:", error);
            });

            return () => unsubscribe();
        }
    }, [currentUser]);

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
            recognitionRef.current.continuous = false; // Use manual restart to avoid Android bugs
            recognitionRef.current.interimResults = true; // Get real-time results
            // Default to Spanish, use store preference if available
            recognitionRef.current.lang = listeningPreference || 'es-ES';

            recognitionRef.current.onstart = () => {
                setIsRecording(true);
            };

            recognitionRef.current.onend = () => {
                if (shouldListenRef.current) {
                    try {
                        recognitionRef.current.start();
                    } catch (error) {
                        console.error("Failed to restart speech recognition:", error);
                        setIsRecording(false);
                        shouldListenRef.current = false;
                    }
                } else {
                    setIsRecording(false);
                }
            };

            recognitionRef.current.onresult = (event) => {
                let interimTranscript = '';
                let finalChunk = '';
                
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalChunk += transcript.trim() + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                if (finalChunk) {
                    finalTranscriptRef.current += finalChunk;
                }
                setUserSpeech(finalTranscriptRef.current + interimTranscript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                shouldListenRef.current = false;
                setIsRecording(false);
            };
        }
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
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
                shouldListenRef.current = true;
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
        shouldListenRef.current = false;
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
    const InteractionCounts =() => {
        return (
        <div className="mb-6 text-center">
            <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                Free Interactions: {interactionCount}/{MAX_FREE_INTERACTIONS}
            </span>
        </div>
        )
    }

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
                personaId: selectedScenario.id,
                context: selectedContextAndObjectives.context,
                objectives: selectedContextAndObjectives.objectives,
                scenariosAiInstructions: scenariosAiInstructions,
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

    // --- NEW: Handle marking a roleplay as complete ---
    const handleCompleteRolePlay = async () => {
        if (!currentUser || !selectedScenario || !selectedContextAndObjectives) return;

        const isAlreadyCompleted = userProgress[selectedScenario.id]?.includes(selectedContextAndObjectives.name);

        try {
            if (!isAlreadyCompleted) {
                const db = getFirestore(getApp());
                const progressDocRef = doc(db, 'users', currentUser.uid, 'speakProgress', selectedScenario.id);
                
                await setDoc(progressDocRef, {
                    completedRolePlays: arrayUnion(selectedContextAndObjectives.name)
                }, { merge: true });
                alert("Great job! Progress saved.");
            }

            // Optional: Provide feedback or navigate back
            setSelectedContextAndObjectives(null);
            setSelectedScenario(null);
            setChatHistory([]);
            setUserSpeech('');
        } catch (error) {
            console.error("Error saving progress:", error);
            alert("Failed to save progress. Please try again.");
        }
    };

    if (isScenariosLoading && scenarios.length === 0) {
        return (
            <div className="p-6 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div>
            </div>
        );
    }

    if (!selectedScenario) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-4xl mx-auto animate-fade-in">
                <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-2 text-center">Choose a Scenario</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
                    Select a real-life scenario to practice your Spanish skills.
                </p>
                
                {!isPremium &&
                    <InteractionCounts />
                }

                <div className="grid grid-cols-2 gap-6">
                    {scenarios.map(scenario => {
                        // --- NEW: Calculate progress for this scenario ---
                        const completedCount = userProgress[scenario.id]?.length || 0;
                        const totalCount = scenario.rolePlays ? scenario.rolePlays.length : 0;
                        const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                        return (
                        <button 
                            key={scenario.id}
                            onClick={() => setSelectedScenario(scenario)}
                            className="flex flex-row justify-between items-center text-left p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-lg transition-all bg-gray-50 dark:bg-gray-900 group"
                        >
                            <div className="flex flex-col gap-2 flex-1">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                    {scenario.name}
                                </h3>
                                <div className="flex justify-between items-start w-full">
                                    <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-xs font-bold rounded-full uppercase tracking-wide">
                                        {totalCount} Role-Play Options
                                    </span>
                                </div>
                            </div>
                            
                            {/* --- NEW: Display Progress Gauge --- */}
                            <div className="ml-4 flex flex-col items-center">
                                <CircularProgress percentage={progressPercent} />
                            </div>
                        </button>
                    )})}
                </div>
            </div>
        );
    }

    if(!selectedContextAndObjectives) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-4xl mx-auto animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300">Speak Companion</h1>
                    <button 
                        onClick={() => {
                            setSelectedScenario(null);
                            setChatHistory([]);
                            setUserSpeech('');
                        }}
                        className="text-sm text-gray-500 hover:text-teal-600 underline"
                    >
                        Change Scenario
                    </button>
                </div>
                <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300 mb-4 text-center">Choose a Role Play</h1>
                <div className="grid grid-cols-1 gap-4">
                {selectedScenario.rolePlays.map((rolePlay, index) => {
                        // --- NEW: Check if this specific roleplay is completed ---
                        const isCompleted = userProgress[selectedScenario.id]?.includes(rolePlay.name);

                        return (
                        <button 
                            key={index}
                            onClick={() => setSelectedContextAndObjectives(rolePlay)}
                            className="flex flex-col text-left p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-lg transition-all bg-gray-50 dark:bg-gray-900 group"
                            >
                            <div className="w-full">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{selectedScenario.emoji}</span>
                                        <h2 className="font-bold text-teal-900 dark:text-teal-100">{rolePlay.name}</h2>
                                        {/* --- NEW: Completed Checkmark --- */}
                                    </div>
                                    {rolePlay.difficulty && (
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${
                                            rolePlay.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                                            rolePlay.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {rolePlay.difficulty}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col-2 justify-between items-end">
                                    <div>
                                        <p className="text-sm text-teal-800 dark:text-teal-200 mb-2">
                                            {rolePlay.description}
                                        </p>
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Objectives:</p>
                                        <ul className="list-disc list-inside text-sm text-teal-700 dark:text-teal-300">
                                            {rolePlay.objectives.map((obj, i) => (
                                                <li key={i}>{obj}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    {isCompleted && <BsCheckCircleFill className="flex text-green-500 ml-2" title="Completed" />}
                                </div>
                            </div>
                        </button>
                    )}
                )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-3xl">
            <Modal 
                isOpen={showLimitModal} 
                onClose={() => setShowLimitModal(false)} 
                title="Premium Limit Reached 🔒"
            >
                <p>{limitMessage}</p>
            </Modal>
            
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300">Speak Companion</h1>
                <button 
                    onClick={() => {
                        setSelectedScenario(null);
                        setSelectedContextAndObjectives(null);
                        setChatHistory([]);
                        setUserSpeech('');
                    }}
                    className="text-sm text-gray-500 hover:text-teal-600 underline"
                >
                    Change Scenario
                </button>
            </div>

            <div className="mb-4 p-4 bg-teal-50 dark:bg-teal-900/30 rounded-lg border border-teal-100 dark:border-teal-800/50">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{selectedScenario.emoji}</span>
                    <h2 className="font-bold text-teal-900 dark:text-teal-100">{selectedContextAndObjectives.name}</h2>
                </div>
                <p className="text-sm text-teal-800 dark:text-teal-200">
                    {selectedContextAndObjectives.description}
                </p>
                <ul className="list-disc list-inside text-sm text-teal-700 dark:text-teal-300">
                    {selectedContextAndObjectives.objectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                    ))}
                </ul>
            </div>

            {/* Chat History */}
            <div ref={chatContainerRef} className="mb-6 h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
                {chatHistory.length === 0 && (
                    <p className="text-center text-gray-400 mt-20">Start the conversation! Try saying "Hola" to the {selectedContextAndObjectives.role.toLowerCase()}.</p>
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
                    onMouseDown={startListening}
                    onMouseUp={stopListening}
                    onMouseLeave={stopListening}
                    onTouchStart={startListening}
                    onTouchEnd={stopListening}
                    className={`p-6 rounded-full shadow-lg transition-all transform hover:scale-105 ${
                        isRecording 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'bg-teal-500 text-white hover:bg-teal-600'
                    }`}
                    aria-label="Hold to record"
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
            {/* --- NEW: Complete Button --- */}
            <div className="mt-8 text-center">
                <button 
                    onClick={handleCompleteRolePlay}
                    className={`px-8 py-3 font-bold rounded-lg shadow-md transition-colors flex items-center justify-center mx-auto gap-2 ${
                        userProgress[selectedScenario.id]?.includes(selectedContextAndObjectives.name)
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                >
                    <BsCheckCircleFill />
                    {userProgress[selectedScenario.id]?.includes(selectedContextAndObjectives.name) 
                        ? 'Completed - Finish' 
                        : 'Finish & Mark Complete'}
                </button>
            </div>
        </div>
    );
};

export default SpeakCompanion;