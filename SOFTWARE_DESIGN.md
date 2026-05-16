# Guidelines to design a web application: The Spanish Suite

**Version:** 1.0
**Last Updated:** 2026

## 1. Specification-Driven Development Workflow
**CRITICAL RULE FOR AI ASSISTANTS:** 
Before writing code or assuming the implementation details for *any* new feature, the AI must explicitly ask the user for their desired specifications, requirements, and edge cases. 

The workflow is strictly:

1. Ask for feature specifications.
2. Draft the updates to this SDD (Data models, API endpoints, logic).
3. Explicitly list and **number any assumptions** made during the drafting phase.
4. Ask the user to review the numbered assumptions and indicate which ones need modification by referencing their numbers.
5. Get user approval on the SDD updates and assumptions.
6. Write the code based *only* on the agreed-upon SDD.
7. Don't give me the files on the chat, use the diff or ask me to open the files needed first before you create files that I have to manually edit or combine with existing ones.
8. Let's work on one file at the time.
8. If creating a new feature/component/page that will change the UI always ask if I need to see a mockup on ASCII before writing any html/CSS and then create the mockup.

## 2. Overview
This document outlines the software architecture and design for "The Spanish Suite", an interactive web application designed to help users learn and practice Spanish. The application provides reading exercises, and spaced-repetition (SRS) flashcards and AI-driven conversation practice.

## 3. Goals and Non-Goals
### Goals
*   To provide users with a safe and effective environment to practice Spanish conversation via AI.
*   To help users build vocabulary through reading and SRS flashcards.
*   To offer both a free, limited-access tier and a premium, unlimited-access tier.
*   To maintain a secure, validated, and scalable backend that protects user data and prevents API abuse.

### Non-Goals
*   To become a full-fledged social network. User interaction will be limited to AI conversations.
*   To provide live video tutoring. The focus is on AI-based practice.
*   To teach languages other than Spanish in the initial version.

## 4. System Architecture
The application follows a client-server model using the Firebase ecosystem.

*   **Frontend:** A React single-page application (SPA) built with Vite.
    *   **Hosting:** Deployed on Firebase Hosting.
*   **Backend:** Serverless functions handling business logic and external API communication.
    *   **Platform:** Firebase Cloud Functions (Node.js).
*   **Database:** A NoSQL database for storing all application data.
    *   **Service:** Google Firestore.
*   **Authentication:** Firebase Authentication for user sign-up, sign-in, and session management.
*   **External APIs:**
    *   **Google Gemini API:** Powers all AI conversation features.
    *   **GNews API:** Fetches articles for the reading practice library.

## 5. Data Models (Firestore Schema)

### `users` collection
Stores public information and application-specific data for each user. Document ID is the user's `uid` from Firebase Auth.
```json
{
  "uid": "auth_user_id_abc123",
  "email": "user@example.com",
  "isAdmin": false,
  "hasActiveSubscription": true,
  "listeningPreference": "female"
}
```
*(Note: also contains subcollections like `savedWords` for SRS data and `daily_limits` for usage tracking).*

### `scenarios` collection
Stores the definitions for AI role-playing conversations.
```json
{
  "id": "scenario_id_1",
  "name": "Ordering Coffee",
  "isFree": true,
  "rolePlays": [
    {
      "name": "Barista",
      "role": "You are the barista.",
      "context": "The user is a customer at your coffee shop.",
      "objectives": ["Greet the user", "Take their order", "Tell them the price"]
    }
  ]
}
```

### `articles` collection
Stores reading materials for the library.
```json
{
  "id": "article_id_1",
  "title": "La Historia de Madrid",
  "topic": "History",
  "level": "B1",
  "premium": false,
  "content": "Madrid es la capital de España...",
  "sentences": [
    { "spanish": "Madrid es la capital de España.", "english": "Madrid is the capital of Spain." }
  ]
}
```

## 6. API Endpoints (Cloud Functions)

