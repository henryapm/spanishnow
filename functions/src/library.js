const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const { FieldValue } = require("firebase-admin/firestore");
const { addXpInTransaction, XP_FOR_READING } = require("./xp.js");
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
    const finishedArticleRef = userRef.collection('finishedArticles').doc(articleId);


    try {
        // Perform both operations in a single atomic transaction
        await db.runTransaction(async (t) => {
            // READ FIRST: Read both documents we might interact with.
            const [userDoc, finishedDoc] = await t.getAll(userRef, finishedArticleRef);

            if (finishedDoc.exists) {
                return; // Exit gracefully if already finished.
            }

            if (!userDoc.exists) {
                throw new HttpsError('not-found', 'User document not found.');
            }

            // WRITE operations: These are now queued after all reads.
            await addXpInTransaction(t, userRef, userDoc, XP_FOR_READING);

            // Create a document in the subcollection to mark it as finished.
            t.set(finishedArticleRef, { finishedAt: FieldValue.serverTimestamp() });
        });
        return { success: true };
    } catch (error) {
        // Log the detailed error on the backend
        console.error("FATAL: Error in [markArticleAsFinished] transaction:", error);
        // Send a more informative error message to the client for debugging
        throw new HttpsError('internal', `Failed to mark article as finished. Reason: ${error.message}`);
    }
});