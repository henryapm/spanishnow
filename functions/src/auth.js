const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { onCall, HttpsError } = require("firebase-functions/v2/https");

/**
 * Server-side gatekeeper for Google Auth.
 * Ensures new users can only join via the explicit "Sign Up" flow.
 */
exports.verifyAuthFlow = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;
    const { isSignUpFlow } = request.data;

    if (typeof isSignUpFlow !== 'boolean') {
        throw new HttpsError('invalid-argument', 'The "isSignUpFlow" flag must be a boolean.');
    }

    const db = admin.firestore();
    const userDocRef = db.collection('users').doc(uid);

    try {
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            if (isSignUpFlow === false) {
                // Scenario A: Invalid Sign-In (New user clicked "Sign In")
                await admin.auth().deleteUser(uid);
                throw new HttpsError('not-found', 'Account not found. Please use the Sign Up button to create an account.');
            } else {
                // Scenario B: Valid Sign-Up
                const userRecord = await admin.auth().getUser(uid);
                const newUserProfile = {
                    uid: uid,
                    displayName: userRecord.displayName || 'New User',
                    email: userRecord.email || '',
                    photoURL: userRecord.photoURL || '',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    listeningPreference: 'es-US',
                    isAdmin: false,
                    hasActiveSubscription: false,
                    timezone: 'UTC', // Default timezone
                    legal: {
                        termsVersion: '1.0',
                        termsAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }
                };
                await userDocRef.set(newUserProfile);
                return { success: true, message: 'Account created successfully.' };
            }
        } else {
            // Scenario C: Valid Sign-In (or existing user accidentally clicking Sign Up)
            return { success: true, message: 'Logged in successfully.' };
        }
    } catch (error) {
        console.error(`Error in verifyAuthFlow for user ${uid}:`, error);
        if (error.code) throw error; // Re-throw specific HttpsErrors (like 'not-found')
        throw new HttpsError('internal', 'An error occurred during authentication verification.');
    }
});

/**
 * Cleans up user data from Firestore when a user is deleted from Firebase Auth.
 * This is crucial for handling aborted sign-ups and regular account deletions.
 */
exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
    const db = admin.firestore();
    const userDocRef = db.collection('users').doc(user.uid);
    // Note: For a production app with more subcollections, a recursive delete helper is recommended.
    return userDocRef.delete();
});
