import type { Transaction } from '@gtt/shared';
import { formatMoney } from '@gtt/shared';

/**
 * Yeni işlem bildirimi: masaüstünde tray (electronAPI köprüsü),
 * mobil/web'de Notification API. Sessizce başarısız olur.
 */
export function notifyNewTransaction(tx: Transaction) {
  const dir = tx.direction === 'in' ? 'Gelen' : 'Giden';
  const title = `${dir} ${tx.channel}`;
  const body = `${formatMoney(tx.amount, tx.currency)} · ${tx.counterpartyName}`;

  // Electron tray/native bildirim köprüsü
  if (window.electronAPI?.notify) {
    window.electronAPI.notify(title, body);
    return;
  }

  // Web / Capacitor Notification API
  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') new Notification(title, { body });
        });
      }
    }
  } catch {
    /* yoksay */
  }
}

export function requestNotificationPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  } catch {
    /* yoksay */
  }
}
