import { describe, it, expect } from 'vitest';
import {
  parseTurkishAmount,
  formatMoney,
  classifyCounterparty,
  normalizeName,
  applyOverride,
  computeTotals,
  filterByPeriod,
  dailyFlow,
  monthlyFlow,
  summarizeCounterparties,
  topCounterparties,
  periodStart,
  createTxId,
  type Transaction,
} from '../src/index.js';
import { sampleTransactions } from '../src/sample.js';

// ── Para ayrıştırma ──────────────────────────────────────────────────────
describe('parseTurkishAmount', () => {
  it('TR format binlik nokta + ondalık virgül', () => {
    expect(parseTurkishAmount('1.234,56')).toBe(1234.56);
    expect(parseTurkishAmount('12.345,67')).toBe(12345.67);
    expect(parseTurkishAmount('1.000.000,00')).toBe(1000000);
  });
  it('sadece virgül → ondalık', () => expect(parseTurkishAmount('500,00')).toBe(500));
  it('EN format', () => expect(parseTurkishAmount('1,234.56')).toBe(1234.56));
  it('tam sayı', () => expect(parseTurkishAmount('750')).toBe(750));
  it('geçersiz → NaN', () => expect(Number.isNaN(parseTurkishAmount('abc'))).toBe(true));
});

describe('formatMoney', () => {
  it('TRY sembolü ekler', () => {
    const s = formatMoney(1234.5, 'TRY');
    expect(s).toMatch(/₺|TL/);
    expect(s).toContain('1.234,5');
  });
});

// ── Sınıflandırma ────────────────────────────────────────────────────────
describe('classifyCounterparty', () => {
  it('firma ekleri', () => {
    expect(classifyCounterparty('ABC İNŞAAT SAN. VE TİC. LTD. ŞTİ.')).toBe('firm');
    expect(classifyCounterparty('XYZ GIDA A.Ş.')).toBe('firm');
    expect(classifyCounterparty('Delta Yazılım Ltd.')).toBe('firm');
    expect(classifyCounterparty('Marmara Lojistik TİC.')).toBe('firm');
  });
  it('kişi', () => {
    expect(classifyCounterparty('Ahmet Yılmaz')).toBe('person');
    expect(classifyCounterparty('Ayşe Kaya')).toBe('person');
  });
  it('yanlış pozitif önleme (SANEM ≠ SAN)', () =>
    expect(classifyCounterparty('Sanem Demir')).toBe('person'));
  it('10 haneli VKN → firma', () => expect(classifyCounterparty('1234567890')).toBe('firm'));
  it('11 haneli TC → kişi', () => expect(classifyCounterparty('12345678901')).toBe('person'));
  it('override önceliklidir', () => {
    const ov = applyOverride({}, 'Ahmet Yılmaz', 'firm');
    expect(classifyCounterparty('ahmet yılmaz', ov)).toBe('firm');
  });
});

describe('normalizeName', () => {
  it('TR büyük harf + boşluk sadeleştirme', () =>
    expect(normalizeName('  ahmet   yılmaz . ')).toBe('AHMET YILMAZ'));
});

// ── Toplama ──────────────────────────────────────────────────────────────
const txs: Transaction[] = [
  mk('a', 'in', 100, '2026-06-01T10:00:00.000Z', 'Ahmet Yılmaz'),
  mk('b', 'out', 40, '2026-06-01T12:00:00.000Z', 'ABC LTD ŞTİ'),
  mk('c', 'in', 60, '2026-06-02T09:00:00.000Z', 'Ahmet Yılmaz'),
];
function mk(id: string, direction: 'in' | 'out', amount: number, datetime: string, name: string): Transaction {
  return {
    id, mailId: id, direction, amount, currency: 'TRY',
    counterpartyName: name, counterpartyType: classifyCounterparty(name),
    description: '', channel: 'FAST', datetime, raw: '',
  };
}

describe('computeTotals', () => {
  it('gelen/giden/net/sayı', () => {
    const t = computeTotals(txs);
    expect(t.in).toBe(160);
    expect(t.out).toBe(40);
    expect(t.net).toBe(120);
    expect(t.count).toBe(3);
  });
});

describe('dailyFlow / monthlyFlow', () => {
  it('günlük gruplar (2 gün)', () => {
    const f = dailyFlow(txs);
    expect(f.length).toBe(2);
    expect(f[0].date).toBe('2026-06-01');
    expect(f[0].net).toBe(60); // 100 - 40
  });
  it('aylık tek grup', () => {
    const m = monthlyFlow(txs);
    expect(m.length).toBe(1);
    expect(m[0].date).toBe('2026-06');
    expect(m[0].in).toBe(160);
  });
});

describe('summarizeCounterparties', () => {
  it('isme göre gruplar + net + sparkline', () => {
    const s = summarizeCounterparties(txs);
    const ahmet = s.find((x) => x.name === 'Ahmet Yılmaz')!;
    expect(ahmet.count).toBe(2);
    expect(ahmet.totalIn).toBe(160);
    expect(ahmet.net).toBe(160);
    expect(ahmet.spark.length).toBe(2);
    expect(ahmet.type).toBe('person');
  });
});

describe('topCounterparties', () => {
  it('giden yönde sıralı', () => {
    const top = topCounterparties(txs, 'out', 10);
    expect(top[0].name).toBe('ABC LTD ŞTİ');
    expect(top[0].total).toBe(40);
  });
});

describe('filterByPeriod / periodStart', () => {
  it('today filtresi', () => {
    const now = new Date('2026-06-02T15:00:00.000Z');
    const f = filterByPeriod(txs, 'today', now);
    expect(f.every((t) => t.datetime >= periodStart('today', now).toISOString())).toBe(true);
  });
  it('all hepsini döner', () =>
    expect(filterByPeriod(txs, 'all').length).toBe(3));
});

// ── ID & örnek veri ─────────────────────────────────────────────────────
describe('createTxId', () => {
  it('deterministik (idempotent)', () =>
    expect(createTxId('m', 'in', 100, 'd')).toBe(createTxId('m', 'in', 100, 'd')));
  it('girdi değişince değişir', () =>
    expect(createTxId('m', 'in', 100, 'd')).not.toBe(createTxId('m', 'out', 100, 'd')));
});

describe('sampleTransactions', () => {
  const s = sampleTransactions();
  it('80 işlem üretir', () => expect(s.length).toBe(80));
  it('tarihe göre azalan sıralı', () => {
    for (let i = 1; i < s.length; i++) expect(s[i - 1].datetime >= s[i].datetime).toBe(true);
  });
  it('benzersiz id', () => expect(new Set(s.map((t) => t.id)).size).toBe(80));
});
