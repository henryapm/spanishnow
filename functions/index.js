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

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");


// Initialize only once
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const gnewsApiKey = defineSecret("GNEWS_API_KEY");

const scenariosInstructions = "since this is a language learning experience for the user, focus on getting the user to complete the objectives listed for the scenario in as few exchanges as possible. Keep your responses concise and to the point, avoiding unnecessary elaboration. Encourage the user to speak and respond in Spanish, providing corrections or suggestions only when necessary to help them improve their language skills. Always respond in Spanish, unless the user specifically asks for a translation or explanation in English. If the user seems stuck or unsure, offer gentle prompts or hints to guide them towards the correct phrases or vocabulary. Maintain a friendly and supportive tone throughout the conversation to create a positive learning environment. Remember, the primary goal is to help the user practice and improve their Spanish speaking skills in a realistic context, if the user doesn't seem to understand what to do, and says things out of the context or doesn't attempt to complete an objective suggest a response that they could use so that the role play makes sense and is completed. If the user deviates from the scenario, gently steer them back on track by reminding them of the context and objectives. If the user completes the objectives, congratulate them and suggest they try another scenario for further practice. ";

const SCENARIOS = [
    { 
        id: 'restaurant', 
        name: 'Restaurant 🍽️', 
        emoji: '🍽️',
        rolePlays: [
            {
                name: 'Standard Restaurant',
                role: 'Waiter',
                difficulty: 'Beginner',
                description: 'Practice ordering food and drinks in a restaurant setting.',
                objectives: ['Ask for the menu', 'Order food', 'Ask for the bill'],
                context: `You are a waiter at a restaurant in Madrid. The user is a customer. 
                Greet them, ask what they want to eat/drink, and handle the bill. `
            },
            {
                name: 'Restaurant Reservation 📅', 
                role: 'Host',
                difficulty: 'Intermediate',
                description: 'Practice making a reservation for a group.',
                objectives: ['Request a table', 'Specify time and people', 'Confirm details'],
                context: 'You are the host at a popular restaurant in Barcelona. The user calls to book a table. Ask for the date, time, number of people, and contact name.' 
            },
            {
                name: 'Order Complaint 🍲', 
                role: 'Manager',
                difficulty: 'Advanced',
                description: 'Practice resolving an issue with your food order.',
                objectives: ['Explain the problem', 'Ask for a solution', 'Polite closing'],
                context: 'You are the restaurant manager. The user has a complaint about their dish (e.g., cold, wrong item). Listen to the complaint, apologize, and offer a solution (replacement or refund).' 
            }
        ]
    },
    {
        id: 'hotel', 
        name: 'Hotel 🏨', 
        emoji: '🏨',
        rolePlays: [
            {
                name: 'Standard Hotel Reservation',
                role: 'Receptionist',
                difficulty: 'Beginner',
                description: 'Book a room at a hotel.',
                objectives: ['Request room', 'Specify dates', 'Confirm booking'],
                context: 'You are a guest calling to book a room at a hotel in Seville. Ask for room type, check-in and check-out dates, and confirm the reservation.' 
            },
            {
                name: 'Check-in Process 🛎️', 
                role: 'Receptionist',
                difficulty: 'Intermediate',
                description: 'Practice checking into a hotel.',
                objectives: ['Provide ID', 'Ask about amenities', 'Request room service'],
                context: 'You are a guest checking into a hotel in Valencia. Provide your name and ID, ask about hotel amenities, and request room service information.'}
        ]
    },
    { 
        id: 'cafe', 
        name: 'Coffee Shop ☕', 
        emoji: '☕',
        rolePlays: [
            {
                name: 'Standard Coffee Shop',
                role: 'Barista',
                description: 'Order your morning coffee and a snack.',
                objectives: ['Order a coffee', 'Ask for a pastry', 'Pay'],
                context: 'You are a friendly barista at a coffee shop in Madrid. Ask the customer what they would like to drink or eat. Keep responses concise.' 
            },
            {
                name: 'Custom Coffee Order 🎨', 
                role: 'Barista',
                description: 'Create a custom coffee order.',
                objectives: ['Ask for preferences', 'ask for ingredients', 'Confirm order'],
                context: 'You are a barista at a specialty coffee shop. The customer wants a custom order. Ask them about their preferences (hot/iced, milk type, sweetness) and specific ingredients. Confirm the final order.'
            }
        ]
    },
    { 
        id: 'taxi', 
        name: 'Taxi Driver 🚕', 
        emoji: '🚕',
        rolePlays: [
            {
                name: 'Standard Taxi Ride',
                role: 'Driver',
                description: 'Practice giving directions and making small talk.',
                objectives: ['Give destination', 'Ask about travel time', 'Pay the fare'],
                context: 'You are a talkative taxi driver in Mexico City. Ask the passenger where they are going and make small talk about the traffic or weather.' 
            },
        ]
    },
    { 
        id: 'friend', 
        name: 'Amigo 👋', 
        emoji: '👋',
        rolePlays: [
            {
                name: 'Standard Friend Catch-up',
                role: 'Friend',
                description: 'Catch up with a friend.',
                objectives: ['Ask about weekend', 'Share news', 'Make plans'],
                context: 'You are a close friend catching up. Ask how their week has been and what their plans are for the weekend.' 
            },
        ]
    },
    { 
        id: 'doctor', 
        name: 'Doctor 🩺', 
        emoji: '🩺',
        rolePlays: [
            {
                name: 'Standard Doctor Visit',
                role: 'Doctor',
                description: 'Describe symptoms and get medical advice.',
                objectives: ['Describe pain', 'Answer questions', 'Get prescription'],
                context: 'You are a doctor in a clinic. Ask the patient what their symptoms are and how they are feeling.' 
            },
        ]
    },
];

