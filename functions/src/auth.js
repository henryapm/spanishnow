const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
    const db = admin.firestore();
    const userDocRef = db.collection('users').doc(user.uid);

    const newUserProfile = {
        uid: user.uid,
        displayName: user.displayName || 'New User',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        listeningPreference: 'es-US', // finishedArticles is now a subcollection
        isAdmin: false,
        hasActiveSubscription: false,
        legal: {
            termsVersion: '1.0', // It's good practice to version your terms
            termsAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        }
    };

    await userDocRef.set(newUserProfile);
});
