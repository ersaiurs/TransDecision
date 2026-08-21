import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCEammTlJGydx3FkzFMtG5iN4iPRyo0Mjk",
  authDomain: "transwise-b58ec.firebaseapp.com",
  projectId: "transwise-b58ec",
  storageBucket: "transwise-b58ec.firebasestorage.app",
  messagingSenderId: "706543200969",
  appId: "1:706543200969:web:b9c40809e4fb9e8d357b18",
  measurementId: "G-98E4MDHV0D"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);