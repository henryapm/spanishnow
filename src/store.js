import { create } from 'zustand';
import { db } from './firebase';
// --- FIX: Added query, where, and documentId to the import list ---
import { collection, getDocs, addDoc, doc, updateDoc, setDoc, getDoc, increment, query, where, documentId, deleteDoc, orderBy, serverTimestamp, arrayUnion } from "firebase/firestore"; 
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

const auth = getAuth();
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// --- Caching Configuration ---
const CACHE_KEY = 'spanishAppCache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day

/**
 * Gets the entire cache object from localStorage.
 */
function getCache() {
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (!cachedData) {
    // Return a default structure if no cache exists
    return { articles: null, articleDetail: {}, articlesVersion: 0, dictionary: {} };
  }
  return JSON.parse(cachedData);
}

/**
 * Saves the provided data object to localStorage.
 */
function setCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving to cache:", error);
    // This can happen if localStorage is full
  }
}

/**
 * Checks if a timestamp is still valid (less than 24 hours old).
 */
function isCacheValid(timestamp) {
  if (!timestamp) return false;
  return (Date.now() - timestamp) < CACHE_DURATION;
}

/**
 * Converts a Map to a JSON-safe string.
 */
function serializeMap(map) {
  return JSON.stringify(Array.from(map.entries()));
}

/**
 * Converts a JSON-safe string back into a Map.
 */
function deserializeMap(jsonString) {
  if (!jsonString) return new Map();
  return new Map(JSON.parse(jsonString));
}

