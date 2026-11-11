import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const requiredConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(requiredConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length) {
  throw new Error(`Missing Firebase configuration: ${missingConfig.join(", ")}. Add these values to your .env file or GitHub Actions secrets.`);
}

const app = initializeApp(requiredConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

let anonymousAuthPromise;

export function ensureAnonymousAuth() {
  if (auth.currentUser) return Promise.resolve(true);

  if (!anonymousAuthPromise) {
    anonymousAuthPromise = signInAnonymously(auth)
      .then(() => true)
      .catch((error) => {
        console.error("Anonymous Firebase sign-in failed:", error);
        anonymousAuthPromise = null;
        return false;
      });
  }

  return anonymousAuthPromise;
}

// Start signing in as soon as the app loads. Wish submission also awaits this
// promise, preventing a race where the first write happens before auth is ready.
ensureAnonymousAuth();
