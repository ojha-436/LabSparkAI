/* ── Firebase initialization (compat SDK via npm) ──
   Web config values are public by design; we still allow overriding via
   Vite env vars (VITE_FIREBASE_*) so different environments can be targeted. */
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDdZI2ID1UJ0mYJ4gW6AvfjiDBVZUjhH7c",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0686614374.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0686614374",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0686614374.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "686718900098",
  appId: env.VITE_FIREBASE_APP_ID || "1:686718900098:web:6484195a7633d6c69de19b",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export default firebase;
