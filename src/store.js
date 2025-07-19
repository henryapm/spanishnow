import { create } from 'zustand';
import { db } from './firebase';
// Add setDoc and getDoc to the imports
import { collection, getDocs, addDoc, doc, updateDoc, setDoc, getDoc, increment } from "firebase/firestore"; 
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import toast from 'react-hot-toast'; // Import the toast library

const auth = getAuth();
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export const useDecksStore = create((set, get) => ({
  // --- STATE ---
  decks: {},
  isLoading: true,
  currentUser: null,
  isAdmin: false,
  purchasedDeckIds: [],
  progress: {},
  listeningPreference: 'es-ES',
  // --- NEW: Gamification State ---
  totalXp: 0, // User's total experience points
  streak: 0,  // User's current correct answer streak

  // --- ACTIONS ---
  
  listenForAuthChanges: () => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const tokenResult = await user.getIdTokenResult();
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let userPreference = 'es-ES';
        let userXp = 0;
        if (userDocSnap.exists()) {
            userPreference = userDocSnap.data().listeningPreference || 'es-ES';
            userXp = userDocSnap.data().totalXp || 0;
        }

        // Fetch purchases and progress (condensed for brevity)
        const purchaseSnapshot = await getDocs(collection(db, 'users', user.uid, 'purchasedDecks'));
        const purchasedIds = purchaseSnapshot.docs.map(d => d.id);
        const progressSnapshot = await getDocs(collection(db, 'users', user.uid, 'progress'));
        const progressData = {};
        progressSnapshot.forEach(d => { progressData[d.id] = d.data().mastery; });

        set({ 
          currentUser: user, 
          isAdmin: tokenResult.claims.admin === true,
          purchasedDeckIds: purchasedIds,
          progress: progressData,
          listeningPreference: userPreference,
          totalXp: userXp, // Load user's total XP
          streak: 0 // Reset streak on login
        });
      } else {
        set({ currentUser: null, isAdmin: false, purchasedDeckIds: [], progress: {}, listeningPreference: 'es-ES', totalXp: 0, streak: 0 });
      }
    });
  },

  // --- NEW: Action to add XP and handle streaks ---
  addXp: (amount, message) => {
    const { currentUser, streak } = get();
    if (!currentUser) return;

    let bonus = 0;
    const newStreak = streak + 1;

    // Check for a streak of 5
    if (newStreak === 5) {
        bonus = 50; // Award 50 bonus XP
        toast.success('🔥 5 in a row! +50 Bonus XP!');
        set({ streak: 0 }); // Reset streak after bonus
    } else {
        set({ streak: newStreak });
    }
    
    const totalAmount = amount + bonus;
    toast.success(`${message} +${totalAmount} XP`);
    
    // Update total XP in the store and in Firestore
    set(state => ({ totalXp: state.totalXp + totalAmount }));
    const userDocRef = doc(db, 'users', currentUser.uid);
    setDoc(userDocRef, { totalXp: increment(totalAmount) }, { merge: true });
  },

  // --- NEW: Action to reset the streak ---
  resetStreak: () => {
    set({ streak: 0 });
  },

  // --- UPDATED: This action no longer handles XP ---
  updateCardProgress: async (deckId, cardId, knewIt) => {
    const { currentUser, progress } = get();
    if (!currentUser) return;

    // This function is now only responsible for updating the mastery level.
    const currentMastery = progress[deckId]?.[cardId] || 0;
    const newMastery = knewIt ? currentMastery + 1 : Math.max(0, currentMastery - 1);
    const progressRef = doc(db, 'users', currentUser.uid, 'progress', deckId);
    try {
        await setDoc(progressRef, { mastery: { [cardId]: newMastery } }, { merge: true });
        set(state => ({
            progress: { ...state.progress, [deckId]: { ...state.progress[deckId], [cardId]: newMastery } }
        }));
    } catch (error) { console.error("Error updating progress: ", error); }
  },

  // --- NEW: Action to update listening preference ---
  updateListeningPreference: async (newPreference) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
        // Use set with merge: true to create or update the user document
        await setDoc(userDocRef, { listeningPreference: newPreference }, { merge: true });
        // Update local state immediately for a responsive UI
        set({ listeningPreference: newPreference });
    } catch (error) {
        console.error("Error updating listening preference: ", error);
    }
  },

  // --- Other Actions (no changes needed) ---
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
  updateCardProgress: async (deckId, cardId, knewIt) => {
    const { currentUser, progress } = get();
    if (!currentUser) return;
    const currentMastery = progress[deckId]?.[cardId] || 0;
    const newMastery = knewIt ? currentMastery + 1 : Math.max(0, currentMastery - 1);
    const progressRef = doc(db, 'users', currentUser.uid, 'progress', deckId);
    try {
        await setDoc(progressRef, { mastery: { [cardId]: newMastery } }, { merge: true });
        set(state => ({
            progress: { ...state.progress, [deckId]: { ...state.progress[deckId], [cardId]: newMastery } }
        }));
    } catch (error) { console.error("Error updating progress: ", error); }
  },
}));