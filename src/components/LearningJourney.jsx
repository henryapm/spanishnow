import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight, FaCheckCircle, FaLock, FaStar, FaGraduationCap, FaBookOpen } from 'react-icons/fa';

const LEVELS = [
    {
        id: 'A1',
        title: 'A1 - Beginner',
        subtitle: 'Breakthrough & Foundations',
        color: 'from-emerald-500 to-teal-600',
        badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        activeGlow: 'ring-4 ring-emerald-400 dark:ring-emerald-500',
        nodeBg: 'bg-emerald-500 text-white',
        description: 'Establish basic communication. Learn everyday greetings, foundational vocabulary, numbers, and present tense verbs.',
        targetWords: '~500 Words',
        estimatedTime: '20-30 Hours',
        topics: [
            'Greetings & Introducing Yourself',
            'Present Tense (Ser, Estar, Tener)',
            'Numbers, Days & Time',
            'Ordering Food & Simple Shopping'
        ]
    },
    {
        id: 'A2',
        title: 'A2 - Elementary',
        subtitle: 'Daily Life & Past Experiences',
        color: 'from-blue-500 to-indigo-600',
        badgeBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
        activeGlow: 'ring-4 ring-blue-400 dark:ring-blue-500',
        nodeBg: 'bg-blue-500 text-white',
        description: 'Build confidence in routine conversations. Describe past experiences, routines, plans, and navigate travel scenarios.',
        targetWords: '~1,200 Words',
        estimatedTime: '40-60 Hours',
        topics: [
            'Preterite vs. Imperfect Past Tenses',
            'Reflexive Verbs & Daily Routines',
            'Travel, Hotel & Asking Directions',
            'Future Plans (Ir a + Infinitive)'
        ]
    },
    {
        id: 'B1',
        title: 'B1 - Intermediate',
        subtitle: 'Opinions & Complex Ideas',
        color: 'from-purple-500 to-fuchsia-600',
        badgeBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
        activeGlow: 'ring-4 ring-purple-400 dark:ring-purple-500',
        nodeBg: 'bg-purple-500 text-white',
        description: 'Express your thoughts clearly on familiar topics. Handle unexpected travel events and begin using subjunctive structures.',
        targetWords: '~2,500 Words',
        estimatedTime: '80-100 Hours',
        topics: [
            'Present Subjunctive Mood Basics',
            'Expressing Opinions & Hypotheses',
            'Conditional Tense & Future Tense',
            'Storytelling & Connecting Paragraphs'
        ]
    },
    {
        id: 'B2',
        title: 'B2 - Upper-Intermediate',
        subtitle: 'Fluency & Nuanced Debates',
        color: 'from-amber-500 to-rose-600',
        badgeBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        activeGlow: 'ring-4 ring-amber-400 dark:ring-amber-500',
        nodeBg: 'bg-amber-500 text-white',
        description: 'Achieve conversational spontaneity. Understand complex texts, debate topical issues, and use advanced grammar smoothly.',
        targetWords: '~4,000 Words',
        estimatedTime: '120-150 Hours',
        topics: [
            'Imperfect Subjunctive & Si Clauses',
            'Idiomatic Expressions & Nuances',
            'Debating & Formal Communication',
            'Spanish Literature & Authentic Media'
        ]
    }
];

