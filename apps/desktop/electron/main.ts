import { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

/** Paketlenmiş (.exe) veya geliştirme modunda core UI dist yolunu çözer. */
function resolveUiIndex(): string {
  // electron-builder: extraResources → resources/app-ui
  const packaged = path.join(process.resourcesPath ?? '', 'app-ui', 'index.html');
  if (fs.existsSync(packaged)) return packaged;
  // dev: monorepo packages/core/dist
  return path.join(__dirname, '..', '..', '..', 'packages', 'core', 'dist', 'index.html');
}

function createTrayIcon(): Electron.NativeImage {
  // Sarı kare placeholder ikon (16x16) — assets olmadan da çalışır
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAALklEQVR42mP8z8BQz0BFwDiqgFENjCpgVAOjGhjVwKgGRjUwqoFRDYxqYFQDAwCk6gQBl9o0bgAAAABJRU5ErkJggg==';
  return nativeImage.createFromBuffer(Buffer.from(png, 'base64'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0A0A0A',
    title: 'Garanti Transfer Takip',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(resolveUiIndex());

  mainWindow.on('close', (e) => {
    // Tray'e küçült (kapatma yerine)
    if (!(app as any).isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => (mainWindow = null));
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Garanti Transfer Takip · Punch Yazılım');
  const menu = Menu.buildFromTemplate([
    { label: 'Aç', click: () => mainWindow?.show() },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => mainWindow?.show());
}

// Renderer'dan tray/native bildirim isteği (preload köprüsü)
ipcMain.on('notify', (_e, title: string, body: string) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Tray'de kalmaya devam (macOS dışı da dahil bilinçli tercih)
  if (process.platform !== 'darwin') {
    /* tray açık kalır */
  }
});
