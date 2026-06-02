import type { Transaction } from './types.js';
import { classifyCounterparty } from './classify.js';
import { createTxId } from './id.js';

/**
 * Gerçekçi örnek işlemler (UI mock + backend seed). Son ~60 güne yayılır.
 * Deterministik (sabit tohum) — testlerde de kullanılabilir.
 */
export function sampleTransactions(now = new Date('2026-06-02T12:00:00')): Transaction[] {
  const people = ['Ahmet Yılmaz', 'Ayşe Kaya', 'Mehmet Demir', 'Fatma Şahin', 'Can Öztürk'];
  const firms = [
    'ABC İNŞAAT SAN. VE TİC. LTD. ŞTİ.',
    'XYZ GIDA A.Ş.',
    'Delta Yazılım Ltd.',
    'Marmara Lojistik TİC.',
    'Punch Yazılım',
  ];
  const channels = ['EFT', 'FAST', 'Havale'] as const;
  const descs = ['Kira ödemesi', 'Fatura', 'Maaş', 'Danışmanlık', 'Mal alımı', 'İade', ''];

  // Basit deterministik PRNG (mulberry32)
  let seed = 1337;
  const rnd = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];

  const txs: Transaction[] = [];
  let balance = 25_000;
  for (let i = 0; i < 80; i++) {
    const daysAgo = Math.floor(rnd() * 60);
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(8 + Math.floor(rnd() * 12), Math.floor(rnd() * 60), 0, 0);

    const isFirm = rnd() > 0.45;
    const name = isFirm ? pick(firms) : pick(people);
    const direction = rnd() > 0.5 ? 'in' : 'out';
    const amount = Math.round((rnd() * 9000 + 200) * 100) / 100;
    balance += direction === 'in' ? amount : -amount;
    const datetime = d.toISOString();
    const mailId = `seed-${i}@garanti`;

    txs.push({
      id: createTxId(mailId, direction, amount, datetime),
      mailId,
      direction,
      amount,
      currency: 'TRY',
      counterpartyName: name,
      counterpartyType: classifyCounterparty(name),
      iban: 'TR' + String(330006200012340006678901n + BigInt(i)),
      description: pick(descs),
      channel: pick(channels),
      datetime,
      balanceAfter: Math.round(balance * 100) / 100,
      raw: 'örnek veri',
    });
  }
  return txs.sort((a, b) => b.datetime.localeCompare(a.datetime));
}
