import {
  type Transaction,
  type Direction,
  type Channel,
  type Currency,
  type ClassificationOverride,
  classifyCounterparty,
  parseTurkishAmount,
} from '@gtt/shared';
import { createHash } from 'node:crypto';

export interface ParseInput {
  /** IMAP message id (idempotency anahtarı). */
  mailId: string;
  subject?: string;
  /** Düz metin gövde (HTML ise önce strip edilmeli). */
  text: string;
  /** Mailin tarihi (gövdede tarih yoksa fallback). */
  receivedAt?: Date;
  /** Kullanıcı sınıflandırma düzeltmeleri. */
  overrides?: Record<string, ClassificationOverride>;
}

/** HTML gövdeyi kabaca düz metne çevirir. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|td|table|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

const DIRECTION_IN = /(hesab[ıi]n[ıi]za|gelen|yat[ıi]r[ıi]ld[ıi]|alaca[ğg][ıi]n[ıi]za|g[öo]nderen|tahsilat|para\s+geldi|hesab[ıi]n[ıi]za\s+geçen)/i;
const DIRECTION_OUT = /(hesab[ıi]n[ıi]zdan|giden|g[öo]nderildi|[çc][ıi]k[ıi][şs]|borcunuza|al[ıi]c[ıi]|transfer\s+etti|[öo]demeniz|hesab[ıi]n[ıi]zdan\s+[çc][ıi]kan)/i;

const CHANNEL_PATTERNS: [RegExp, Channel][] = [
  [/\bFAST\b/i, 'FAST'],
  [/\bEFT\b/i, 'EFT'],
  [/\bhavale\b/i, 'Havale'],
];

const CURRENCY_PATTERNS: [RegExp, Currency][] = [
  [/\b(TL|TRY|₺)\b/i, 'TRY'],
  [/\b(USD|\$|dolar)\b/i, 'USD'],
  [/\b(EUR|€|euro|avro)\b/i, 'EUR'],
  [/\b(GBP|£|sterlin)\b/i, 'GBP'],
];

// Tutar: para birimi çıpalı. "1.234,56 TL" / "TL 1.234,56" / "₺1.234,56".
// Çıpa zorunlu → tarih (15.03.2024), IBAN ve hesap no yanlışlıkla tutar sayılmaz.
const CUR = 'TL|TRY|₺|USD|\\$|EUR|€|GBP|£';
const NUM = '[0-9]{1,3}(?:[.\\s][0-9]{3})*(?:,[0-9]{2})?|[0-9]+(?:,[0-9]{2})';
const AMOUNT_RX = new RegExp(
  `(${NUM})\\s*(?:${CUR})|(?:${CUR})\\s*(${NUM})`,
  'gi',
);

const IBAN_RX = /TR\d{2}(?:[ ]?\d){22}/i;
const DATETIME_RX =
  /(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;

/** "Açıklama: ...", "Gönderen: ...", "Alıcı: ..." gibi etiketli alanları çeker. */
function extractLabeled(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const rx = new RegExp(
      `${label}\\s*[:：]?\\s*(.+?)(?:\\n|$|\\s{2,}|İban|IBAN|Açıklama|Tutar|Kanal|Tarih)`,
      'i',
    );
    const m = text.match(rx);
    if (m && m[1]) {
      const v = m[1].trim().replace(/[\s.,;]+$/, '');
      if (v) return v;
    }
  }
  return undefined;
}

function detectDirection(text: string, subject = ''): Direction | null {
  const hay = `${subject}\n${text}`;
  const inHit = DIRECTION_IN.test(hay);
  const outHit = DIRECTION_OUT.test(hay);
  if (inHit && !outHit) return 'in';
  if (outHit && !inHit) return 'out';
  // Her ikisi de geçiyorsa: alıcı/giden ibaresi çıkış lehine baskındır.
  if (outHit && /al[ıi]c[ıi]|g[öo]nderildi|hesab[ıi]n[ıi]zdan/i.test(hay)) return 'out';
  if (inHit) return 'in';
  return null;
}

function detectChannel(text: string): Channel {
  for (const [rx, ch] of CHANNEL_PATTERNS) if (rx.test(text)) return ch;
  return 'Diğer';
}

function detectCurrency(text: string): Currency {
  for (const [rx, cur] of CURRENCY_PATTERNS) if (rx.test(text)) return cur;
  return 'TRY';
}

