import type { Transaction, CounterpartySummary, Direction } from './types.js';
import { normalizeName } from './classify.js';

export interface Totals {
  in: number;
  out: number;
  net: number;
  count: number;
}

export function emptyTotals(): Totals {
  return { in: 0, out: 0, net: 0, count: 0 };
}

export function computeTotals(txs: Transaction[]): Totals {
  const t = emptyTotals();
  for (const tx of txs) {
    if (tx.direction === 'in') t.in += tx.amount;
    else t.out += tx.amount;
    t.count++;
  }
  t.net = t.in - t.out;
  return t;
}

export type Period = 'today' | 'week' | 'month' | 'all';

export function periodStart(period: Period, now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  switch (period) {
    case 'today':
      return d;
    case 'week': {
      // Pazartesi başlangıç
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      return d;
    }
    case 'month':
      d.setDate(1);
      return d;
    case 'all':
    default:
      return new Date(0);
  }
}

export function filterByPeriod(
  txs: Transaction[],
  period: Period,
  now = new Date(),
): Transaction[] {
  const start = periodStart(period, now).getTime();
  return txs.filter((t) => new Date(t.datetime).getTime() >= start);
}

/** YYYY-MM-DD gün anahtarı. */
export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export interface DailyFlow {
  date: string;
  in: number;
  out: number;
  net: number;
}

/** Günlük gelen/giden/net akış serisi (line chart için), tarih sıralı. */
export function dailyFlow(txs: Transaction[]): DailyFlow[] {
  const map = new Map<string, DailyFlow>();
  for (const tx of txs) {
    const k = dayKey(tx.datetime);
    const row = map.get(k) ?? { date: k, in: 0, out: 0, net: 0 };
    if (tx.direction === 'in') row.in += tx.amount;
    else row.out += tx.amount;
    row.net = row.in - row.out;
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Aylık gelen/giden (bar chart için). */
export function monthlyFlow(txs: Transaction[]): DailyFlow[] {
  const map = new Map<string, DailyFlow>();
  for (const tx of txs) {
    const k = tx.datetime.slice(0, 7); // YYYY-MM
    const row = map.get(k) ?? { date: k, in: 0, out: 0, net: 0 };
    if (tx.direction === 'in') row.in += tx.amount;
    else row.out += tx.amount;
    row.net = row.in - row.out;
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * İşlemleri normalize edilmiş isme göre gruplayıp kişi/firma kartı özetleri üretir.
 * counterpartyType ilk görülen işlemden alınır (override zaten parser'da uygulanmış olur).
 */
export function summarizeCounterparties(
  txs: Transaction[],
): CounterpartySummary[] {
  const map = new Map<
    string,
    CounterpartySummary & { _points: { t: number; net: number }[] }
  >();

  for (const tx of txs) {
    const key = normalizeName(tx.counterpartyName);
    let s = map.get(key);
    if (!s) {
      s = {
        name: tx.counterpartyName,
        type: tx.counterpartyType,
        totalIn: 0,
        totalOut: 0,
        net: 0,
        count: 0,
        lastDatetime: tx.datetime,
        spark: [],
        _points: [],
      };
      map.set(key, s);
    }
    if (tx.direction === 'in') s.totalIn += tx.amount;
    else s.totalOut += tx.amount;
    s.count++;
    s.net = s.totalIn - s.totalOut;
    if (tx.datetime > s.lastDatetime) s.lastDatetime = tx.datetime;
    s._points.push({
      t: new Date(tx.datetime).getTime(),
      net: tx.direction === 'in' ? tx.amount : -tx.amount,
    });
  }

  const result: CounterpartySummary[] = [];
  for (const s of map.values()) {
    s._points.sort((a, b) => a.t - b.t);
    let running = 0;
    s.spark = s._points.map((p) => (running += p.net));
    const { _points, ...clean } = s;
    void _points;
    result.push(clean);
  }
  // En aktif (işlem sayısı) önce
  return result.sort((a, b) => b.count - a.count);
}

/** Belirli yöndeki ilk N karşı taraf (raporlar). */
export function topCounterparties(
  txs: Transaction[],
  direction: Direction,
  n = 10,
): { name: string; total: number }[] {
  const map = new Map<string, { name: string; total: number }>();
  for (const tx of txs) {
    if (tx.direction !== direction) continue;
    const key = normalizeName(tx.counterpartyName);
    const row = map.get(key) ?? { name: tx.counterpartyName, total: 0 };
    row.total += tx.amount;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, n);
}
