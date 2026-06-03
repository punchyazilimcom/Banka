import type { CounterpartyType, ClassificationOverride } from './types.js';

/**
 * İsim normalleştirme: büyük harf (TR uyumlu), fazla boşluk/nokta sadeleştirme.
 * Override eşleştirmesi ve gruplama anahtarı olarak kullanılır.
 */
export function normalizeName(name: string): string {
  return name
    .toLocaleUpperCase('tr-TR')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Firma göstergesi ekler/kısaltmalar. Kelime sınırıyla eşleşir,
 * böylece "SANEM" gibi isimler yanlışlıkla "SAN" sayılmaz.
 */
const FIRM_TOKENS = [
  'LTD',
  'STI',
  'ŞTİ',
  'STİ',
  'AS',
  'A\\.?Ş', // A.Ş / AŞ
  'AŞ',
  'SAN',
  'TIC',
  'TİC',
  'INS',
  'İNŞ',
  'INŞ',
  'MALZ',
  'GIDA',
  'GİDA',
  'HOLDING',
  'SIRKETI',
  'ŞİRKETİ',
  'SANAYI',
  'SANAYİ',
  'TICARET',
  'TİCARET',
  'KOOP',
  'DIS',
  'DIŞ',
  'ITH',
  'İTH',
  'IHR',
  'İHR',
];

const FIRM_REGEX = new RegExp(
  `(^|[^A-ZÇĞİÖŞÜ])(${FIRM_TOKENS.join('|')})([^A-ZÇĞİÖŞÜ]|$)`,
  'i',
);

/** 10 haneli VKN (Vergi Kimlik No) — firma göstergesi. (TC Kimlik 11 hane.) */
const VKN_REGEX = /(^|\D)(\d{10})(\D|$)/;

/**
 * Kişi mi firma mı? Önce kullanıcı override'ı (kalıcı düzeltme), sonra
 * isim ekleri / VKN sezgisi.
 */
export function classifyCounterparty(
  name: string,
  overrides: Record<string, ClassificationOverride> = {},
): CounterpartyType {
  const key = normalizeName(name);
  const override = overrides[key];
  if (override) return override.type;

  // Firma eki testi NOKTALI orijinal isim üzerinde yapılır ("A.Ş.", "Ltd.")
  // çünkü normalizeName noktaları boşluğa çevirir ve "A.Ş" kaçabilir.
  const upperDotted = name.toLocaleUpperCase('tr-TR');
  if (FIRM_REGEX.test(upperDotted)) return 'firm';

  // VKN: tam olarak 10 hane ardışık rakam (TC kimlik 11 hane → kişi olabilir).
  const vknMatch = key.match(VKN_REGEX);
  if (vknMatch && !/\d{11}/.test(key)) return 'firm';

  return 'person';
}

/** Override haritasına bir düzeltme ekler (immutable). */
export function applyOverride(
  overrides: Record<string, ClassificationOverride>,
  name: string,
  type: CounterpartyType,
): Record<string, ClassificationOverride> {
  const key = normalizeName(name);
  return {
    ...overrides,
    [key]: { nameKey: key, type, updatedAt: new Date().toISOString() },
  };
}
