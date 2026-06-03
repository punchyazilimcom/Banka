import type { Transaction, ClassificationOverride } from '@gtt/shared';
import type { WorkerConfig } from './config.js';

/**
 * Worker → backend yazma arayüzü. SQLite (HTTP) ve Firebase (admin) için
 * iki uygulama. Worker ortama göre birini seçer.
 */
export interface BackendClient {
  /** Daha önce işlenmiş mailId'leri getirir (idempotency). */
  knownMailIds(): Promise<Set<string>>;
  /** Yeni işlemleri kalıcılaştırır (upsert). */
  saveTransactions(txs: Transaction[]): Promise<void>;
  /** Kullanıcının kalıcı sınıflandırma düzeltmelerini getirir. */
  getOverrides(): Promise<Record<string, ClassificationOverride>>;
}

/** Self-host SQLite backend ile HTTP üzerinden konuşur. */
class SqliteHttpClient implements BackendClient {
  constructor(
    private baseUrl: string,
    private secret: string,
  ) {}

  private headers() {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${this.secret}`,
    };
  }

  async knownMailIds(): Promise<Set<string>> {
    const res = await fetch(`${this.baseUrl}/api/mail-ids`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`mail-ids ${res.status}`);
    const ids = (await res.json()) as string[];
    return new Set(ids);
  }

  async saveTransactions(txs: Transaction[]): Promise<void> {
    if (!txs.length) return;
    const res = await fetch(`${this.baseUrl}/api/transactions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(txs),
    });
    if (!res.ok) throw new Error(`save ${res.status}: ${await res.text()}`);
  }

  async getOverrides(): Promise<Record<string, ClassificationOverride>> {
    const res = await fetch(`${this.baseUrl}/api/overrides`, {
      headers: this.headers(),
    });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, ClassificationOverride>;
  }
}

/**
 * Firebase Admin SDK ile Firestore'a yazar. firebase-admin opsiyonel bağımlılık
 * olduğundan dinamik import edilir (sqlite modunda kurulmamış olabilir).
 */
class FirebaseAdminClient implements BackendClient {
  private dbP: Promise<any>;

  constructor(serviceAccountPath?: string, projectId?: string) {
    this.dbP = (async () => {
      // Dinamik specifier: sqlite modunda firebase-admin kurulu olmayabilir,
      // bu yüzden statik tip çözümü yapılmaz (opsiyonel bağımlılık).
      const specifier = 'firebase-admin';
      const admin: any = await import(specifier).catch(() => {
        throw new Error(
          'firebase-admin kurulu değil. `npm i firebase-admin -w @gtt/worker` çalıştırın.',
        );
      });
      if (!admin.apps.length) {
        const cred = serviceAccountPath
          ? admin.credential.cert(serviceAccountPath)
          : admin.credential.applicationDefault();
        admin.initializeApp({ credential: cred, projectId });
      }
      const db = admin.firestore();
      // iban gibi opsiyonel alanlar undefined olabilir; Firestore bunu reddeder.
      db.settings({ ignoreUndefinedProperties: true });
      return db;
    })();
  }

  async knownMailIds(): Promise<Set<string>> {
    const db = await this.dbP;
    const snap = await db.collection('transactions').select('mailId').get();
    const set = new Set<string>();
    snap.forEach((d: any) => set.add(d.get('mailId')));
    return set;
  }

  async saveTransactions(txs: Transaction[]): Promise<void> {
    const db = await this.dbP;
    const batch = db.batch();
    for (const tx of txs) {
      batch.set(db.collection('transactions').doc(tx.id), tx, { merge: true });
    }
    await batch.commit();
    await this.sendPush(txs).catch((e) => console.warn('[fcm] push hatası:', e));
  }

  /** Yeni işlemler için kayıtlı cihazlara FCM push gönderir. */
  private async sendPush(txs: Transaction[]): Promise<void> {
    if (!txs.length) return;
    const specifier = 'firebase-admin';
    const admin: any = await import(specifier);
    const db = await this.dbP;
    const devSnap = await db.collection('devices').get();
    const tokens: string[] = [];
    devSnap.forEach((d: any) => tokens.push(d.get('token')));
    if (!tokens.length) return;

    const t = txs[txs.length - 1];
    const dir = t.direction === 'in' ? 'Gelen' : 'Giden';
    const body =
      txs.length > 1
        ? `${txs.length} yeni işlem`
        : `${t.amount.toLocaleString('tr-TR')} ${t.currency} · ${t.counterpartyName}`;

    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: `${dir} ${t.channel}`, body },
      data: { direction: t.direction, amount: String(t.amount) },
    });
  }

  async getOverrides(): Promise<Record<string, ClassificationOverride>> {
    const db = await this.dbP;
    const snap = await db.collection('overrides').get();
    const out: Record<string, ClassificationOverride> = {};
    snap.forEach((d: any) => (out[d.id] = d.data()));
    return out;
  }
}

export function createBackendClient(cfg: WorkerConfig): BackendClient {
  if (cfg.backendMode === 'firebase') {
    return new FirebaseAdminClient(
      cfg.firebase.serviceAccountPath,
      cfg.firebase.projectId,
    );
  }
  return new SqliteHttpClient(cfg.backendUrl, cfg.apiSecret);
}
