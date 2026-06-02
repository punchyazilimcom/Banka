/**
 * Deterministik, ortamdan bağımsız (Node + tarayıcı) işlem kimliği.
 * FNV-1a tabanlı — kriptografik değil, sadece çakışmasız kimlik için.
 */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** mailId + işlem özniteliklerinden deterministik kimlik üretir (idempotent). */
export function createTxId(
  mailId: string,
  direction: string,
  amount: number,
  datetime: string,
): string {
  const base = `${mailId}|${direction}|${amount}|${datetime}`;
  // İki segmentli hash → çakışma olasılığını düşür
  return fnv1a(base) + fnv1a(base.split('').reverse().join(''));
}
