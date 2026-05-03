const { onCall, HttpsError } = require("firebase-functions/v2/https"); // Make sure to use v2
const admin = require("firebase-admin");

exports.updateDictionary = onCall(async (request) => {
    if (!request.auth || !request.auth.token.admin) {
        throw new HttpsError('permission-denied', 'You must be an admin to update the dictionary.');
    }

    const { spanishWord, translation } = request.data;

    if (!spanishWord || typeof spanishWord !== 'string' || !translation || typeof translation !== 'string') {
        throw new HttpsError('invalid-argument', 'Invalid word or translation provided.');
    }

    const wordRef = admin.firestore().doc(`dictionary/${spanishWord.toLowerCase()}`);
    await wordRef.set({ translation: translation });

    return { success: true };
});

/**
 * Securely creates or updates a dictionary word.
 * Only accessible by admins.
 */
exports.saveWord = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const db = admin.firestore();
    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    
    // Verify admin status via custom claim OR Firestore user document
    const isAdmin = request.auth.token.admin === true || (userDoc.exists && userDoc.data().isAdmin === true);

    if (!isAdmin) {
        throw new HttpsError('permission-denied', 'Only admins can save words.');
    }

    const { wordData } = request.data;

    if (!wordData || typeof wordData.spanish !== 'string' || typeof wordData.translation !== 'string') {
        throw new HttpsError('invalid-argument', 'Valid word data is required.');
    }
    
    try {
        await db.collection('dictionary').doc(wordData.spanish).set({ translation: wordData.translation }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error saving word:", error);
        throw new HttpsError('internal', 'Failed to save the word.');
    }
});