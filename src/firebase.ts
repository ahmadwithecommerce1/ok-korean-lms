import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB7bfHpaV2njsvG95KSqnj1IH6AZCkzE9A",
  authDomain: "ok-lms-web-app.firebaseapp.com",
  projectId: "ok-lms-web-app",
  storageBucket: "ok-lms-web-app.firebasestorage.app",
  messagingSenderId: "443194825966",
  appId: "1:443194825966:web:e25e74040c4f489a7c67ff",
  measurementId: "G-FHF03PCMYJ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export default db;
