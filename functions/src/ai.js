const { onCall, HttpsError } = require("firebase-functions/v2/https"); // Make sure to use v2
const { defineSecret } = require("firebase-functions/params");

const admin = require("firebase-admin");
const axios = require("axios");

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const scenariosInstructions = "since this is a language learning experience for the user, focus on getting the user to complete the objectives listed for the scenario in as few exchanges as possible. Keep your responses concise and to the point, avoiding unnecessary elaboration. Encourage the user to speak and respond in Spanish, providing corrections or suggestions only when necessary to help them improve their language skills. Always respond in Spanish, unless the user specifically asks for a translation or explanation in English. If the user seems stuck or unsure, offer gentle prompts or hints to guide them towards the correct phrases or vocabulary. Maintain a friendly and supportive tone throughout the conversation to create a positive learning environment. Remember, the primary goal is to help the user practice and improve their Spanish speaking skills in a realistic context, if the user doesn't seem to understand what to do, and says things out of the context or doesn't attempt to complete an objective suggest a response that they could use so that the role play makes sense and is completed. If the user deviates from the scenario, gently steer them back on track by reminding them of the context and objectives. If the user completes the objectives, congratulate them and suggest they try another scenario for further practice. ";

const MAX_FREE_INTERACTIONS = 5;


exports.chatWithGemini = onCall({ 
    secrets: [geminiApiKey],
    cors: true 
}, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;
    const { history, personaId, date, rolePlayName } = request.data;

    const db = admin.firestore();

    // Fetch scenario and instructions from Firestore
    let selectedScenario;
    let fetchedAiInstructions;

    try {
        const scenarioDoc = await db.collection('scenarios').doc(personaId).get();
        const promptsDoc = await db.collection('appInfo').doc('aiPrompts').get();

        if (!scenarioDoc.exists) {
            throw new HttpsError('not-found', 'Scenario not found.');
        }
        
        selectedScenario = { id: scenarioDoc.id, ...scenarioDoc.data() };
        fetchedAiInstructions = promptsDoc.exists ? promptsDoc.data().scenariosAiInstructions : scenariosInstructions; // Fallback to hardcoded if missing

    } catch (error) {
        console.error("Error fetching data:", error);
        // If it's already an HttpsError, rethrow it, otherwise throw internal
        throw error.code ? error : new HttpsError('internal', 'Failed to fetch scenario data.');
    }

    // 2. Premium/Limit Check
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    
    // Check if user is admin or has active subscription
    const isPremium = userData.isAdmin === true || userData.hasActiveSubscription === true || request.auth.token.admin === true;

    if (!isPremium) {
        const today = date || new Date().toLocaleDateString('en-CA'); // Use user's local date or fallback to server date
        const limitRef = db.collection('users').doc(uid).collection('daily_limits').doc('speak');
        
        // Run a transaction to ensure atomic increment
        await db.runTransaction(async (t) => {
            const limitDoc = await t.get(limitRef);
            let currentCount = 0;
            
            if (limitDoc.exists && limitDoc.data().date === today) {
                currentCount = limitDoc.data().count || 0;
            }

            if (currentCount >= MAX_FREE_INTERACTIONS) {
                throw new HttpsError('resource-exhausted', 'You have reached your daily limit for the free tier.');
            }

            t.set(limitRef, { date: today, count: currentCount + 1 }, { merge: true });
        });
    }

    // 3. Call Gemini API
    const apiKey = geminiApiKey.value();
    if (!apiKey) {
        throw new HttpsError('failed-precondition', 'Gemini API key is missing. Make sure to set it via "firebase functions:secrets:set GEMINI_API_KEY".');
    }

    // Find the specific roleplay by name on the backend
    const rolePlay = selectedScenario.rolePlays ? selectedScenario.rolePlays.find(rp => rp.name === rolePlayName) : null;
    if (!rolePlay) {
        throw new HttpsError('not-found', 'Role play not found.');
    }
    const role = rolePlay.role || 'Assistant';

    const systemInstruction = `${fetchedAiInstructions}

    Scenario: ${selectedScenario.name}
    Role: ${role}
    Context: ${rolePlay.context}
    Objectives: ${rolePlay.objectives.join(', ')}`;
    
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                system_instruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents: history.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                }))
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const aiResponseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, no entendí.";
        return { text: aiResponseText };

    } catch (error) {
        console.error("Gemini API Error:", error.response?.data || error.message);
        let errorMessage = error.response?.data?.error?.message || error.message;
        if (errorMessage.includes("referer")) {
            errorMessage += " (Action Required: Go to Google Cloud Console > Credentials. Edit this API Key and set 'Application restrictions' to 'None'.)";
        }
        throw new HttpsError('internal', `Gemini Error: ${errorMessage}`);
    }
});

