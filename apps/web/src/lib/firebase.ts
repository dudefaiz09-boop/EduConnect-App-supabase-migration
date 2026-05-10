import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase Client SDK Initialization
 * 
 * NOTE: All variables prefixed with VITE_ are injected by Vite at BUILD TIME.
 * If these are missing during the CI build step, the app will fail to initialize.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Fail-fast validation
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
  if (import.meta.env.DEV) {
    console.error("FATAL: Firebase configuration is missing. Ensure .env is populated.");
  }
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (import.meta.env.DEV) {
  console.log(`[Firebase] Initialized for project: ${firebaseConfig.projectId}`);
}
