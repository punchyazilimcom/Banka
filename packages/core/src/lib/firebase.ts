import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

/**
 * Firebase'i (yalnızca VITE_BACKEND_MODE=firebase iken) tek seferlik başlatır.
 * App, Auth ve Firestore örneklerini paylaşır. Dinamik import → sqlite modunda
 * firebase paketleri bundle'a girse de runtime'da kullanılmaz.
 */
let appP: Promise<{ app: FirebaseApp; auth: Auth; db: Firestore }> | null = null;

export const FIREBASE_MODE = import.meta.env.VITE_BACKEND_MODE === 'firebase';

export function firebaseConfigPresent(): boolean {
  return !!import.meta.env.VITE_FIREBASE_API_KEY && !!import.meta.env.VITE_FIREBASE_PROJECT_ID;
}

/** Firebase girişi gerekli mi? (mod firebase + config mevcut) */
export function firebaseAuthRequired(): boolean {
  return FIREBASE_MODE && firebaseConfigPresent();
}

export function getFirebase() {
  if (!appP) {
    appP = (async () => {
      const { initializeApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      const { getFirestore } = await import('firebase/firestore');
      const app = initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      });
      return { app, auth: getAuth(app), db: getFirestore(app) };
    })();
  }
  return appP;
}

/** Oturum durumunu dinler (kalıcı oturum Firebase tarafından IndexedDB'de tutulur). */
export async function onAuth(cb: (user: User | null) => void): Promise<() => void> {
  const { auth } = await getFirebase();
  const { onAuthStateChanged } = await import('firebase/auth');
  return onAuthStateChanged(auth, cb);
}

export async function signInEmail(email: string, password: string): Promise<void> {
  const { auth } = await getFirebase();
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutFirebase(): Promise<void> {
  const { auth } = await getFirebase();
  const { signOut } = await import('firebase/auth');
  await signOut(auth);
}
