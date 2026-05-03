const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * Securely creates or updates a deck.
 * Only accessible by admins.
 */
exports.saveDeck = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const db = admin.firestore();
    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    
    // Verify admin status via custom claim OR Firestore user document
    const isAdmin = request.auth.token.admin === true || (userDoc.exists && userDoc.data().isAdmin === true);

    if (!isAdmin) {
        throw new HttpsError('permission-denied', 'Only admins can save decks.');
    }

    const { deckData, deckId } = request.data;

    if (!deckData || typeof deckData !== 'object') {
        throw new HttpsError('invalid-argument', 'Valid deck data is required.');
    }
    
    try {
        if (deckId) {
            await db.collection('decks').doc(deckId).set(deckData, { merge: true });
        } else {
            await db.collection('decks').add(deckData);
        }
        return { success: true };
    } catch (error) {
        console.error("Error saving deck:", error);
        throw new HttpsError('internal', 'Failed to save the deck.');
    }
});

/**
 * Securely creates or updates an article.
 * Only accessible by admins.
 */
exports.saveArticle = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const db = admin.firestore();
    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    
    // Verify admin status via custom claim OR Firestore user document
    const isAdmin = request.auth.token.admin === true || (userDoc.exists && userDoc.data().isAdmin === true);

    if (!isAdmin) {
        throw new HttpsError('permission-denied', 'Only admins can save articles.');
    }

    const { articleData, articleId } = request.data;

    if (!articleData || typeof articleData !== 'object') {
        throw new HttpsError('invalid-argument', 'Valid article data is required.');
    }
    
    try {
        if (articleId) {
            await db.collection('articles').doc(articleId).set(articleData, { merge: true });
        } else {
            await db.collection('articles').add(articleData);
        }
        return { success: true };
    } catch (error) {
        console.error("Error saving article:", error);
        throw new HttpsError('internal', 'Failed to save the article.');
    }
});