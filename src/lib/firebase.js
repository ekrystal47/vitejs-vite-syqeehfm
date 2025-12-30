import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your exact config
const firebaseConfig = {
  apiKey: "AIzaSyAEjq1GuKoLO2AXWONgDlIMW-dAfSE2Bxc",
  authDomain: "budgeting-app-aacf8.firebaseapp.com",
  projectId: "budgeting-app-aacf8",
  storageBucket: "budgeting-app-aacf8.firebasestorage.app",
  messagingSenderId: "309524626334",
  appId: "1:309524626334:web:753449e4c7759ced67f48f",
  measurementId: "G-2VYMZ8FK82"
};

// Initialize and EXPORT so App.jsx can see them
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);