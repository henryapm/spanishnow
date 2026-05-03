const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

/**
 * Securely adds a card to the SRS system from flashcard component.
 * Enforces string lengths and types to prevent database bloating.
 */
exports.addCardToSRS = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;
    const { card, deckTitle } = request.data;

    // 1. Strict Input Validation
    if (!card || typeof card.spanish !== 'string' || card.spanish.trim() === '') {
        throw new HttpsError('invalid-argument', 'A valid Spanish word is required.');
    }
    if (card.spanish.length > 100 || 
        (card.english && typeof card.english !== 'string') || (card.english && card.english.length > 500) || 
        (card.vocab && typeof card.vocab !== 'string') || (card.vocab && card.vocab.length > 500) ||
        (deckTitle && typeof deckTitle !== 'string') || (deckTitle && deckTitle.length > 100)) {
        throw new HttpsError('invalid-argument', 'Payload is malformed or exceeds maximum allowed length.');
    }

    const db = admin.firestore();
    const wordRef = db.collection('users').doc(uid).collection('savedWords').doc(card.spanish);

    // 2. Perform the secure write
    try {
        await wordRef.set({
            addedAt: FieldValue.serverTimestamp(),
            active: true,
            stage: 0,
            nextReviewDate: Date.now(),
            translation: card.english || '',
            vocab: card.vocab || '',
            source: deckTitle || 'Flashcards'
        }, { merge: true });
        
        return { success: true };
    } catch (error) {
        console.error("Error adding card to SRS:", error);
        throw new HttpsError('internal', 'Failed to save the card to the database.');
    }
});

/**
 * Securely toggles a saved word for a user.
 * Enforces string lengths and payload structure.
 */
exports.toggleSavedWord = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;
    const { spanishWord, action, translation, vocab, source } = request.data;

    // 1. Strict Input Validation
    if (!spanishWord || typeof spanishWord !== 'string' || spanishWord.trim() === '' || spanishWord.length > 100) {
        throw new HttpsError('invalid-argument', 'A valid Spanish word is required.');
    }
    
    // Optional fields validation
    if (translation && (typeof translation !== 'string' || translation.length > 500)) throw new HttpsError('invalid-argument', 'Translation is malformed.');
    if (vocab && (typeof vocab !== 'string' || vocab.length > 500)) throw new HttpsError('invalid-argument', 'Vocab is malformed.');
    if (source && (typeof source !== 'string' || source.length > 100)) throw new HttpsError('invalid-argument', 'Source is malformed.');

    const db = admin.firestore();
    const wordRef = db.collection('users').doc(uid).collection('savedWords').doc(spanishWord);

    // 2. Perform the secure write
    try {
        if (action === 'remove') {
            // Soft delete
            await wordRef.update({ active: false });
        } else {
            // Add or re-activate
            await wordRef.set({
                addedAt: FieldValue.serverTimestamp(),
                active: true,
                stage: 0,
                nextReviewDate: Date.now(),
                translation: translation || '',
                vocab: vocab || '',
                source: source || null
            }, { merge: true });
        }
        return { success: true };
    } catch (error) {
        console.error("Error toggling saved word:", error);
        // If updating a non-existent document during 'remove', it throws. We can safely ignore or throw an internal error.
        throw new HttpsError('internal', 'Failed to toggle the saved word.');
    }
});

/**
 * Securely updates the SRS stage for a saved word.
 * Recalculates the next review date on the server to prevent progress spoofing.
 */
exports.updateSavedWordProgress = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;
    const { wordId } = request.data;

    if (!wordId || typeof wordId !== 'string' || wordId.trim() === '' || wordId.length > 100) {
        throw new HttpsError('invalid-argument', 'A valid word ID is required.');
    }

    const db = admin.firestore();
    const wordRef = db.collection('users').doc(uid).collection('savedWords').doc(wordId);

    try {
        return await db.runTransaction(async (t) => {
            const docSnap = await t.get(wordRef);
            if (!docSnap.exists) {
                throw new HttpsError('not-found', 'Saved word not found.');
            }

            const data = docSnap.data();
            let stage = data.stage || 0;
            let nextDate = new Date();

            // SRS Logic on the server side
            if (stage === 0) {
                nextDate.setDate(nextDate.getDate() + 1);
                stage = 1;
            } else if (stage === 1) {
                nextDate.setDate(nextDate.getDate() + 3);
                stage = 2;
            } else if (stage === 2) {
                nextDate.setDate(nextDate.getDate() + 7);
                stage = 3;
            } else if (stage === 3) {
                nextDate.setDate(nextDate.getDate() + 14);
                stage = 4;
            } else if (stage >= 4) {
                stage = 5; // Mastered
            }

            // Normalize to midnight so words are due at the start of the day
            nextDate.setHours(0, 0, 0, 0);

            t.update(wordRef, { stage, nextReviewDate: nextDate.getTime() });
            
            return { success: true, stage, nextReviewDate: nextDate.getTime() };
        });
    } catch (error) {
        console.error("Error updating word progress:", error);
        if (error.code) throw error; // Rethrow existing HttpsErrors
        throw new HttpsError('internal', 'Failed to update word progress.');
    }
});

/**
 * Securely resets the SRS stage for a saved word.
 * Sets the stage to 0 and the review date to now.
 */
exports.resetSavedWordProgress = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;
    const { wordId } = request.data;

    if (!wordId || typeof wordId !== 'string' || wordId.trim() === '' || wordId.length > 100) {
        throw new HttpsError('invalid-argument', 'A valid word ID is required.');
    }

    const db = admin.firestore();
    const wordRef = db.collection('users').doc(uid).collection('savedWords').doc(wordId);

    try {
        const now = Date.now();
        await wordRef.update({ stage: 0, nextReviewDate: now });
        return { success: true, nextReviewDate: now };
    } catch (error) {
        console.error("Error resetting word progress:", error);
        throw new HttpsError('internal', 'Failed to reset word progress.');
    }
});