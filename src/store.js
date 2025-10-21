import { create } from 'zustand';
import { db } from './firebase';
// --- FIX: Added query, where, and documentId to the import list ---
import { collection, getDocs, addDoc, doc, updateDoc, setDoc, getDoc, increment, query, where, documentId } from "firebase/firestore"; 
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

const auth = getAuth();
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

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

    fetchArticles: async () => {
        // ... (function is correct, no changes)
        set({ isLoading: true });
        try {
            const articlesCollection = collection(db, 'articles');
            const articleSnapshot = await getDocs(articlesCollection);
            const articlesData = {};
            articleSnapshot.forEach(doc => {
                articlesData[doc.id] = doc.data();
            });
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
        
        const uniqueWords = [...new Set(articleText.toLowerCase().match(/\b(\w+)\b/g) || [])];
        
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

    fetchArticleById: async (articleId) => {
        set({ isLoading: true, activeArticleTranslations: new Map() });
        try {
            const articleRef = doc(db, 'articles', articleId);
            const articleSnap = await getDoc(articleRef);

            if (articleSnap.exists()) {
                const articleData = articleSnap.data();
                set((state) => ({ articles: { ...state.articles, [articleId]: articleData } }));
                
                if (articleData.sentences && Array.isArray(articleData.sentences)) {
                    const fullText = articleData.sentences.map(s => s.spanish).join(' ');
                    await get().fetchTranslationsForArticle(fullText);
                } else {
                    await get().fetchTranslationsForArticle('');
                }

            } else {
                console.error("No such article found!");
            }
        } catch (error) {
            console.error("Error fetching single article: ", error);
        } finally {
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
}));
