const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const { FieldValue } = require("firebase-admin/firestore");
/**
 * Securely marks an article as finished for a user.
 * Prevents payload injection and enforces string limits.
 */
exports.markArticleAsFinished = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;
    const { articleId } = request.data;

    // Strict Input Validation
    if (!articleId || typeof articleId !== 'string' || articleId.trim() === '' || articleId.length > 100) {
        throw new HttpsError('invalid-argument', 'A valid article ID is required.');
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);

    try {
        // Use arrayUnion to securely append the ID without allowing the user to dictate the entire array structure
        await userRef.set({ finishedArticles: FieldValue.arrayUnion(articleId) }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error marking article as finished:", error);
        throw new HttpsError('internal', 'Failed to update finished articles.');
    }
});