function parseDateTime(text: string, fallback?: Date): string {
  const m = text.match(DATETIME_RX);
  if (m) {
    const [, dd, mm, yyyy, hh = '0', min = '0', ss = '0'] = m;
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min),
      Number(ss),
    );
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return (fallback ?? new Date()).toISOString();
}

/**
 * Gövdedeki tutarları toplar. En büyük makul tutar = işlem tutarı,
 * "kullanılabilir bakiye / bakiyeniz" yakınındaki = işlem sonrası bakiye.
 */
function extractAmounts(text: string): { amount: number; balanceAfter?: number } {
  const matches: { value: number; index: number }[] = [];
  for (const m of text.matchAll(AMOUNT_RX)) {
    const raw = m[1] ?? m[2];
    if (!raw) continue;
    const value = parseTurkishAmount(raw);
    if (!isNaN(value) && value > 0 && m.index != null) {
      matches.push({ value, index: m.index });
    }
  }
  if (matches.length === 0) return { amount: NaN };

  // Bakiye: "bakiye" kelimesini içeren en yakın eşleşme
  const balanceRx = /(kullan[ıi]labilir\s+bakiye|bakiyeniz|bakiye|kalan)/gi;
  let balanceAfter: number | undefined;
  let balanceIdx = -1;
  let bm: RegExpExecArray | null;
  while ((bm = balanceRx.exec(text))) {
    const after = matches
      .filter((x) => x.index >= bm!.index)
      .sort((a, b) => a.index - b.index)[0];
    if (after) {
      balanceAfter = after.value;
      balanceIdx = after.index;
    }
  }

  // İşlem tutarı: bakiye dışındaki en büyük tutar
  const txCandidates = matches.filter((x) => x.index !== balanceIdx);
  const pool = txCandidates.length ? txCandidates : matches;
  const amount = pool.reduce((mx, x) => Math.max(mx, x.value), 0);

  return { amount, balanceAfter };
}

function extractIban(text: string): string | undefined {
  const m = text.match(IBAN_RX);
  return m ? m[0].replace(/\s+/g, '') : undefined;
}

function extractCounterparty(text: string, direction: Direction): string {
  const inLabels = ['Gönderen', 'Gonderen', 'Gönderen Ad', 'Ad Soyad', 'Gönderen Adı'];
  const outLabels = ['Alıcı', 'Alici', 'Alıcı Ad', 'Alıcı Adı', 'Alıcı Ad Soyad', 'Hesap Sahibi'];
  const labels = direction === 'in' ? [...inLabels, ...outLabels] : [...outLabels, ...inLabels];
  const found = extractLabeled(text, labels);
  if (found) return cleanName(found);
  return 'Bilinmeyen';
}

function cleanName(s: string): string {
  return s
    .replace(/\b(TR\d{2}[\d ]+)\b/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s:.-]+|[\s:.-]+$/g, '')
    .trim();
}

/**
 * Bir Garanti bildirim mailini Transaction'a ayrıştırır.
 * Zorunlu alanlar (yön + tutar) çıkarılamazsa null döner (mail işleme dışı).
 */
export function parseGarantiMail(input: ParseInput): Transaction | null {
  const text = input.text.replace(/\r/g, '');
  const hay = `${input.subject ?? ''}\n${text}`;

  const direction = detectDirection(text, input.subject);
  if (!direction) return null;

  const { amount, balanceAfter } = extractAmounts(hay);
  if (isNaN(amount) || amount <= 0) return null;

  const currency = detectCurrency(hay);
  const channel = detectChannel(hay);
  const iban = extractIban(hay);
  const datetime = parseDateTime(hay, input.receivedAt);
  const counterpartyName = extractCounterparty(text, direction);
  const counterpartyType = classifyCounterparty(counterpartyName, input.overrides);
  const description =
    extractLabeled(text, ['Açıklama', 'Aciklama', 'İşlem Açıklaması', 'Not']) ?? '';

  const id = createHash('sha1')
    .update(`${input.mailId}|${direction}|${amount}|${datetime}`)
    .digest('hex')
    .slice(0, 24);

  return {
    id,
    mailId: input.mailId,
    direction,
    amount,
    currency,
    counterpartyName,
    counterpartyType,
    iban,
    description,
    channel,
    datetime,
    balanceAfter,
    raw: text.slice(0, 4000),
  };
}
