import { create } from 'zustand';
import { db } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, setDoc, getDoc, increment } from "firebase/firestore"; 
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
  articles: {}, // New state for articles
  dictionary: {}, // New state for the dictionary
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
        let subscriptionStatus = false; // Default to no subscription

        if (userDocSnap.exists()) {
            userPreference = userDocSnap.data().listeningPreference || 'es-ES';
            userXp = userDocSnap.data().totalXp || 0;
            subscriptionStatus = userDocSnap.data().hasActiveSubscription === true;
        }

        const purchaseSnapshot = await getDocs(collection(db, 'users', user.uid, 'purchasedDecks'));
        const purchasedIds = purchaseSnapshot.docs.map(d => d.id);
        const progressSnapshot = await getDocs(collection(db, 'users', user.uid, 'progress'));
        const progressData = {};
        progressSnapshot.forEach(d => { progressData[d.id] = d.data().mastery; });

        set({ 
          currentUser: user, 
          isAdmin: tokenResult.claims.admin === true,
          hasActiveSubscription: subscriptionStatus, // Set the user's subscription status
          progress: progressData,
          listeningPreference: userPreference,
          totalXp: userXp,
          streak: 0
        });
      } else {
        set({ currentUser: null, isAdmin: false, purchasedDeckIds: [], progress: {}, listeningPreference: 'es-ES', totalXp: 0, streak: 0 });
      }
    });
  },

  addXp: (amount, message) => {
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
    const { currentUser, progress } = get();
    if (!currentUser) return;

    const currentMastery = progress[deckId]?.[cardId] || 0;
    
    // --- CORRECTED LOGIC ---
    // If the user knew it, increment the mastery level.
    // If they clicked "Review Again", set the mastery level directly to 0.
    const newMastery = knewIt ? currentMastery + 1 : 0;

    const progressRef = doc(db, 'users', currentUser.uid, 'progress', deckId);
    try {
        // --- FIX: Use dot notation to update a specific field within a map ---
        // This ensures we only update the progress for the current card,
        // without overwriting the progress for all other cards in the deck.
        await setDoc(progressRef, { 
            mastery: { [cardId]: newMastery } 
        }, { merge: true });

        // Update local state immediately for a responsive UI
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

  // Other actions (condensed for brevity)
  updateListeningPreference: async (pref) => {
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
  // --- NEW: Action to fetch articles ---
  fetchArticles: async () => {
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
  // --- OLD `fetchDictionary` function is REMOVED ---

  // --- NEW: Action to fetch translations on-demand for specific text ---
  fetchTranslationsForArticle: async (articleText) => {
    set({ isDictionaryLoading: true });
    
    // 1. Extract unique words from the article text
    // This regex finds word boundaries and converts to lowercase to avoid duplicates
    const uniqueWords = [...new Set(articleText.toLowerCase().match(/\b(\w+)\b/g) || [])];
    
    if (uniqueWords.length === 0) {
      set({ activeArticleTranslations: new Map(), isDictionaryLoading: false });
      return;
    }

    const translations = new Map();
    const chunks = [];
    
    // 2. Firestore 'in' queries are limited to 30 items, so we chunk the words
    for (let i = 0; i < uniqueWords.length; i += 30) {
      chunks.push(uniqueWords.slice(i, i + 30));
    }

    // 3. Fetch translations for each chunk
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

  // --- NEW: Action to fetch a single article and its translations ---
  fetchArticleById: async (articleId) => {
    set({ isLoading: true, activeArticleTranslations: new Map() }); // Reset state
    try {
      const articleRef = doc(db, 'articles', articleId);
      const articleSnap = await getDoc(articleRef);

      if (articleSnap.exists()) {
        const articleData = articleSnap.data();
        // Set the single article in the state
        set({ articles: { [articleId]: articleData } }); 
        
        // Now, trigger the on-demand translation fetch using the article's content
        await get().fetchTranslationsForArticle(articleData.content);

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
    try {
      if (deckId) { await updateDoc(doc(db, 'decks', deckId), deckData); } 
      else { await addDoc(collection(db, 'decks'), deckData); }
      await get().fetchDecks();
    } catch (error) {
      console.error("Error saving deck: ", error);
      alert("Failed to save deck. Please try again.");
    }
  },
  // --- NEW: Action to save articles ---
  saveArticle: async (articleData, articleId) => {
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
  // --- NEW: Action to save a word to the dictionary ---
  saveWord: async (wordData) => {
      try {
          // The document ID is the Spanish word itself for easy lookup
          const wordRef = doc(db, 'dictionary', wordData.spanish);
          await setDoc(wordRef, { translation: wordData.translation });
          // Refresh the dictionary in the store
          get().fetchDictionary();
      } catch (error) {
          console.error("Error saving word: ", error);
          alert("Failed to save word.");
      }
  },
}));
