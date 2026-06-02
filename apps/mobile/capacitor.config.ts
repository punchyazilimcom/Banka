import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor yapılandırması. webDir, core UI'nın build çıktısının buraya
 * kopyalandığı klasördür (scripts/copy-web.mjs ile doldurulur).
 */
const config: CapacitorConfig = {
  appId: 'com.punchyazilim.garantitakip',
  appName: 'Garanti Transfer Takip',
  webDir: 'www',
  backgroundColor: '#0A0A0A',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      backgroundColor: '#0A0A0A',
      showSpinner: false,
    },
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
