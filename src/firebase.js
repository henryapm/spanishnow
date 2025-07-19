// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYz4MbGMt0mEr3EV00kGUgR2h6gF4k6Wc",
  authDomain: "spanishnow-e9326.firebaseapp.com",
  projectId: "spanishnow-e9326",
  storageBucket: "spanishnow-e9326.firebasestorage.app",
  messagingSenderId: "917411122158",
  appId: "1:917411122158:web:33bf4bbded805830bb1cff",
  measurementId: "G-DK2HXQLD3S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);