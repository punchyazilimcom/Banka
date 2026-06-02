/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_MODE?: 'sqlite' | 'firebase';
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_API_SHARED_SECRET?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

// Capacitor / Electron köprüleri (opsiyonel, runtime'da kontrol edilir)
interface Window {
  electronAPI?: {
    notify: (title: string, body: string) => void;
    onTransaction?: (cb: (tx: unknown) => void) => void;
  };
}
