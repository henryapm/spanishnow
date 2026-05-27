import React, { useState, useEffect, useRef } from 'react';
import { useDecksStore } from '../store';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { CgPlayButtonR } from "react-icons/cg";
import { FaStopCircle } from "react-icons/fa";

export default function AIChatPractice({ articleId, targetVocabulary, onComplete }) {
    const MAX_FREE_INTERACTIONS = 5;
    const article = useDecksStore((state) => state.articles[articleId]);
    const listeningPreference = useDecksStore((state) => state.listeningPreference);
    const scenariosAiInstructions = useDecksStore((state) => state.scenariosAiInstructions);
    const fetchScenarios = useDecksStore((state) => state.fetchScenarios);
    const isAdmin = useDecksStore((state) => state.isAdmin);
    const hasActiveSubscription = useDecksStore((state) => state.hasActiveSubscription);

    const isPremium = isAdmin || hasActiveSubscription;

    const [isRecording, setIsRecording] = useState(false);
    const [userSpeech, setUserSpeech] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    
    const recognitionRef = useRef(null);
    const chatContainerRef = useRef(null);
    const finalTranscriptRef = useRef('');
    const shouldListenRef = useRef(false);
    
    // --- NEW: Audio tracking ---
    const activeAudioRef = useRef(null);
    const intendedAudioIndexRef = useRef(null);
    const [playingAudioIndex, setPlayingAudioIndex] = useState(null);

    useEffect(() => {
        return () => stopAudio();
    }, []);

    const stopAudio = () => {
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current = null;
        }
        setPlayingAudioIndex(null);
        intendedAudioIndexRef.current = null;
    };

    const playAudioFromBase64 = (base64String, index) => {
        if (intendedAudioIndexRef.current !== index) return;
        const audio = new Audio(`data:audio/mp3;base64,${base64String}`);
        activeAudioRef.current = audio;
        setPlayingAudioIndex(index);
        audio.onended = () => {
            setPlayingAudioIndex(null);
            activeAudioRef.current = null;
            intendedAudioIndexRef.current = null;
        };
        audio.play();
    };

    const handleSpeechError = (errorType) => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
        
        if (isIOS && !isSafari) {
            alert("Voice features are restricted by Apple in third-party browsers. Please open this app in Safari.");
        } else if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
            alert("Microphone access was denied. Please check your browser permissions.");
        } else if (errorType === 'not-supported') {
            alert("Speech Recognition is not supported in this browser. Please try Chrome or Safari.");
        }
    };

    const interactionCount = useDecksStore((state) => state.interactionCount);
    const incrementInteractionCount = useDecksStore((state) => state.incrementInteractionCount);
    const InteractionCounts =() => {     
        return (
        <div className="my-6 text-center">
            <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                Free Interactions: {interactionCount}/{MAX_FREE_INTERACTIONS}
            </span>
        </div>
        )
    }

    // Ensure AI instructions are loaded
    useEffect(() => {
        fetchScenarios();
    }, [fetchScenarios]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false; 
            recognitionRef.current.interimResults = true; 
            recognitionRef.current.lang = listeningPreference || 'es-ES';

            recognitionRef.current.onstart = () => setIsRecording(true);

            recognitionRef.current.onend = () => {
                if (shouldListenRef.current) {
                    try { recognitionRef.current.start(); } catch (e) {
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
                    if (event.results[i].isFinal) {
                        finalChunk += event.results[i][0].transcript.trim() + ' ';
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                if (finalChunk) finalTranscriptRef.current += finalChunk;
                setUserSpeech(finalTranscriptRef.current + interimTranscript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                shouldListenRef.current = false;
                setIsRecording(false);
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    handleSpeechError(event.error);
                }
            };
        }
        return () => {
            if (recognitionRef.current) recognitionRef.current.abort();
        };
    }, [listeningPreference]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isAiProcessing]);

    const startListening = () => {
        stopAudio();
        if (recognitionRef.current && !isRecording) {
            try {
                shouldListenRef.current = true;
                setUserSpeech(''); 
                finalTranscriptRef.current = '';
                recognitionRef.current.start();
            } catch (error) {
                console.error("Error starting speech recognition:", error);
                shouldListenRef.current = false;
                setIsRecording(false);
            }
        } else if (!recognitionRef.current) {
            handleSpeechError('not-supported');
        }
    };

    const stopListening = () => {
        shouldListenRef.current = false;
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopListening();
        } else {
            startListening();
        }
    };

    const playMessageAudio = async (msg, index) => {
        if (playingAudioIndex === index) {
            stopAudio();
            return;
        }
        
        stopAudio();
        intendedAudioIndexRef.current = index;
        setPlayingAudioIndex(index);

        if (msg.audio) {
            playAudioFromBase64(msg.audio, index);
        } else {
            try {
                const functions = getFunctions(getApp());
                const generateAudioTTS = httpsCallable(functions, 'generateAudioTTS');
                const audioResult = await generateAudioTTS({ text: msg.text });
                const base64Audio = audioResult.data.audioBase64;
                
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    if (newHistory[index]) {
                        newHistory[index].audio = base64Audio;
                    }
                    return newHistory;
                });
                
                playAudioFromBase64(base64Audio, index);
            } catch (error) {
                console.error("Failed to generate TTS audio:", error);
                if (intendedAudioIndexRef.current === index) {
                    stopAudio();
                }
            }
        }
    };
    
    const handleSend = async () => {
        if (!userSpeech.trim()) return;
        
        if (!isPremium && interactionCount >= MAX_FREE_INTERACTIONS) {
            alert(`You've reached the limit of ${MAX_FREE_INTERACTIONS} free interactions. Please upgrade to Premium to continue.`);
            return;
        }

        const newUserMessage = { role: 'user', text: userSpeech };
        const newHistory = [...chatHistory, newUserMessage];
        setChatHistory(newHistory);
        setUserSpeech('');
        setIsAiProcessing(true);

        try {
            const functions = getFunctions(getApp());
            const chatForLesson = httpsCallable(functions, 'chatForLesson');
            
            const result = await chatForLesson({
                history: newHistory,
                articleId: articleId,
                targetVocabulary: targetVocabulary || [],
                date: new Date().toLocaleDateString('en-CA')
            });

            const aiResponseText = result.data.text;

            setChatHistory(prev => [...prev, { role: 'model', text: aiResponseText }]);
            if (!isPremium) incrementInteractionCount();

            // Auto generate and play audio
            try {
                const newModelIndex = newHistory.length;
                intendedAudioIndexRef.current = newModelIndex;
                setPlayingAudioIndex(newModelIndex);

                const generateAudioTTS = httpsCallable(functions, 'generateAudioTTS');
                const audioResult = await generateAudioTTS({ text: aiResponseText });
                const base64Audio = audioResult.data.audioBase64;
                
                setChatHistory(prev => {
                    const updatedHistory = [...prev];
                    const lastIndex = updatedHistory.length - 1;
                    if (updatedHistory[lastIndex] && updatedHistory[lastIndex].role === 'model') {
                        updatedHistory[lastIndex].audio = base64Audio;
                    }
                    return updatedHistory;
                });
                
                playAudioFromBase64(base64Audio, newModelIndex);
            } catch (error) {
                console.error("Failed to generate TTS audio:", error);
                if (intendedAudioIndexRef.current === newModelIndex) {
                    stopAudio();
                }
            }
        } catch (error) {
            console.error("Error calling Gemini:", error);
            setChatHistory(prev => [...prev, { role: 'model', text: `Error: ${error.message}` }]);
        } finally {
            setIsAiProcessing(false);
        }
    };

    const renderHighlightedSpeech = (speech) => {
        if (!targetVocabulary || targetVocabulary.length === 0) return speech;
        
        const escapedVocab = targetVocabulary.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        // Uses Unicode boundaries so it only highlights isolated words (ignoring punctuation/spaces) but supports Spanish accents
        const regex = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])(${escapedVocab})(?![\\p{L}\\p{M}\\p{N}_])`, 'giu');
        const parts = speech.split(regex);
        
        return (
            <>
                {parts.map((part, i) => {
                    const isVocab = targetVocabulary.some(v => v.toLowerCase() === part.toLowerCase());
                    return isVocab 
                        ? <span key={i} className="text-white bg-yellow-600 mx-1 px-1 rounded">{part}</span>
                        : part;
                })}
            </>
        );
    };

    return (
        <div className="flex flex-col h-full w-full max-w-3xl mx-auto p-4 animate-fade-in pb-24">
            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400">Put it into Practice</h2>
                {!isPremium &&
                    <InteractionCounts />
                }
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                </p>
                    Chat with AI about <strong>{article?.title}</strong>

                {targetVocabulary && targetVocabulary.length > 0 && (
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                        Try to use: {targetVocabulary.map(word => (
                            <span key={word} className='text-white bg-blue-700 mx-1 px-2 py-1 rounded'>
                                {word}
                            </span>
                        ))}
                    </p>
                )}
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 space-y-4 mb-4">
                {chatHistory.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
                        <p>Start the conversation!</p>
                        <p className="text-sm mt-2">Try saying: <i>"Hola, acabo de leer la historia."</i></p>
                    </div>
                )}
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-bl-none'
                        }`}>
                            {renderHighlightedSpeech(msg.text)}
                        </div>
                        {msg.role !== 'user' && (
                            <div className="ml-2 cursor-pointer hover:text-teal-500 transition-colors flex flex-col justify-center flex-start w-10 h-10" onClick={() => playMessageAudio(msg, index)}>
                                {playingAudioIndex === index ? (
                                    <FaStopCircle className="inline mr-1 w-8 h-8" />
                                ) : (
                                    <CgPlayButtonR className="inline mr-1 w-8 h-8" />
                                )}
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

            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 mb-4 select-none">
                <button 
                    onClick={toggleRecording}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                    className={`p-5 rounded-full shadow-lg transition-all transform hover:scale-105 touch-none select-none ${
                        isRecording 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                    aria-label={isRecording ? "Tap to stop recording" : "Tap to start recording"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>
                
                <div className="mt-4 text-center min-h-12">
                    {isRecording ? (
                        <p className="text-red-500 font-semibold animate-pulse">Listening... (Tap to stop)</p>
                    ) : userSpeech ? (
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">You said:</p>
                            <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                                {renderHighlightedSpeech(userSpeech)}
                            </p>
                            <div className="mt-3 flex gap-2 justify-center">
                                <button 
                                    onClick={handleSend}
                                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors"
                                >
                                    Send
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
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Tap the microphone to start speaking</p>
                    )}
                </div>
            </div>

            <div className="flex justify-center mt-2">
                <button 
                    onClick={onComplete} 
                    className="px-8 py-3 bg-green-600 text-white font-bold rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105 w-full max-w-sm flex justify-center items-center gap-2"
                >
                    Finish Lesson ➔
                </button>
            </div>
        </div>
    );
}
