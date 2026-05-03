import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

const firebaseConfigWithOverrides = {
  ...firebaseConfig,
  apiKey: (typeof process !== 'undefined' && process.env?.FIREBASE_API_KEY) || firebaseConfig.apiKey
};

const app = initializeApp(firebaseConfigWithOverrides);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfigWithOverrides.firestoreDatabaseId);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
