import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
console.log("🔥 Loaded API Key:", import.meta.env.VITE_FIREBASE_API); // TEMP DEBUG
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API,
  authDomain: "budgeting-app-aacf8.firebaseapp.com",
  projectId: "budgeting-app-aacf8",
  storageBucket: "budgeting-app-aacf8.firebasestorage.app",
  messagingSenderId: "309524626334",
  appId: "1:309524626334:web:753449e4c7759ced67f48f",
  measurementId: "G-2VYMZ8FK82"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);