const MAX_FREE_INTERACTIONS = 5;

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

// exports.seedScenarios = onCall({ 
//     cors: true 
// }, async (request) => {
//     if (!request.auth) {
//         throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
//     }

//     const db = admin.firestore();
//     const uid = request.auth.uid;
    
//     // Check if user is admin
//     const userDoc = await db.collection('users').doc(uid).get();
//     const userData = userDoc.data() || {};
//     // Check token claim OR firestore field
//     const isAdmin = userData.isAdmin === true || request.auth.token.admin === true;

//     if (!isAdmin) {
//         throw new HttpsError('permission-denied', 'Only admins can seed the database.');
//     }

//     const batch = db.batch();

//     // 1. Seed Scenarios
//     SCENARIOS.forEach(scenario => {
//         const ref = db.collection('scenarios').doc(scenario.id);
//         batch.set(ref, scenario);
//     });

//     // 2. Seed Global Instructions
//     const instructionsRef = db.collection('appInfo').doc('aiPrompts');
//     batch.set(instructionsRef, { scenariosInstructions }, { merge: true });

//     await batch.commit();

//     return { success: true, message: "Scenarios and AI instructions successfully seeded to Firestore from backend!" };
// });

// NOTE: Ensure your firebase-admin is initialized at the top of your index.js!

exports.fetchNewsScheduled = onSchedule({ schedule: "every 1 hours", secrets: [gnewsApiKey, geminiApiKey] }, async (event) => {
    const db = getFirestore();
    const configRef = db.collection("settings").doc("newsApi");
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
        console.log("No news API configuration found.");
        return;
    }

    const config = configSnap.data();
    const frequencyHours = config.frequency !== undefined ? parseInt(config.frequency) : 24;

    // If frequency is set to 0, auto-fetch is disabled via the admin panel
    if (frequencyHours === 0) {
        console.log("News auto-fetch is disabled via settings.");
        return;
    }

    const lastFetched = config.lastFetched ? config.lastFetched.toDate() : new Date(0);
    const hoursSinceLastFetch = (new Date() - lastFetched) / (1000 * 60 * 60);

    // Only proceed if enough time has passed based on the admin panel configuration
    if (hoursSinceLastFetch < frequencyHours) {
        console.log(`Skipping fetch. Next fetch in ${Math.round(frequencyHours - hoursSinceLastFetch)} hours.`);
        return;
    }

    await fetchAndSaveNews(db, config, configRef);
});

