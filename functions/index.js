// functions/index.js
const admin = require("firebase-admin");
const requireDirectory = require('require-directory');

// 1. Initialize Firebase Admin ONLY ONCE at the top level
admin.initializeApp();

// Load all files in the /src directory
const modules = requireDirectory(module, './src');

// Flatten the exports so they deploy with their original names 
// (e.g., 'chatWithGemini' instead of 'ai-chatWithGemini')
Object.keys(modules).forEach((moduleName) => {
    Object.assign(exports, modules[moduleName]);
});
