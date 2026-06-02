import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Aynı kod tabanı: web (dev), Electron (apps/desktop) ve Capacitor (apps/mobile)
// tarafından build edilir. Göreli base → file:// (Electron/Capacitor) uyumlu.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
  },
});
