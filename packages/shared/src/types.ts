/**
 * Paylaşılan veri modelleri. Worker (Node) ve core (browser) tarafından
 * birlikte kullanılır. Tek doğruluk kaynağı (single source of truth).
 */

export type Direction = 'in' | 'out';
export type CounterpartyType = 'person' | 'firm';
export type Channel = 'EFT' | 'FAST' | 'Havale' | 'Diğer';
export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP' | string;

/** Bir banka transfer işlemi (gelen/giden havale/EFT/FAST). */
export interface Transaction {
  /** Deterministik benzersiz kimlik (mailId tabanlı). */
  id: string;
  /** IMAP mesaj kimliği — idempotent (tekrarsız) işleme için. */
  mailId: string;
  direction: Direction;
  /** Pozitif tutar (yön ayrı tutulur). */
  amount: number;
  currency: Currency;
  counterpartyName: string;
  counterpartyType: CounterpartyType;
  iban?: string;
  description: string;
  channel: Channel;
  /** ISO 8601 tarih-saat. */
  datetime: string;
  /** İşlem sonrası bakiye (mailde varsa). */
  balanceAfter?: number;
  /** Ham mail gövdesi (denetim / yeniden ayrıştırma için). */
  raw: string;
}

/** Kullanıcının kalıcı sınıflandırma düzeltmesi. */
export interface ClassificationOverride {
  /** Normalize edilmiş isim anahtarı (büyük harf, boşluk sadeleştirilmiş). */
  nameKey: string;
  type: CounterpartyType;
  updatedAt: string;
}

/** Kişi/Firma kartı için toplanmış istatistik. */
export interface CounterpartySummary {
  name: string;
  type: CounterpartyType;
  totalIn: number;
  totalOut: number;
  net: number;
  count: number;
  lastDatetime: string;
  /** Tarih sıralı net akış noktaları (sparkline). */
  spark: number[];
}

export interface ImapSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  mailbox: string;
  lookbackDays: number;
  fromFilter?: string;
}