export const useDecksStore = create((set, get) => ({
    // --- STATE ---
    decks: {},
    isLoading: false,
    isDecksLoading: false, // New flag to prevent double fetching
    currentUser: null,
    isAdmin: false,
    tab: 'lessons',
    hasActiveSubscription: false,
    articles: {},
    isArticlesLoading: false,
    loadingArticleId: null,
    // --- MODIFIED: This will now hold translations for ONLY the active article ---
    activeArticleTranslations: new Map(),
    isDictionaryLoading: false, // To show a loading state for translations
    progress: {},
    deckProgress: {},
    listeningPreference: 'es-ES',
    totalXp: 0,
    streak: 0,
    theme: 'dark',
    savedWordsSet: new Set(),
    savedWordsList: [],
    savedWordsLoaded: false,
    dailyFreeAccess: null, // { date: "YYYY-MM-DD", deckId: "..." }
    finishedArticles: [],
    scenarios: [],
    scenariosAiInstructions: '',
    isScenariosLoading: false,
    speakProgress: {},
    interactionCount: 0,
    userProgressLoaded: false,
    speakProgressLoaded: false,

    isAuthListenerSet: false, // <-- 1. ADD THIS FLAG


    // --- ACTIONS ---
    toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light',
    })),

    setTab: (tab) => set({ tab }),

    listenForAuthChanges: () => {
        if (get().isAuthListenerSet) return;
        console.log(get().isAuthListenerSet);
        
        set({ isAuthListenerSet: true });
        console.log(get().isAuthListenerSet);
        
        onAuthStateChanged(auth, async (user) => {

            if (user) {
                const tokenResult = await user.getIdTokenResult();
                
                // --- OPTIMIZATION: Fetch critical user data in parallel ---
                const [userDocSnap] = await Promise.all([
                    getDoc(doc(db, 'users', user.uid))
                ]);

                let userPreference = 'es-ES';
                let userXp = 0;
                let subscriptionStatus = false;
                let isFirestoreAdmin = false;
                let dailyFreeAccess = null;
                let finishedArticles = [];

                if (userDocSnap.exists()) {
                    userPreference = userDocSnap.data().listeningPreference || 'es-ES';
                    userXp = userDocSnap.data().totalXp || 0;
                    subscriptionStatus = userDocSnap.data().hasActiveSubscription === true;
                    isFirestoreAdmin = userDocSnap.data().isAdmin === true;
                    
                    // --- FIX: Race Condition Handling ---
                    // If we have a local record for TODAY, but server has nothing (or old date), 
                    // keep the local version. This prevents the auth listener from overwriting 
                    // our optimistic update before the server write completes.
                    const serverAccess = userDocSnap.data().dailyFreeAccess || null;
                    const localAccess = get().dailyFreeAccess;
                    const now = new Date();
                    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                    if (localAccess && localAccess.date === today && (!serverAccess || serverAccess.date !== today)) {
                        dailyFreeAccess = localAccess;
                    } else {
                        dailyFreeAccess = serverAccess;
                    }
                    finishedArticles = userDocSnap.data().finishedArticles || [];
                }

                const isPremium = tokenResult.claims.admin === true || isFirestoreAdmin || subscriptionStatus;
                
                if (!isPremium) {
                    const today = new Date().toLocaleDateString('en-CA');
                    const limitRef = doc(db, 'users', user.uid, 'daily_limits', 'speak');
                    getDoc(limitRef).then((docSnap) => {
                        if (docSnap.exists() && docSnap.data().date === today) {
                            set({ interactionCount: docSnap.data().count || 0 });
                        } else {
                            set({ interactionCount: 0 });
                        }
                    });
                }

                set({ 
                    currentUser: user, 
                    isAdmin: isPremium, // Simplified logic since isPremium covers admin check
                    hasActiveSubscription: subscriptionStatus,
                    listeningPreference: userPreference,
                    totalXp: userXp,
                    streak: 0,
                    dailyFreeAccess: dailyFreeAccess,
                    finishedArticles: finishedArticles,
                    savedWordsLoaded: false // Reset so we fetch fresh for the new user
                });
            } else {
                set({ 
                    currentUser: null, 
                    isAdmin: false, 
                    progress: {}, 
                    deckProgress: {},
                    listeningPreference: 'es-ES', 
                    totalXp: 0, 
                    streak: 0, 
                    dailyFreeAccess: null, 
                    finishedArticles: [], 
                    savedWordsLoaded: false, 
                    savedWordsSet: new Set(), 
                    savedWordsList: [],
                    speakProgress: {},
                    interactionCount: 0,
                    userProgressLoaded: false,
                    speakProgressLoaded: false
                });
            }
        });
    },

    // --- NEW: Lazy Load Actions ---
    fetchUserProgress: async () => {
        const { currentUser, userProgressLoaded } = get();
        if (!currentUser || userProgressLoaded) return;

        try {
            const progressSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'progress'));
            const progressData = {};
            progressSnapshot.forEach(d => { progressData[d.id] = d.data(); });
            
            set({ progress: progressData, deckProgress: progressData, userProgressLoaded: true });
        } catch (error) {
            console.error("Error fetching user progress:", error);
        }
    },

    fetchSpeakProgress: async () => {
        const { currentUser, speakProgressLoaded } = get();
        if (!currentUser || speakProgressLoaded) return;

        try {
            const speakProgressSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'speakProgress'));
            const speakProgressMap = {};
            speakProgressSnapshot.forEach(doc => {
                speakProgressMap[doc.id] = doc.data().completedRolePlays || [];
            });
            set({ speakProgress: speakProgressMap, speakProgressLoaded: true });
        } catch (error) {
            console.error("Error fetching speak progress:", error);
        }
    },

    // --- NEW: Manually update local state after a write (replaces listener) ---
    updateSpeakProgressLocal: (scenarioId, rolePlayName) => {
        set(state => {
            const currentList = state.speakProgress[scenarioId] || [];
            if (!currentList.includes(rolePlayName)) {
                return {
                    speakProgress: {
                        ...state.speakProgress,
                        [scenarioId]: [...currentList, rolePlayName]
                    }
                };
            }
            return {};
        });
    },

    incrementInteractionCount: () => {
        set(state => ({ interactionCount: state.interactionCount + 1 }));
    },

    // --- NEW: Check and Record Daily Access ---
    checkAndRecordDailyAccess: async (deckId) => {
        const { currentUser, isAdmin, hasActiveSubscription, dailyFreeAccess } = get();
        
        // Admins and Subscribers have unlimited access
        if (isAdmin || hasActiveSubscription) return true;
        
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // If user has accessed a deck today
        if (dailyFreeAccess && dailyFreeAccess.date === today) {
            // If it's the SAME deck, allow it
            if (String(dailyFreeAccess.deckId) === String(deckId)) {
                return true;
            }
            // If it's a DIFFERENT deck, block it
            return false;
        }

        // If it's a new day (or first time), allow and record usage
        const newAccess = { date: today, deckId: String(deckId) };
        
        // Update local state immediately
        set({ dailyFreeAccess: newAccess });

        // Persist to Firestore
        if (currentUser) {
            const userDocRef = doc(db, "users", currentUser.uid);
            try {
                await setDoc(userDocRef, { dailyFreeAccess: newAccess }, { merge: true });
            } catch (error) {
                console.error("Error recording daily access:", error);
            }
        }
        
        return true;
    },

    markArticleAsFinished: async (articleId) => {
        const { currentUser, finishedArticles } = get();
        if (!currentUser) return;

        if (!finishedArticles.includes(articleId)) {
            const newFinishedArticles = [...finishedArticles, articleId];
            set({ finishedArticles: newFinishedArticles });
            
            const userDocRef = doc(db, 'users', currentUser.uid);
            await setDoc(userDocRef, { finishedArticles: arrayUnion(articleId) }, { merge: true });
        }
    },

    // --- MODIFIED: Now fetches translations along with saved words ---
    fetchSavedWords: async (force = false) => {
        const { currentUser, savedWordsLoaded } = get();
        if (!currentUser) return;
        
        if (savedWordsLoaded && !force) return;
        
        try {
            // 1. Fetch the user's saved words (IDs, addedAt, active)
            const q = query(
                collection(db, 'users', currentUser.uid, 'savedWords'),
                where("active", "==", true),
                orderBy("addedAt", "desc")
            );
            const savedWordsSnapshot = await getDocs(q);
            
            const wordsSet = new Set();
            const wordsToTranslate = [];
            const savedWordDataMap = new Map(); // Store temp data

            savedWordsSnapshot.docs.forEach(d => {
                const wordId = d.id;
                wordsSet.add(wordId);
                wordsToTranslate.push(wordId);
                savedWordDataMap.set(wordId, d.data()); // Store { addedAt, active }
            });

            if (wordsToTranslate.length === 0) {
                set({ savedWordsSet: new Set(), savedWordsList: [], savedWordsLoaded: true });
                return;
            }

            // 2. Resolve Translations (Cache First)
            const cache = getCache();
            const cachedDictionary = cache.dictionary || {};
            const wordsNeedingFetch = [];

            wordsToTranslate.forEach(wordId => {
                if (!cachedDictionary[wordId]) {
                    wordsNeedingFetch.push(wordId);
                }
            });

            // 3. Fetch only missing words from Firestore
            const chunks = [];
            for (let i = 0; i < wordsNeedingFetch.length; i += 30) {
                chunks.push(wordsNeedingFetch.slice(i, i + 30));
            }

            for (const chunk of chunks) {
                const transQuery = query(
                    collection(db, "dictionary"),
                    where(documentId(), 'in', chunk)
                );
                const querySnapshot = await getDocs(transQuery);
                querySnapshot.forEach((doc) => {
                    cachedDictionary[doc.id] = doc.data().translation;
                });
            }

            // Save updated dictionary to cache if we fetched anything
            if (chunks.length > 0) {
                cache.dictionary = cachedDictionary;
                setCache(cache);
            }

            // 4. Combine the data into the final list
            const fullWordsList = wordsToTranslate.map(wordId => {
                const data = savedWordDataMap.get(wordId);
                return {
                    id: wordId, // This is the Spanish word
                    // Prefer translation in savedWord doc, fallback to dictionary
                    translation: data.translation || cachedDictionary[wordId] || "No translation",
                    vocab: data.vocab || null,
                    source: data.source || null,
                    addedAt: data.addedAt,
                    active: data.active,
                    stage: data.stage || 0,
                    nextReviewDate: data.nextReviewDate || 0
                };
            });

            set({ savedWordsSet: wordsSet, savedWordsList: fullWordsList, savedWordsLoaded: true });

        } catch (error) {
            console.error("Error fetching saved words: ", error);
        }
    },

    // --- MODIFIED: Implements "soft delete" by toggling the 'active' flag ---
    toggleSavedWord: async (spanishWord, data = {}) => {
        const { currentUser, savedWordsSet, savedWordsList } = get();
        // ... (existing code) ...
        if (!currentUser) {
            alert("Please log in to save words.");
            return;
        }

        const wordRef = doc(db, 'users', currentUser.uid, 'savedWords', spanishWord);
        const newSavedWordsSet = new Set(savedWordsSet);

        try {
            if (savedWordsSet.has(spanishWord)) {
                // Word is in the active set, so "remove" it by setting active: false
                await updateDoc(wordRef, { active: false });
                newSavedWordsSet.delete(spanishWord);
                
                // Optimistic Update: Remove from local list
                const newList = savedWordsList.filter(w => w.id !== spanishWord);
                set({ savedWordsSet: newSavedWordsSet, savedWordsList: newList });
            } else {
                // Word is not in the active set, so add it or re-activate it
                const newWordData = { 
                    addedAt: serverTimestamp(), 
                    active: true,
                    stage: 0,
                    nextReviewDate: Date.now(),
                    translation: data.translation || '',
                    vocab: data.vocab || '',
                    source: data.source || null
                };
                
                await setDoc(wordRef, newWordData, { merge: true });
                newSavedWordsSet.add(spanishWord);
                
                // Optimistic Update: Add to local list
                const newItem = {
                    id: spanishWord,
                    ...newWordData,
                    addedAt: { seconds: Date.now() / 1000 } // Mock timestamp for local display
                };
                set({ savedWordsSet: newSavedWordsSet, savedWordsList: [newItem, ...savedWordsList] });
            }
        } catch (error) {
            console.error("Error toggling saved word: ", error);
            alert("Could not save word. Please try again.");
        }
    },

    // --- NEW: Add a specific card/sentence to SRS with metadata ---
    addCardToSRS: async (card, deckTitle) => {
        const { currentUser, savedWordsSet } = get();
        if (!currentUser) return;
        
        const spanish = card.spanish;
        if (!spanish) return;

        const wordRef = doc(db, 'users', currentUser.uid, 'savedWords', spanish);
        
        try {
            await setDoc(wordRef, { 
                addedAt: serverTimestamp(), 
                active: true,
                stage: 0,
                nextReviewDate: Date.now(),
                translation: card.english || '',
                vocab: card.vocab || '',
                source: deckTitle || 'Flashcards'
            }, { merge: true });
            
            const newSet = new Set(savedWordsSet);
            newSet.add(spanish);
            set({ savedWordsSet: newSet });
        } catch (error) {
            console.error("Error adding card to SRS:", error);
        }
    },

    // --- NEW: Advance the SRS stage for a saved word ---
    updateSavedWordProgress: async (wordId) => {
        const { currentUser, savedWordsList } = get();
        if (!currentUser) return;
        
        const wordRef = doc(db, 'users', currentUser.uid, 'savedWords', wordId);
        
        try {
            // Optimization: Use local state instead of fetching the doc again
            const wordData = savedWordsList.find(w => w.id === wordId);
            
            if (wordData) {
                let stage = wordData.stage || 0;
                let nextDate = new Date();
                
                // SRS Logic: 1 day -> 3 days -> 1 week -> 2 weeks -> Mastered (Stage 5)
                if (stage === 0) {
                    nextDate.setDate(nextDate.getDate() + 1);
                    stage = 1;
                } else if (stage === 1) {
                    nextDate.setDate(nextDate.getDate() + 3);
                    stage = 2;
                } else if (stage === 2) {
                    nextDate.setDate(nextDate.getDate() + 7);
                    stage = 3;
                } else if (stage === 3) {
                    nextDate.setDate(nextDate.getDate() + 14);
                    stage = 4;
                } else if (stage >= 4) {
                    stage = 5; // Mastered
                }
                
                // Normalize to midnight so words are due at the start of the day
                nextDate.setHours(0, 0, 0, 0);

                await updateDoc(wordRef, { stage, nextReviewDate: nextDate.getTime() });
                
                // Optimistic Update: Update local state directly without re-fetching everything
                const newList = savedWordsList.map(w => 
                    w.id === wordId ? { ...w, stage, nextReviewDate: nextDate.getTime() } : w
                );
                set({ savedWordsList: newList });
            }
        } catch (error) {
            console.error("Error updating word progress:", error);
        }
    },

    // --- NEW: Reset the SRS stage if forgot ---
    resetSavedWordProgress: async (wordId) => {
        const { currentUser, savedWordsList } = get();
        if (!currentUser) return;
        
        const wordRef = doc(db, 'users', currentUser.uid, 'savedWords', wordId);
        
        try {
            // Reset to stage 0, due immediately
            const now = Date.now();
            await updateDoc(wordRef, { stage: 0, nextReviewDate: now });
            
            const newList = savedWordsList.map(w => 
                w.id === wordId ? { ...w, stage: 0, nextReviewDate: now } : w
            );
            set({ savedWordsList: newList });
        } catch (error) {
            console.error("Error resetting word progress:", error);
        }
    },

    // --- NEW: Action to build the virtual deck for flashcards ---
    prepareTrainingDeck: async (wordsToStudy) => {
        set({ isLoading: true });
        const { savedWordsList } = get();
        const savedMap = new Map(savedWordsList.map(w => [w.id, w]));
        const translations = new Map();
        const chunks = [];
        
        // Chunk the words for Firestore 'in' query
        for (let i = 0; i < wordsToStudy.length; i += 30) {
            chunks.push(wordsToStudy.slice(i, i + 30));
        }

        // Fetch translations for all words in the training deck
        for (const chunk of chunks) {
            const q = query(
                collection(db, "dictionary"),
                where(documentId(), 'in', chunk)
            );
            
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                translations.set(doc.id, doc.data().translation);
            });
        }
        
        // Build the deck object in the format your LessonsView expects
        const trainingCards = wordsToStudy.map(word => {
            const savedData = savedMap.get(word);
            return {
                spanish: word,
                english: savedData?.translation || translations.get(word) || "No translation found",
                vocab: savedData?.vocab,
                source: savedData?.source,
                id: word
            };
        });

        const virtualDeck = {
            title: "Spaced Repetition Training",
            description: "Practice all the words you've saved.",
            cards: trainingCards
        };

        set({ trainingDeck: virtualDeck, isLoading: false });
    },

    addXp: (amount, message) => {
        // ... (function is correct, no changes)
        const { currentUser, streak } = get();
     if (!currentUser) return;

     let bonus = 0;
     const newStreak = streak + 1;

     if (newStreak === 5) {
         bonus = 50;
         set({ streak: 0 });
     } else {
         set({ streak: newStreak });
     }
     
     const totalAmount = amount + bonus;
     
     set(state => ({ totalXp: state.totalXp + totalAmount }));
     const userDocRef = doc(db, 'users', currentUser.uid);
     setDoc(userDocRef, { totalXp: increment(totalAmount) }, { merge: true });
    },

    saveDeckProgress: async (deckId, score, total) => {
        const { currentUser } = get();
        const percentage = Math.round((score / total) * 100)
        if (!currentUser) return;
        
        try {
            await setDoc(doc(db, 'users', currentUser.uid, 'progress', deckId), {
                deckId,
                score,
                total,
                timestamp: serverTimestamp(),
                percentage: percentage
            }, { merge: true });
            // Update local state
            set(state => ({
                deckProgress: {
                    ...state.deckProgress,
                    [deckId]: {
                        ...state.deckProgress[deckId],
                        score,
                        total,
                        percentage: percentage
                    }
                }
            }));
        } catch (error) {
            console.error("Error saving test result:", error);
        }
    },

    resetStreak: () => {
        set({ streak: 0 });
    },
    
    updateListeningPreference: async (pref) => {
        // ... (function is correct, no changes)
        const { currentUser } = get();
        if (!currentUser) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
            await setDoc(userDocRef, { listeningPreference: pref }, { merge: true });
            set({ listeningPreference: pref });
        } catch (error) { console.error("Error updating listening preference: ", error); }
    },

    signInWithGoogle: async () => {
        try { await signInWithPopup(auth, provider); } catch (error) { 
            console.error("Error during sign-in: ", error); 
            throw error;
        }
    },
    signOutUser: async () => {
        try { await signOut(auth); } catch (error) { console.error("Error during sign-out: ", error); }
    },

    fetchDecks: async () => {
        // ... (function is correct, no changes)
        const { isDecksLoading, decks } = get();
        // Prevent double fetch if already loading or if we already have decks (optional)
        if (isDecksLoading || Object.keys(decks).length > 0) return;

        set({ isLoading: true, isDecksLoading: true });
        try {
            const decksCollection = collection(db, 'decks');
            const deckSnapshot = await getDocs(decksCollection);
            const decksData = {};
            deckSnapshot.forEach(doc => { decksData[doc.id] = doc.data(); });
            set({ decks: decksData, isLoading: false, isDecksLoading: false });
        } catch (error) {
            console.error("Error fetching decks: ", error);
            set({ isLoading: false, isDecksLoading: false });
        }
    },

    // --- MODIFIED: fetchArticles now checks version numbers ---
    fetchArticles: async () => {
        const { isArticlesLoading, articles } = get();
        if (isArticlesLoading || (articles && Object.keys(articles).length > 0)) return;

        set({ isLoading: true, isArticlesLoading: true });
        const cache = getCache();
        
        try {
            // 1. Fetch the remote metadata version
            const metadataRef = doc(db, 'appInfo', 'metadata');
            const metadataSnap = await getDoc(metadataRef);
            const remoteArticlesVersion = metadataSnap.exists() ? metadataSnap.data().articlesVersion : 1;

            // 2. Compare with local cached version
            const localArticlesVersion = cache.articlesVersion || 0;

            if (cache.articles && localArticlesVersion === remoteArticlesVersion && isCacheValid(cache.articles.timestamp)) {
                // Cache is valid and version matches, use cache
                set({ articles: cache.articles.data, isLoading: false, isArticlesLoading: false });
                return; 
            }

            // 3. Cache is stale or invalid. Fetch from Firestore.
            const articlesCollection = collection(db, 'articles');
            const articleSnapshot = await getDocs(articlesCollection);
            const articlesData = {};
            articleSnapshot.forEach(doc => {
                articlesData[doc.id] = doc.data();
            });

            // 4. Save new data and the new version number to cache
            cache.articles = {
                timestamp: Date.now(),
                data: articlesData
            };
            cache.articlesVersion = remoteArticlesVersion; // Save the new version
            setCache(cache);

            set({ articles: articlesData, isLoading: false, isArticlesLoading: false });

        } catch (error) {
            console.error("Error fetching articles: ", error);
            // Fallback to cache if network fails but cache exists
            if (cache.articles) {
                set({ articles: cache.articles.data, isLoading: false, isArticlesLoading: false });
            } else {
                set({ isLoading: false, isArticlesLoading: false });
            }
        }
    },

    fetchScenarios: async () => {
        // Cache check: if we already have scenarios, don't re-fetch
        // Also check isScenariosLoading to prevent double-fetch in Strict Mode
        if (get().scenarios.length > 0 || get().isScenariosLoading) return;

        set({ isScenariosLoading: true });
        try {
            // --- OPTIMIZATION: Fetch scenarios and prompts in parallel ---
            const [scenariosSnapshot, promptsDoc] = await Promise.all([
                getDocs(collection(db, 'scenarios')),
                getDoc(doc(db, 'appInfo', 'aiPrompts'))
            ]);

            const fetchedScenarios = scenariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            let instructions = '';
            if (promptsDoc.exists()) {
                instructions = promptsDoc.data().scenariosAiInstructions || '';
                instructions === '' ? alert("AI instructions are missing! Please add them in Firestore to use the Scenarios feature.") : null;
            }

            set({ scenarios: fetchedScenarios, scenariosAiInstructions: instructions, isScenariosLoading: false });
        } catch (error) {
            console.error("Error fetching scenarios:", error);
            set({ isScenariosLoading: false });
        }
    },


    // --- NEW: Fetch translation for a single word on demand ---
    fetchTranslationForWord: async (word) => {
        if (!word) return;
        // Clean the word to ensure we match the dictionary key format
        const normalizedWord = word.toLowerCase().replace(/[^\p{L}]/gu, '');
        if (!normalizedWord) return;

        const { activeArticleTranslations } = get();
        
        // If we already have it in memory, skip the network request
        if (activeArticleTranslations.has(normalizedWord)) return;

        try {
            const wordRef = doc(db, 'dictionary', normalizedWord);
            const wordSnap = await getDoc(wordRef);
            
            const translation = wordSnap.exists() ? wordSnap.data().translation : "No translation found";

            set(state => {
                const newMap = new Map(state.activeArticleTranslations);
                newMap.set(normalizedWord, translation);
                return { activeArticleTranslations: newMap };
            });
        } catch (error) {
            console.error("Error fetching translation for word:", word, error);
        }
    },

    // --- NEW: Fetch all translations for admin to highlight missing words ---
    fetchArticleTranslationsForAdmin: async (articleText) => {
        if (!articleText) return;
        const { activeArticleTranslations } = get();
        
        const matchedWords = articleText.toLowerCase().match(/[\p{L}]+/gu);
        const uniqueWords = [...new Set(matchedWords || [])];
        
        // Filter words that are not yet in the map
        const wordsToFetch = uniqueWords.filter(w => !activeArticleTranslations.has(w));
        
        if (wordsToFetch.length === 0) return;

        const chunks = [];
        for (let i = 0; i < wordsToFetch.length; i += 30) {
            chunks.push(wordsToFetch.slice(i, i + 30));
        }

        // Optimistic update: assume missing until found
        const newTranslations = new Map(activeArticleTranslations);
        wordsToFetch.forEach(w => newTranslations.set(w, "No translation found"));
        
        for (const chunk of chunks) {
            const q = query(
                collection(db, "dictionary"),
                where(documentId(), 'in', chunk)
            );
            
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                newTranslations.set(doc.id, doc.data().translation);
            });
        }
        
        set({ activeArticleTranslations: newTranslations });
    },

    fetchArticleById: async (articleId) => {
        const { loadingArticleId } = get();
        if (loadingArticleId === articleId) return;

        set({ isLoading: true, loadingArticleId: articleId, activeArticleTranslations: new Map() });
        const cache = getCache();

        try {
            // 1. Fetch metadata to check if article cache is valid
            const metadataRef = doc(db, 'appInfo', 'metadata');
            const metadataSnap = await getDoc(metadataRef);
            const remoteArticlesVersion = metadataSnap.exists() ? metadataSnap.data().articlesVersion : 1;

            const cachedDetail = cache.articleDetail[articleId];
            const localArticlesVersion = cache.articlesVersion || 0;

            // 2. Check cache validity
            if (cachedDetail && localArticlesVersion === remoteArticlesVersion && isCacheValid(cachedDetail.timestamp)) {
                const articleData = cachedDetail.data;
                const translations = deserializeMap(cachedDetail.translations);
                
                set((state) => {
                    const updates = { 
                        articles: { ...state.articles, [articleId]: articleData },
                        activeArticleTranslations: translations,
                    };
                    if (state.loadingArticleId === articleId) {
                        updates.isLoading = false;
                        updates.loadingArticleId = null;
                    }
                    return updates;
                });
                return; 
            }

            // 3. Cache is stale, fetch from Firestore
            const articleRef = doc(db, 'articles', articleId);
            const articleSnap = await getDoc(articleRef);

            if (articleSnap.exists()) {
                const articleData = articleSnap.data();
                
                // Reset translations map for the new article
                set({ activeArticleTranslations: new Map() });
                const translations = new Map();

                // 4. Save new data to cache
                cache.articleDetail[articleId] = {
                    timestamp: Date.now(),
                    data: articleData,
                    translations: serializeMap(translations) 
                };
                // Ensure the main cache version is also updated
                cache.articlesVersion = remoteArticlesVersion;
                setCache(cache);
                
                set((state) => {
                    const updates = { 
                        articles: { ...state.articles, [articleId]: articleData },
                    };
                    if (state.loadingArticleId === articleId) {
                        updates.isLoading = false;
                        updates.loadingArticleId = null;
                    }
                    return updates;
                });

            } else {
                console.error("No such article found!");
                set((state) => state.loadingArticleId === articleId ? { isLoading: false, loadingArticleId: null } : {});
            }
        } catch (error) {
            console.error("Error fetching single article: ", error);
            set((state) => state.loadingArticleId === articleId ? { isLoading: false, loadingArticleId: null } : {});
        }
    },

    saveDeck: async (deckData, deckId) => {
        // ... (function is correct, no changes)
        try {
            if (deckId) { await updateDoc(doc(db, 'decks', deckId), deckData); } 
            else { await addDoc(collection(db, 'decks'), deckData); }
            await get().fetchDecks();
        } catch (error) {
            console.error("Error saving deck: ", error);
            alert("Failed to save deck. Please try again.");
        }
    },

    saveArticle: async (articleData, articleId) => {
        // ... (function is correct, no changes)
        try {
            if (articleId) {
                const articleRef = doc(db, 'articles', articleId);
                await updateDoc(articleRef, articleData);
            } else {
                await addDoc(collection(db, 'articles'), articleData);
            }
        } catch (error) {
            console.error("Error saving article: ", error);
            alert("Failed to save article. Please try again.");
        }
    },

    saveWord: async (wordData) => {
        try {
            const wordRef = doc(db, 'dictionary', wordData.spanish);
            await setDoc(wordRef, { translation: wordData.translation });
            // --- FIX: Removed call to non-existent fetchDictionary() ---
        } catch (error) {
            console.error("Error saving word: ", error);
            alert("Failed to save word.");
        }
    },
    // --- MODIFIED: This now also invalidates the article list cache ---
    saveWordTranslation: async (spanishWord, newTranslation) => {
        // ... (admin check is the same) ...
        if (!get().isAdmin) {
            console.error("User is not authorized to perform this action.");
            alert("You do not have permission to edit the dictionary.");
            return;
        }
        try {
            const wordRef = doc(db, 'dictionary', spanishWord);
            await setDoc(wordRef, { translation: newTranslation });
    
            set(state => {
                const newTranslations = new Map(state.activeArticleTranslations);
                newTranslations.set(spanishWord, newTranslation);
                return { activeArticleTranslations: newTranslations };
            });

            // --- MODIFIED: Invalidate all caches on edit ---
            const cache = getCache();
            cache.articleDetail = {}; // Clear all detailed article caches
            cache.articlesVersion = 0; // Force-invalidate the main article list
            setCache(cache);
            
        } catch (error) {
            console.error("Error saving word translation: ", error);
            alert("Failed to save translation. Please try again.");
        }
    },
}));
