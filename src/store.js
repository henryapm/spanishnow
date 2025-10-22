import { create } from 'zustand';
import { db } from './firebase';
// --- FIX: Added query, where, and documentId to the import list ---
import { collection, getDocs, addDoc, doc, updateDoc, setDoc, getDoc, increment, query, where, documentId } from "firebase/firestore"; 
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

const auth = getAuth();
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// --- Caching Configuration ---
const CACHE_KEY = 'spanishAppCache';
const CACHE_DURATION = 168 * 60 * 60 * 1000; // 7 days

// --- Cache Helper Functions ---

/**
 * Gets the entire cache object from localStorage.
 */
function getCache() {
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (!cachedData) {
    // Return a default structure if no cache exists
    return { articles: null, articleDetail: {} };
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
    isLoading: true,
    currentUser: null,
    isAdmin: false,
    hasActiveSubscription: false,
    articles: {},
    // --- MODIFIED: This will now hold translations for ONLY the active article ---
    activeArticleTranslations: new Map(),
    isDictionaryLoading: false, // To show a loading state for translations
    progress: {},
    listeningPreference: 'es-ES',
    totalXp: 0,
    streak: 0,

    // --- ACTIONS ---
    toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light',
    })),

    listenForAuthChanges: () => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const tokenResult = await user.getIdTokenResult();
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                
                let userPreference = 'es-ES';
                let userXp = 0;
                let subscriptionStatus = false;

                if (userDocSnap.exists()) {
                    userPreference = userDocSnap.data().listeningPreference || 'es-ES';
                    userXp = userDocSnap.data().totalXp || 0;
                    subscriptionStatus = userDocSnap.data().hasActiveSubscription === true;
                }

                const progressSnapshot = await getDocs(collection(db, 'users', user.uid, 'progress'));
                const progressData = {};
                progressSnapshot.forEach(d => { progressData[d.id] = d.data().mastery; });

                set({ 
                    currentUser: user, 
                    isAdmin: tokenResult.claims.admin === true,
                    hasActiveSubscription: subscriptionStatus,
                    progress: progressData,
                    listeningPreference: userPreference,
                    totalXp: userXp,
                    streak: 0
                });
            } else {
                set({ currentUser: null, isAdmin: false, progress: {}, listeningPreference: 'es-ES', totalXp: 0, streak: 0 });
            }
        });
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

    resetStreak: () => {
        set({ streak: 0 });
    },

    updateCardProgress: async (deckId, cardId, knewIt) => {
        // ... (function is correct, no changes)
        const { currentUser, progress } = get();
        if (!currentUser) return;
        const currentMastery = progress[deckId]?.[cardId] || 0;
        const newMastery = knewIt ? currentMastery + 1 : 0;
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', deckId);
        try {
            await setDoc(progressRef, { 
                mastery: { [cardId]: newMastery } 
            }, { merge: true });
            set(state => ({
                progress: { 
                    ...state.progress, 
                    [deckId]: { 
                        ...state.progress[deckId], 
                        [cardId]: newMastery 
                    } 
                }
            }));
        } catch (error) { console.error("Error updating progress: ", error); }
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
        try { await signInWithPopup(auth, provider); } catch (error) { console.error("Error during sign-in: ", error); }
    },
    signOutUser: async () => {
        try { await signOut(auth); } catch (error) { console.error("Error during sign-out: ", error); }
    },

    fetchDecks: async () => {
        // ... (function is correct, no changes)
        set({ isLoading: true });
        try {
            const decksCollection = collection(db, 'decks');
            const deckSnapshot = await getDocs(decksCollection);
            const decksData = {};
            deckSnapshot.forEach(doc => { decksData[doc.id] = doc.data(); });
            set({ decks: decksData, isLoading: false });
        } catch (error) {
            console.error("Error fetching decks: ", error);
            set({ isLoading: false });
        }
    },

    // --- MODIFIED: Caching added ---
    fetchArticles: async () => {
        set({ isLoading: true });

        // 1. Check cache
        const cache = getCache();
        if (cache.articles && isCacheValid(cache.articles.timestamp)) {
            set({ articles: cache.articles.data, isLoading: false });
            return; // Use cached data
        }

        // 2. If cache invalid, fetch from Firestore
        try {
            const articlesCollection = collection(db, 'articles');
            const articleSnapshot = await getDocs(articlesCollection);
            const articlesData = {};
            articleSnapshot.forEach(doc => {
                articlesData[doc.id] = doc.data();
            });

            // 3. Save to cache
            cache.articles = {
                timestamp: Date.now(),
                data: articlesData
            };
            setCache(cache);
            
            set({ articles: articlesData, isLoading: false });
        } catch (error) {
            console.error("Error fetching articles: ", error);
            set({ isLoading: false });
        }
    },

    fetchTranslationsForArticle: async (articleText) => {
        set({ isDictionaryLoading: true });
        
        if (typeof articleText !== 'string' || !articleText) {
            set({ activeArticleTranslations: new Map(), isDictionaryLoading: false });
            return;
        }
        
        // The /[\p{L}]+/gu regex matches sequences of Unicode letter characters.
        const matchedWords = articleText.toLowerCase().match(/[\p{L}]+/gu);
        const uniqueWords = [...new Set(matchedWords || [])];
        
        if (uniqueWords.length === 0) {
            set({ activeArticleTranslations: new Map(), isDictionaryLoading: false });
            return;
        }

        const translations = new Map();
        const chunks = [];
        
        for (let i = 0; i < uniqueWords.length; i += 30) {
            chunks.push(uniqueWords.slice(i, i + 30));
        }

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
        
        set({ activeArticleTranslations: translations, isDictionaryLoading: false });
    },

    // --- MODIFIED: Caching added ---
    fetchArticleById: async (articleId) => {
        set({ isLoading: true, activeArticleTranslations: new Map() });

        // 1. Check cache for this specific article
        const cache = getCache();
        const cachedDetail = cache.articleDetail[articleId];
        
        if (cachedDetail && isCacheValid(cachedDetail.timestamp)) {
            const articleData = cachedDetail.data;
            const translations = deserializeMap(cachedDetail.translations);
            
            set((state) => ({ 
                articles: { ...state.articles, [articleId]: articleData },
                activeArticleTranslations: translations,
                isLoading: false
            }));
            return; // Use cached data
        }

        // 2. If cache invalid, fetch from Firestore
        try {
            const articleRef = doc(db, 'articles', articleId);
            const articleSnap = await getDoc(articleRef);

            if (articleSnap.exists()) {
                const articleData = articleSnap.data();
                
                let fullText = '';
                if (articleData.sentences && Array.isArray(articleData.sentences)) {
                    fullText = articleData.sentences.map(s => s.spanish).join(' ');
                }
                
                // Fetch translations and wait for them to be set in the state
                await get().fetchTranslationsForArticle(fullText); 
                
                const translations = get().activeArticleTranslations; // Get the newly fetched translations

                // 3. Save to cache
                cache.articleDetail[articleId] = {
                    timestamp: Date.now(),
                    data: articleData,
                    translations: serializeMap(translations) // Serialize the Map
                };
                setCache(cache);
                
                // 4. Set article state (translations are already set)
                set((state) => ({ 
                    articles: { ...state.articles, [articleId]: articleData },
                    isLoading: false 
                }));

            } else {
                console.error("No such article found!");
                set({ isLoading: false });
            }
        } catch (error) {
            console.error("Error fetching single article: ", error);
            set({ isLoading: false });
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
    // --- MODIFIED: Cache invalidation added ---
    saveWordTranslation: async (spanishWord, newTranslation) => {
        if (!get().isAdmin) {
            console.error("User is not authorized to perform this action.");
            alert("You do not have permission to edit the dictionary.");
            return;
        }
        try {
            const wordRef = doc(db, 'dictionary', spanishWord);
            await setDoc(wordRef, { translation: newTranslation });
    
            // Update local state immediately
            set(state => {
                const newTranslations = new Map(state.activeArticleTranslations);
                newTranslations.set(spanishWord, newTranslation);
                return { activeArticleTranslations: newTranslations };
            });

            // --- IMPORTANT: Invalidate the cache ---
            // This clears all cached articles, forcing a refetch on next view.
            // This ensures users will see the new translation.
            const cache = getCache();
            cache.articleDetail = {}; // Clear all cached article details
            setCache(cache);
            
        } catch (error) {
            console.error("Error saving word translation: ", error);
            alert("Failed to save translation. Please try again.");
        }
    },
}));
