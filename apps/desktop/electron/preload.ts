import { contextBridge, ipcRenderer } from 'electron';

/**
 * Güvenli köprü: renderer (core UI) → main process.
 * window.electronAPI.notify ile tray/native bildirim tetiklenir.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  notify: (title: string, body: string) => ipcRenderer.send('notify', title, body),
});
