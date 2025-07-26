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
  hasActiveSubscription: false, // Replaces purchasedDeckIds
  progress: {},
  listeningPreference: 'es-ES',
  totalXp: 0,
  streak: 0,

  // --- ACTIONS ---
  
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
}));