// --- NEW: Dedicated function for the Lesson Flow AI Chat ---
exports.chatForLesson = onCall({ 
    secrets: [geminiApiKey],
    cors: true 
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;
    const { history, articleId, targetVocabulary } = request.data;

    if (!history || !Array.isArray(history) || !articleId) {
        throw new HttpsError('invalid-argument', 'Invalid arguments provided.');
    }

    const db = admin.firestore();
    
    // 1. Premium / Limit Check (same as chatWithGemini)
    const userDoc = await db.collection('users').doc(uid).get();
    const isPremium = userDoc.data()?.isAdmin === true || userDoc.data()?.hasActiveSubscription === true;

    if (!isPremium) {
        const today = new Date().toLocaleDateString('en-CA');
        const limitRef = db.collection('users').doc(uid).collection('daily_limits').doc('speak');
        await db.runTransaction(async (t) => {
            const limitDoc = await t.get(limitRef);
            let currentCount = limitDoc.exists && limitDoc.data().date === today ? (limitDoc.data().count || 0) : 0;
            if (currentCount >= 15) { // MAX_FREE_INTERACTIONS
                throw new HttpsError('resource-exhausted', 'You have reached your daily limit for the free tier.');
            }
            t.set(limitRef, { date: today, count: currentCount + 1 }, { merge: true });
        });
    }

    // 2. Fetch the Article and Global AI Instructions securely on the server
    const articleDoc = await db.collection('articles').doc(articleId).get();
    const articleData = articleDoc.data() || {};
    
    const promptsDoc = await db.collection('appInfo').doc('aiPrompts').get();
    const globalInstructions = promptsDoc.exists ? promptsDoc.data().scenariosAiInstructions : "You are a helpful Spanish tutor and conversation partner.";

    // 3. Build the context and objectives securely!
    const context = `The user just finished reading a Spanish story/article titled "${articleData.title || 'Unknown'}". The overall topic is "${articleData.topic || 'General'}". They want to practice having a conversation about it.`;
    
    const vocabInstruction = targetVocabulary && targetVocabulary.length > 0 
        ? `Encourage the user to use the following vocabulary words they just learned: ${targetVocabulary.join(', ')}.`
        : `Encourage the user to use vocabulary related to the story.`;
        
    const objectives = [
        "Mention to the user the first word they saved, then tell the user what that word translates to in English with the english word wrapped in quotation marks, explain how to use it using english to explain, create a sentence in Spanish using that word, and ask them to do the same with that word. Then move on to the next word and do the same, until you have gone through all the words they saved.",
        vocabInstruction,
        "Keep your responses relatively brief (1-2 sentences) so the user doesn't get overwhelmed.",
        "If the user makes a major mistake, gently correct them in a friendly way, but focus mainly on keeping the conversation going, and only related to the story and vocabulary. Don't correct every single small mistake, just major ones that would impede understanding.",
        "At the end of the conversation, give the user positive feedback and encouragement based on how well they did using the vocabulary and sticking to the topic.",
        "ask the user to finish the lesson once they've gone through all the vocabulary, or if they indicate they want to finish, by saying something like 'Great job practicing! When you're ready, click the Finish Lesson button to complete.'"
    ];

    const systemInstruction = `${globalInstructions}\n\nContext: ${context}\n\nObjectives:\n${objectives.map(o => "- " + o).join('\n')}`;

    // 4. Call Gemini API
    const apiKey = geminiApiKey.value();
    try {
        const response = await axios.post(
            `<https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}>`,
            {
                system_instruction: { parts: [{ text: systemInstruction }] },
                contents: history.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                }))
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const aiResponseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, no entendí.";
        return { text: aiResponseText };
    } catch (error) {
        console.error("Gemini API Error:", error.response?.data || error.message);
        throw new HttpsError('internal', 'Failed to communicate with AI service.');
    }
});
