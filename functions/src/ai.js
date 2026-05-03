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
    const { history, personaId, date, context, objectives } = request.data;

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

    const rolePlay = selectedScenario.rolePlays ? selectedScenario.rolePlays.find(rp => rp.context === context) : null;
    const role = rolePlay ? rolePlay.role : 'Assistant';

    const systemInstruction = `${fetchedAiInstructions}

    Scenario: ${selectedScenario.name}
    Role: ${role}
    Context: ${context}
    Objectives: ${objectives.join(', ')}`;
    
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
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;
    const { history, date, context, objectives, scenariosAiInstructions } = request.data;
    
    // Input Validation to prevent server crashes from malformed requests
    if (!history || !Array.isArray(history) || !objectives || !Array.isArray(objectives) || !context) {
        throw new HttpsError('invalid-argument', 'Missing or invalid required chat parameters.');
    }

    const db = admin.firestore();

    // 2. Premium/Limit Check (Reusing the "speak" daily limit)
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    
    // Check if user is admin or has active subscription
    const isPremium = userData.isAdmin === true || userData.hasActiveSubscription === true || request.auth.token.admin === true;

    if (!isPremium) {
        const today = date || new Date().toLocaleDateString('en-CA');
        const limitRef = db.collection('users').doc(uid).collection('daily_limits').doc('speak');
        
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
        throw new HttpsError('failed-precondition', 'Gemini API key is missing.');
    }

    const systemInstruction = `${scenariosAiInstructions}\n\nContext: ${context}\nObjectives:\n- ${objectives.join('\n- ')}`;
    
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                system_instruction: { parts: [{ text: systemInstruction }] },
                contents: history.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                }))
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        return { text: response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, no entendí." };
    } catch (error) {
        console.error("Gemini API Error:", error.response?.data || error.message);
        throw new HttpsError('internal', `Gemini Error: ${error.message}`);
    }
});