### `chatWithGemini` / `chatForLesson`
*   **Purpose:** Handles a single turn in an AI conversation, either in a free-play scenario or after a reading lesson.
*   **Authentication:** Required.
*   **Inputs (`data`):**
    *   `history` (array, required): The conversation history so far.
    *   `personaId` / `articleId` (string, required): Lookups for the scenario/lesson context.
    *   `rolePlayName` (string, required for scenarios).
    *   `targetVocabulary` (array of strings, optional for lessons).
*   **Validation:** All inputs are strictly checked for type and maximum lengths. Frontend payloads are never implicitly trusted.

### `manualFetchNews`
*   **Purpose:** Allows an admin to manually trigger the fetching of a new article from the GNews API, translate it, and save it.
*   **Authentication:** Required. User must be an admin.
*   **Validation:** Encodes topics to prevent URL injection.

### `srs` (Add/Toggle/Update/Reset Progress)
*   **Purpose:** Manages the Spaced Repetition System logic for user vocabulary.
*   **Validation:** Enforces word limits and securely runs dates/progress recalculation entirely on the server side.

## 7. Security Considerations
*   **Authentication:** All endpoints verify the user's identity via their Firebase Auth token.
*   **Authorization:** Admin-only endpoints verify the `isAdmin` custom claim or database field.
*   **Input Sanitization:** The client is never trusted. All parameters (strings, arrays, dates) are length-capped and type-checked before hitting the database or AI.
*   **Secret Management:** API keys (Gemini, GNews) are stored securely using Firebase Secret Manager.

## 9. Feature: Landing Page & Dashboard Separation

**Objective:** Separate the public marketing landing page from the authenticated user experience to provide a cleaner flow and a dedicated progress overview.

**Routing Architecture (Frontend):**
*   `/` (Public Landing Page): Displays marketing copy, app features, and a "Log In" button.
    *   *Behavior:* If an already authenticated user visits `/`, they are automatically redirected to `/dashboard`.
*   `/dashboard` (Protected Route): The main gateway for logged-in users.
*   **Layouts:**
    *   `PublicLayout`: Used for `/`. Minimal header (Logo + Login).
    *   `AppLayout`: Used for `/dashboard` and all app features. Includes the main navigation header showing the user's avatar, name, and subscription tier (Free/PRO).

**Dashboard Components & Data Requirements:**
1.  **Welcome Message:** "Hola, [User Name]" (Pulled from Firebase Auth / user document).
2.  **Vocabulary (SRS) Widget:**
    *   *Data:* Queries `users/{uid}/savedWords` to calculate total words and words due for review today.
    *   *Empty State:* If 0 words exist, displays: "No words saved yet! Read an article to start building your vocabulary." with a button linking to the Library.
    *   *Active State:* Displays stats and a "Review Now" button.
3.  **Daily AI Limits Widget:**
    *   *Data:* Queries `users/{uid}/daily_limits` to show remaining free AI interactions. 
    *   *Premium State:* If the user is Premium, this widget hides the limits and displays a "Premium Active" badge.
4.  **Quick Actions:** 
    *   "Practice Conversation" button -> Navigates to the Scenario Selection component.
    *   "Read Articles" button -> Navigates to the Library component.

## 10. Feature: Authentication Pages Redesign

**Objective:** Move the login flow directly onto the public landing page to reduce friction, and create a dedicated sign-up page that enforces legal agreements.

**Routing & Components:**
*   `/` (`LandingPage.jsx`): Now acts as the primary login page. Features a prominent "Log in with Google" button and an email/password login form.
*   `/signup` (`SignupPage.jsx`): A dedicated registration page.
    *   *Agreements:* Includes a mandatory checkbox for Terms & Conditions and Privacy Policy. The "Create Account" button is disabled until checked.
    *   *Modals:* Clicking the legal links opens the existing `Modal.jsx` component containing the respective text.
*   **Post-Signup Flow (Soft Verification):** Upon successful registration (Google or Email), the user is immediately authenticated and redirected to `/dashboard`. Strict email verification is *not* required to access the app, but a banner may be shown later prompting them to verify.
