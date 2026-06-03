import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

/**
 * Firebase'i (yalnızca VITE_BACKEND_MODE=firebase iken) tek seferlik başlatır.
 * App, Auth ve Firestore örneklerini paylaşır. Dinamik import → sqlite modunda
 * firebase paketleri bundle'a girse de runtime'da kullanılmaz.
 */
let appP: Promise<{ app: FirebaseApp; auth: Auth; db: Firestore }> | null = null;

/**
 * Firebase web yapılandırması. Bu değerler GİZLİ DEĞİLDİR — her web istemcisine
 * gömülür; güvenlik Firestore kuralları + Auth ile sağlanır. Doğrudan koda gömülü
 * (env ile ezilmez ki yanlış/eski secret'lar araya girmesin).
 */
const firebaseConfig = {
  apiKey: 'AIzaSyAjnQKgFe1eBObPf7eUhI2TI8qqm3l32o4',
  authDomain: 'payl-51cf4.firebaseapp.com',
  projectId: 'payl-51cf4',
  storageBucket: 'payl-51cf4.firebasestorage.app',
  messagingSenderId: '61034453471',
  appId: '1:61034453471:web:2f217985fb797763b3cc6a',
};

export const FIREBASE_MODE = import.meta.env.VITE_BACKEND_MODE === 'firebase';

export function firebaseConfigPresent(): boolean {
  return !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
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
      const app = initializeApp(firebaseConfig);
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
