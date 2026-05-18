const { HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const XP_FOR_READING = 10;
const XP_FOR_SRS = 2;
const XP_FOR_CHAT = 3;

const addXpInTransaction = async (transaction, userRef, userDoc, xpToAdd) => {
    console.log(`[addXpInTransaction] Starting. Awarding ${xpToAdd} XP.`);
    if (xpToAdd <= 0) {
        console.log('[addXpInTransaction] xpToAdd is 0 or less, returning.');
        return;
    }

    const userData = userDoc.data();
    const timezone = userData.timezone || 'UTC'; // Default to UTC if not set

    const now = new Date();
    // Use 'fr-CA' locale to get a reliable 'YYYY-MM-DD' format.
    const todayDateString = new Intl.DateTimeFormat('fr-CA', { timeZone: timezone }).format(now);

    const lastXpDate = userData.lastXpDate;
    let newStreak = userData.streak || 0;
    
    // Use dot notation to update a map field. This will store XP for each day.
    const historyField = `xpHistory.${todayDateString}`;

    const updates = {
        totalXp: admin.firestore.FieldValue.increment(xpToAdd),
        [historyField]: admin.firestore.FieldValue.increment(xpToAdd)
    };

    if (lastXpDate !== todayDateString) {
        // It's a new day for the user.
        const today = new Date(todayDateString + 'T12:00:00Z'); // Use noon UTC to avoid DST issues
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayDateString = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;

        if (lastXpDate === yesterdayDateString) {
            // It's a consecutive day, increment streak.
            newStreak++;
        } else {
            // The streak is broken, start a new one.
            newStreak = 1;
        }
        updates.dailyXp = xpToAdd;
        updates.streak = newStreak;
        updates.lastXpDate = todayDateString;
    } else {
        // It's the same day, just increment daily XP.
        updates.dailyXp = admin.firestore.FieldValue.increment(xpToAdd);
    }
    
    console.log('[addXpInTransaction] Update object prepared:', updates);
    transaction.update(userRef, updates);
    console.log('[addXpInTransaction] Transaction update queued.');
};

/**
 * Securely adds XP to a user, updating their daily count and streak.
 * This function handles timezone-correct daily resets.
 * Standalone function to add XP. Creates its own transaction.
 * Used for simple cases like AI chat where no other database writes are needed.
 * @param {admin.firestore.Firestore} db The Firestore database instance.
 * @param {string} uid The user's ID.
 * @param {number} xpToAdd The amount of XP to award.
 */
const addXp = async (db, uid, xpToAdd) => {
    const userRef = db.collection('users').doc(uid);

    await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        await addXpInTransaction(t, userRef, userDoc, xpToAdd);
    });
    console.log(`Awarded ${xpToAdd} XP to user ${uid}`);
};

module.exports = {
    XP_FOR_READING,
    XP_FOR_SRS,
    XP_FOR_CHAT,
    addXp,
    addXpInTransaction
};