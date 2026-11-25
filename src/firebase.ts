import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

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

// Initialize Firebase Authentication
export const auth = getAuth(app);

const PROVISIONING_APP_NAME = 'ok-lms-student-provisioning';

/**
 * Provisions a Firebase Authentication user for a student using an isolated
 * secondary Firebase App instance so the Admin's session is never interrupted.
 */
export async function provisionStudentFirebaseAuth(
  email: string,
  password: string
): Promise<{ uid: string; email: string }> {
  const existingSecondary = getApps().find((a) => a.name === PROVISIONING_APP_NAME);
  const secondaryApp = existingSecondary || initializeApp(firebaseConfig, PROVISIONING_APP_NAME);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = userCredential.user.uid;
    const createdEmail = userCredential.user.email || email;
    await signOut(secondaryAuth).catch(() => {});
    return { uid, email: createdEmail };
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      // Attempt to recover UID if the provided password matches the existing Auth account
      try {
        const existingCred = await signInWithEmailAndPassword(secondaryAuth, email, password);
        const uid = existingCred.user.uid;
        await signOut(secondaryAuth).catch(() => {});
        return { uid, email: existingCred.user.email || email };
      } catch {
        throw new Error(
          `Firebase Auth account "${email}" already exists with a different password.`
        );
      }
    }
    throw err;
  }
}

export default db;
