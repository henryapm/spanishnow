const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

/**
 * Triggered whenever a user's subscription document is created, updated, or deleted.
 * Evaluates the status of all subscriptions in the users/{uid}/subscriptions subcollection
 * and updates the hasActiveSubscription flag on the parent users/{uid} document.
 */
exports.syncSubscriptionStatus = onDocumentWritten("users/{uid}/subscriptions/{subscriptionId}", async (event) => {
    const uid = event.params.uid;
    const db = admin.firestore();
    
    console.log(`[syncSubscriptionStatus] Triggered for user: ${uid}`);
    
    const subscriptionsRef = db.collection('users').doc(uid).collection('subscriptions');
    const userRef = db.collection('users').doc(uid);
    
    try {
        const querySnapshot = await subscriptionsRef.get();
        let hasActiveSubscription = false;
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`[syncSubscriptionStatus] Subscription ${doc.id} status: ${data.status}`);
            // Stripe active/trialing statuses represent active access
            if (data.status === 'active' || data.status === 'trialing') {
                hasActiveSubscription = true;
            }
        });
        
        await userRef.update({ hasActiveSubscription });
        console.log(`[syncSubscriptionStatus] Successfully updated hasActiveSubscription to ${hasActiveSubscription} for user: ${uid}`);
    } catch (error) {
        console.error(`[syncSubscriptionStatus] Error syncing status for user ${uid}:`, error);
    }
});
