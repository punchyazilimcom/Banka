import { create } from 'zustand';
import {
  type Transaction,
  type ClassificationOverride,
  type CounterpartyType,
  normalizeName,
} from '@gtt/shared';
import { sampleTransactions } from '@gtt/shared/sample';
import { getDataSource } from '../lib/datasource';
import type { ThemeName } from '../theme/tokens';

export interface Settings {
  theme: ThemeName;
  syncIntervalSec: number;
  notificationsEnabled: boolean;
  /** Backend erişilemezse örnek veri kullan (demo). */
  useMockOnError: boolean;
  /** Aylık harcama (giden) limiti; 0/undefined = limit yok. */
  monthlyLimit?: number;
}

const SETTINGS_KEY = 'gtt.settings';
function loadSettings(): Settings {
  try {
    return {
      theme: 'dark',
      syncIntervalSec: 60,
      notificationsEnabled: true,
      useMockOnError: true,
      monthlyLimit: 0,
      ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}'),
    };
  } catch {
    return { theme: 'dark', syncIntervalSec: 60, notificationsEnabled: true, useMockOnError: true, monthlyLimit: 0 };
  }
}

interface State {
  authed: boolean;
  loading: boolean;
  usingMock: boolean;
  transactions: Transaction[];
  overrides: Record<string, ClassificationOverride>;
  settings: Settings;
  lastNew: Transaction | null;

  setAuthed: (v: boolean) => void;
  init: () => Promise<void>;
  reload: () => Promise<void>;
  ingestNew: (txs: Transaction[]) => void;
  correctType: (name: string, type: CounterpartyType) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => void;
  logout: () => Promise<void>;
}

export const useStore = create<State>((set, get) => ({
  authed: false,
  loading: true,
  usingMock: false,
  transactions: [],
  overrides: {},
  settings: loadSettings(),
  lastNew: null,

  setAuthed: (v) => set({ authed: v }),

  init: async () => {
    set({ loading: true });
    const ds = getDataSource();
    try {
      const [txs, overrides] = await Promise.all([ds.load(), ds.getOverrides()]);
      set({ transactions: txs, overrides, loading: false, usingMock: false });
      ds.subscribe((news) => get().ingestNew(news));
    } catch (e) {
      console.warn('[store] backend erişilemedi, örnek veriye düşülüyor:', e);
      if (get().settings.useMockOnError) {
        set({ transactions: sampleTransactions(), loading: false, usingMock: true });
      } else {
        set({ loading: false });
      }
    }
  },

  reload: async () => {
    const ds = getDataSource();
    try {
      const txs = await ds.load();
      set({ transactions: txs, usingMock: false });
    } catch {
      if (get().settings.useMockOnError && get().transactions.length === 0) {
        set({ transactions: sampleTransactions(), usingMock: true });
      }
    }
  },

  ingestNew: (incoming) => {
    const existing = get().transactions;
    const byId = new Map(existing.map((t) => [t.id, t]));
    let newest: Transaction | null = null;
    for (const t of incoming) {
      if (!byId.has(t.id)) newest = t;
      byId.set(t.id, t);
    }
    const merged = [...byId.values()].sort((a, b) => b.datetime.localeCompare(a.datetime));
    set({ transactions: merged, lastNew: newest });
  },

  correctType: async (name, type) => {
    const key = normalizeName(name);
    // İyimser güncelleme: yereldeki aynı isimli işlemleri ve override'ı güncelle
    set((s) => ({
      overrides: { ...s.overrides, [key]: { nameKey: key, type, updatedAt: new Date().toISOString() } },
      transactions: s.transactions.map((t) =>
        normalizeName(t.counterpartyName) === key ? { ...t, counterpartyType: type } : t,
      ),
    }));
    try {
      await getDataSource().setOverride(key, type);
    } catch (e) {
      console.warn('[store] override kaydedilemedi:', e);
    }
  },

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    set({ settings: next });
  },

  logout: async () => {
    try {
      const { firebaseAuthRequired, signOutFirebase } = await import('../lib/firebase');
      if (firebaseAuthRequired()) await signOutFirebase();
    } catch (e) {
      console.warn('[store] firebase çıkış:', e);
    }
    set({ authed: false, transactions: [], lastNew: null });
  },
}));
