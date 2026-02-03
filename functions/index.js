/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");

// Initialize only once
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const scenariosGoals = "since this is a language learning experience for the user, focus on getting the user to complete the objectives listed for the scenario in as few exchanges as possible. Keep your responses concise and to the point, avoiding unnecessary elaboration. Encourage the user to speak and respond in Spanish, providing corrections or suggestions only when necessary to help them improve their language skills. Always respond in Spanish, unless the user specifically asks for a translation or explanation in English. If the user seems stuck or unsure, offer gentle prompts or hints to guide them towards the correct phrases or vocabulary. Maintain a friendly and supportive tone throughout the conversation to create a positive learning environment. Remember, the primary goal is to help the user practice and improve their Spanish speaking skills in a realistic context.";
const SCENARIOS = [
    { 
        id: 'restaurant', 
        name: 'Restaurant 🍽️', 
        emoji: '🍽️',
        role: 'Waiter',
        description: 'Practice ordering food and drinks in a restaurant setting.',
        objectives: ['Ask for the menu', 'Order food', 'Ask for the bill'],
        context: `You are a waiter at a restaurant in Madrid. The user is a customer. 
        Greet them, ask what they want to eat/drink, and handle the bill. `
    },
    { 
        id: 'cafe', 
        name: 'Coffee Shop ☕', 
        emoji: '☕',
        role: 'Barista',
        description: 'Order your morning coffee and a snack.',
        objectives: ['Order a coffee', 'Ask for a pastry', 'Pay'],
        context: 'You are a friendly barista at a coffee shop in Madrid. Ask the customer what they would like to drink or eat. Keep responses concise.' 
    },
    { 
        id: 'taxi', 
        name: 'Taxi Driver 🚕', 
        emoji: '🚕',
        role: 'Driver',
        description: 'Practice giving directions and making small talk.',
        objectives: ['Give destination', 'Ask about travel time', 'Pay the fare'],
        context: 'You are a talkative taxi driver in Mexico City. Ask the passenger where they are going and make small talk about the traffic or weather.' 
    },
    { 
        id: 'friend', 
        name: 'Amigo 👋', 
        emoji: '👋',
        role: 'Friend',
        description: 'Catch up with a friend.',
        objectives: ['Ask about weekend', 'Share news', 'Make plans'],
        context: 'You are a close friend catching up. Ask how their week has been and what their plans are for the weekend.' 
    },
    { 
        id: 'doctor', 
        name: 'Doctor 🩺', 
        emoji: '🩺',
        role: 'Doctor',
        description: 'Describe symptoms and get medical advice.',
        objectives: ['Describe pain', 'Answer questions', 'Get prescription'],
        context: 'You are a doctor in a clinic. Ask the patient what their symptoms are and how they are feeling.' 
    },
];

const MAX_FREE_INTERACTIONS = 3;

// --- FIX: Added `cors: true` to options ---
exports.chatWithGemini = onCall({ 
    secrets: [geminiApiKey],
    cors: true 
}, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;
    const { history, personaId, date } = request.data;

    const selectedScenario = SCENARIOS.find(s => s.id === personaId);

    if (!history || !personaId || !selectedScenario) {
        throw new HttpsError('invalid-argument', 'Invalid arguments provided.');
    }

    // 2. Premium/Limit Check
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    
    // Check if user is admin or has active subscription
    const isPremium = userData.isAdmin === true || userData.hasActiveSubscription === true;

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

    const systemInstruction = `${scenariosGoals}

    Scenario: ${selectedScenario.name}
    Role: ${selectedScenario.role}
    Context: ${selectedScenario.context}
    Objectives: ${selectedScenario.objectives.join(', ')}`;
    
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
