import { FIREBASE_MODE, getFirebase } from './firebase';

/**
 * Android/iOS push bildirimi (FCM). Yalnızca Capacitor native ortamında çalışır;
 * web/Electron'da sessizce atlanır. Cihaz FCM token'ı Firestore `devices`
 * koleksiyonuna yazılır; worker yeni işlemde bu cihazlara push gönderir.
 */
export async function initPush(): Promise<void> {
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return; // sadece gerçek cihaz
  const Push = cap.Plugins?.PushNotifications;
  if (!Push) return;

  try {
    let perm = await Push.checkPermissions();
    if (perm.receive !== 'granted') perm = await Push.requestPermissions();
    if (perm.receive !== 'granted') return;

    await Push.register();

    Push.addListener('registration', async (token: { value: string }) => {
      await saveDeviceToken(token.value);
    });
    Push.addListener('registrationError', (e: unknown) =>
      console.warn('[push] kayıt hatası:', e),
    );
  } catch (e) {
    console.warn('[push] başlatılamadı:', e);
  }
}

async function saveDeviceToken(token: string): Promise<void> {
  if (!FIREBASE_MODE) return;
  try {
    const { db } = await getFirebase();
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'devices', token), {
      token,
      platform: (window as any).Capacitor?.getPlatform?.() ?? 'unknown',
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[push] token kaydedilemedi:', e);
  }
}
