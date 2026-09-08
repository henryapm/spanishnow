const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * Securely updates a user's progress for a flashcard deck.
 * Prevents malicious users from writing arbitrary or corrupted progress data directly to Firestore.
 */
exports.saveDeckProgress = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Require email verification
    if (!request.auth.token.email_verified) {
        throw new HttpsError('failed-precondition', 'Email verification required.');
    }

    const uid = request.auth.uid;
    const { deckId, score, total } = request.data;

    // Strict Input Validation
    if (!deckId || typeof deckId !== 'string' || deckId.trim() === '' || deckId.length > 100) {
        throw new HttpsError('invalid-argument', 'A valid deck ID (1-100 characters) is required.');
    }

    if (typeof score !== 'number' || score < 0 || !Number.isFinite(score)) {
        throw new HttpsError('invalid-argument', 'Score must be a non-negative number.');
    }

    if (typeof total !== 'number' || total <= 0 || !Number.isFinite(total)) {
        throw new HttpsError('invalid-argument', 'Total must be a positive number.');
    }

    const sanitizedScore = Math.min(score, total);
    const percentage = Math.round((sanitizedScore / total) * 100);

    const db = admin.firestore();
    const progressRef = db.collection('users').doc(uid).collection('progress').doc(deckId);

    try {
        await progressRef.set({
            percentage,
            score: sanitizedScore,
            total,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return { success: true, percentage };
    } catch (error) {
        console.error("Error saving deck progress:", error);
        throw new HttpsError('internal', 'Failed to save deck progress.');
    }
});
