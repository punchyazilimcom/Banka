import type { Transaction, ClassificationOverride, CounterpartyType } from '@gtt/shared';

/**
 * Cihaz tarafı veri kaynağı soyutlaması.
 * - sqlite: self-host backend + SSE (gerçek zamanlı)
 * - firebase: Firestore onSnapshot
 */
export interface DataSource {
  load(): Promise<Transaction[]>;
  /** Yeni işlemler geldikçe çağrılır. Aboneliği iptal eden fonksiyon döner. */
  subscribe(onNew: (txs: Transaction[]) => void): () => void;
  getOverrides(): Promise<Record<string, ClassificationOverride>>;
  setOverride(nameKey: string, type: CounterpartyType): Promise<void>;
}

const MODE = import.meta.env.VITE_BACKEND_MODE ?? 'sqlite';
const BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';
const SECRET = import.meta.env.VITE_API_SHARED_SECRET ?? '';

function authHeaders(): HeadersInit {
  return SECRET ? { authorization: `Bearer ${SECRET}` } : {};
}

// ── SQLite (self-host) kaynağı ──────────────────────────────────────────
class SqliteSource implements DataSource {
  async load(): Promise<Transaction[]> {
    const res = await fetch(`${BASE}/api/transactions`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`transactions ${res.status}`);
    return res.json();
  }

  subscribe(onNew: (txs: Transaction[]) => void): () => void {
    const es = new EventSource(`${BASE}/api/stream`);
    es.addEventListener('transactions', (e) => {
      try {
        onNew(JSON.parse((e as MessageEvent).data));
      } catch {
        /* yoksay */
      }
    });
    return () => es.close();
  }

  async getOverrides(): Promise<Record<string, ClassificationOverride>> {
    const res = await fetch(`${BASE}/api/overrides`, { headers: authHeaders() });
    return res.ok ? res.json() : {};
  }

  async setOverride(nameKey: string, type: CounterpartyType): Promise<void> {
    await fetch(`${BASE}/api/overrides`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ nameKey, type, updatedAt: new Date().toISOString() }),
    });
  }
}

// ── Firebase (Firestore) kaynağı — dinamik import (yalnızca firebase modunda) ──
class FirebaseSource implements DataSource {
  private dbP = (async () => {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    const app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    return getFirestore(app);
  })();

  async load(): Promise<Transaction[]> {
    const db = await this.dbP;
    const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
    const snap = await getDocs(query(collection(db, 'transactions'), orderBy('datetime', 'desc')));
    return snap.docs.map((d) => d.data() as Transaction);
  }

  subscribe(onNew: (txs: Transaction[]) => void): () => void {
    let unsub = () => {};
    (async () => {
      const db = await this.dbP;
      const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');
      const q = query(collection(db, 'transactions'), orderBy('datetime', 'desc'), limit(50));
      unsub = onSnapshot(q, (snap) => {
        const added: Transaction[] = [];
        snap.docChanges().forEach((c) => {
          if (c.type === 'added') added.push(c.doc.data() as Transaction);
        });
        if (added.length) onNew(added);
      });
    })();
    return () => unsub();
  }

  async getOverrides(): Promise<Record<string, ClassificationOverride>> {
    const db = await this.dbP;
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, 'overrides'));
    const out: Record<string, ClassificationOverride> = {};
    snap.forEach((d) => (out[d.id] = d.data() as ClassificationOverride));
    return out;
  }

  async setOverride(nameKey: string, type: CounterpartyType): Promise<void> {
    const db = await this.dbP;
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'overrides', nameKey), {
      nameKey,
      type,
      updatedAt: new Date().toISOString(),
    });
  }
}

let _source: DataSource | null = null;
export function getDataSource(): DataSource {
  if (!_source) _source = MODE === 'firebase' ? new FirebaseSource() : new SqliteSource();
  return _source;
}
