import type { Currency } from './types.js';

/**
 * Türkçe tutar formatını ("1.234,56" veya "1234,56" ya da "1,234.56")
 * sayıya çevirir. Garanti mailleri TR formatı (binlik nokta, ondalık virgül)
 * kullanır; güvenlik için her iki formatı da tolere ederiz.
 */
export function parseTurkishAmount(input: string): number {
  let s = input.trim().replace(/[^\d.,-]/g, '');
  if (!s) return NaN;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // Son görülen ayraç ondalık ayraçtır.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // TR: nokta binlik, virgül ondalık
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // EN: virgül binlik, nokta ondalık
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Sadece virgül → ondalık ayraç
    s = s.replace(',', '.');
  }
  // sadece nokta → zaten ondalık (binlik ayrımı belirsiz, olduğu gibi bırak)

  return parseFloat(s);
}

const CURRENCY_FORMATS: Record<string, string> = {
  TRY: 'tr-TR',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

/** Para birimi sembollü, tabular biçimli görüntü dizesi. */
export function formatMoney(amount: number, currency: Currency = 'TRY'): string {
  const locale = CURRENCY_FORMATS[currency] ?? 'tr-TR';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Sembolsüz, gruplanmış sayı (örn. sayaç animasyonu için). */
export function formatNumber(amount: number, locale = 'tr-TR'): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