export default function LearningJourney() {
    const navigate = useNavigate();

    // Active path selected by user (stored in localStorage)
    const [userLevel, setUserLevel] = useState(() => {
        return localStorage.getItem('user_active_level') || 'A1';
    });

    // Currently focused/clicked node in the details card
    const [selectedLevelId, setSelectedLevelId] = useState(() => {
        return localStorage.getItem('user_active_level') || 'A1';
    });

    const activeLevelData = LEVELS.find(l => l.id === selectedLevelId) || LEVELS[0];

    const handleSetActiveLevel = (levelId) => {
        setUserLevel(levelId);
        localStorage.setItem('user_active_level', levelId);
    };

    return (
        <div className="w-full max-w-2xl mx-auto py-4 px-2 sm:px-4 animate-fade-in text-gray-800 dark:text-gray-100">
            {/* --- Top Header Navigation --- */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold transition-colors shadow-sm"
                >
                    <FaArrowLeft /> Back to Account
                </button>
                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                    <FaStar /> Active Level: {userLevel}
                </div>
            </div>

            {/* --- Title Section --- */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold flex items-center justify-center gap-2 text-gray-900 dark:text-white">
                    <FaGraduationCap className="text-blue-600 dark:text-blue-400" /> Learning Path Journey
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">
                    Select your current Spanish proficiency level to personalize your learning roadmap.
                </p>
            </div>

            {/* --- Stepper Layout (Vertical on mobile flex-col, Horizontal on desktop md:flex-row) --- */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8 border border-gray-100 dark:border-gray-700">
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 md:gap-2">

                    {/* Connecting Line (Horizontal desktop) */}
                    <div className="hidden md:block absolute top-6 left-10 right-10 h-1 bg-gray-200 dark:bg-gray-700 -z-0" />

                    {/* Connecting Line (Vertical mobile) */}
                    <div className="block md:hidden absolute top-8 bottom-8 left-1/2 -ml-0.5 w-1 bg-gray-200 dark:bg-gray-700 -z-0" />

                    {LEVELS.map((lvl) => {
                        const isFocused = selectedLevelId === lvl.id;
                        const isCurrentActive = userLevel === lvl.id;

                        return (
                            <button
                                key={lvl.id}
                                onClick={() => setSelectedLevelId(lvl.id)}
                                className={`relative z-10 flex flex-col items-center group focus:outline-none transition-transform transform hover:scale-105 ${
                                    isFocused ? 'scale-105' : ''
                                }`}
                            >
                                {/* Node Circle */}
                                <div
                                    className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-lg shadow-md transition-all ${
                                        lvl.nodeBg
                                    } ${isFocused ? lvl.activeGlow : ''}`}
                                >
                                    {lvl.id}
                                </div>

                                {/* Active Star Indicator */}
                                {isCurrentActive && (
                                    <span className="absolute -top-2 -right-1 bg-amber-400 text-amber-950 p-1 rounded-full text-xs shadow-md border border-white dark:border-gray-800">
                                        <FaStar />
                                    </span>
                                )}

                                {/* Node Label */}
                                <div className="mt-2 text-center">
                                    <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                                        {lvl.id}
                                    </span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        {lvl.title.split('-')[1]?.trim()}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* --- Expandable Details Card for Focused Level --- */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300">
                {/* Banner Header */}
                <div className={`p-6 bg-gradient-to-r ${activeLevelData.color} text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-xs mb-2">
                            <span>Level {activeLevelData.id}</span>
                            {userLevel === activeLevelData.id && (
                                <span className="bg-white text-gray-900 text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase">
                                    Current Active Path
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-black">{activeLevelData.title}</h2>
                        <p className="text-white/80 text-sm font-medium">{activeLevelData.subtitle}</p>
                    </div>

                    <div className="flex flex-col sm:items-end text-xs text-white/90 gap-1">
                        <span className="bg-white/10 px-3 py-1 rounded-lg backdrop-blur-xs font-semibold">
                            Vocabulary: {activeLevelData.targetWords}
                        </span>
                        <span className="bg-white/10 px-3 py-1 rounded-lg backdrop-blur-xs font-semibold">
                            Estimated: {activeLevelData.estimatedTime}
                        </span>
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-6">
                    <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                        {activeLevelData.description}
                    </p>

                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                            Key Skills & Topics Covered:
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {activeLevelData.topics.map((topic, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 text-sm border border-gray-100 dark:border-gray-700"
                                >
                                    <FaCheckCircle className="text-emerald-500 shrink-0" />
                                    <span>{topic}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons Footer */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                        {userLevel === activeLevelData.id ? (
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                <FaCheckCircle className="text-lg" /> Selected as your Active Learning Path
                            </div>
                        ) : (
                            <button
                                onClick={() => handleSetActiveLevel(activeLevelData.id)}
                                className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-md hover:shadow-lg transition-transform transform hover:scale-105 flex items-center justify-center gap-2 text-sm"
                            >
                                Set {activeLevelData.id} as Active Level
                            </button>
                        )}

                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => navigate('/lesson')}
                                className="flex-1 sm:flex-none px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-transform transform hover:scale-105 flex items-center justify-center gap-2 text-sm"
                            >
                                <FaBookOpen /> Start Lessons <FaArrowRight />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
