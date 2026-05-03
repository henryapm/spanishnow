const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * Securely updates a user's listening preference.
 * Prevents malicious users from writing arbitrary fields (like isAdmin) to their user document.
 */
exports.updateListeningPreference = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;
    const { preference } = request.data;

    // Strict Input Validation
    if (!preference || typeof preference !== 'string' || preference.length > 20) {
        throw new HttpsError('invalid-argument', 'A valid preference string is required.');
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);

    try {
        // Only update the explicitly allowed field
        await userRef.set({ listeningPreference: preference }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error updating listening preference:", error);
        throw new HttpsError('internal', 'Failed to update user preference.');
    }
});