exports.manualFetchNews = onCall({ cors: true, secrets: [gnewsApiKey, geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data() || {};
    const isAdmin = userData.isAdmin === true || request.auth.token.admin === true;

    if (!isAdmin) {
        throw new HttpsError('permission-denied', 'Only admins can trigger this fetch.');
    }

    const topic = request.data.topic;
    let config;
    let configRef = null;

    if (topic && typeof topic === 'string') {
        // If a topic is provided, use it and don't update the scheduled job's timestamp.
        config = { topic };
    } else {
        // Otherwise, use the configured topic and update the timestamp.
        configRef = db.collection("settings").doc("newsApi");
        const configSnap = await configRef.get();
        config = configSnap.exists ? configSnap.data() : { topic: 'noticias' };
    }

    const resultMessage = await fetchAndSaveNews(db, config, configRef);
    return { success: true, message: resultMessage };
});

async function fetchAndSaveNews(db, config, configRef) {
    try {
        // 1. Call GNews API
        const API_KEY = gnewsApiKey.value();
        const query = config.topic || "noticias";
        
        const response = await axios.get(`https://gnews.io/api/v4/search?q=${query}&lang=es&apikey=${API_KEY}`);
        const articles = response.data.articles;

        if (!articles || articles.length === 0) {
            console.log("No articles found from GNews");
            return "No articles found from GNews.";
        }

        const newsItem = articles[0];
        const rawContent = newsItem.content || newsItem.description || newsItem.title || "No content available";

        // 2. Call Gemini API to translate and format the text
        const geminiKey = geminiApiKey.value();
        const prompt = `You are an expert Spanish to English translator. I will provide you with a Spanish news article. Please split the text into logical sentences. For each sentence, provide the original Spanish text and its English translation. Return the result STRICTLY as a JSON array of objects with the keys "spanish" and "english". Do not include any markdown formatting, code blocks, or extra text.\n\nText to translate:\n${rawContent}`;

        let translatedSentences = [];
        try {
            const geminiResponse = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
                {
                    contents: [{ role: 'user', parts: [{ text: prompt }] }]
                },
                { headers: { 'Content-Type': 'application/json' } }
            );

            let responseText = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
            
            // Clean up potential markdown code block formatting returned by Gemini
            responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            
            translatedSentences = JSON.parse(responseText);
        } catch (geminiError) {
            console.error("Error formatting with Gemini:", geminiError.message);
            // Fallback if Gemini fails to respond or parse correctly
            translatedSentences = [
                { spanish: newsItem.title, english: "Failed to translate title." },
                { spanish: "El contenido original no pudo ser traducido.", english: "The original content could not be translated." }
            ];
        }
        
        // 3. Format it to match the app's structure
        const formattedArticle = {
            title: newsItem.title,
            topic: "News",
            level: "B2", // Default or determine dynamically
            premium: false,
            createdAt: new Date(),
            sentences: translatedSentences
        };

        // 4. Save the new article to Firestore
        await db.collection("articles").add(formattedArticle);

        if (configRef) {
            await configRef.set({
                lastFetched: new Date()
            }, { merge: true });
        }

        console.log("Successfully fetched and saved new article!");
        return "Successfully fetched and saved new article!";
    } catch (error) {
        // Safely extract the exact error message from Axios so the frontend can see it
        const errorDetails = error.response?.data?.errors?.[0] || error.message || "Unknown error";
        console.error("Error fetching from GNews details:", error.response?.data || error.message);
        throw new HttpsError('internal', `Error fetching from GNews: ${errorDetails}`);
    }
}