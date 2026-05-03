const { onCall, HttpsError } = require("firebase-functions/v2/https"); // Make sure to use v2
const { defineSecret } = require("firebase-functions/params");

const onSchedule = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const axios = require("axios");
const { getFirestore } = require("firebase-admin/firestore");

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const gnewsApiKey = defineSecret("GNEWS_API_KEY");

// exports.fetchNewsScheduled = onSchedule({ schedule: "every 1 hours", secrets: [gnewsApiKey, geminiApiKey] }, async (event) => {
//     const db = getFirestore();
//     const configRef = db.collection("settings").doc("newsApi");
//     const configSnap = await configRef.get();

//     if (!configSnap.exists) {
//         console.log("No news API configuration found.");
//         return;
//     }

//     const config = configSnap.data();
//     const frequencyHours = config.frequency !== undefined ? parseInt(config.frequency) : 24;

//     // If frequency is set to 0, auto-fetch is disabled via the admin panel
//     if (frequencyHours === 0) {
//         console.log("News auto-fetch is disabled via settings.");
//         return;
//     }

//     const lastFetched = config.lastFetched ? config.lastFetched.toDate() : new Date(0);
//     const hoursSinceLastFetch = (new Date() - lastFetched) / (1000 * 60 * 60);

//     // Only proceed if enough time has passed based on the admin panel configuration
//     if (hoursSinceLastFetch < frequencyHours) {
//         console.log(`Skipping fetch. Next fetch in ${Math.round(frequencyHours - hoursSinceLastFetch)} hours.`);
//         return;
//     }

//     await fetchAndSaveNews(db, config, configRef);
// });

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