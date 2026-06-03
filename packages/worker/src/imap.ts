import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { ImapSettings, Transaction, ClassificationOverride } from '@gtt/shared';
import { parseGarantiMail, htmlToText } from './parser.js';

export type OnTransactions = (txs: Transaction[]) => Promise<void>;

export interface MailReaderDeps {
  settings: ImapSettings;
  knownMailIds: () => Promise<Set<string>>;
  getOverrides: () => Promise<Record<string, ClassificationOverride>>;
  onTransactions: OnTransactions;
  log?: (msg: string) => void;
}

/**
 * Garanti bildirim maillerini IMAP ile okuyan servis.
 * - Açılışta son N günü tarar (idempotent: bilinen mailId'ler atlanır).
 * - IMAP IDLE ile yeni mailde anında çeker.
 */
export class MailReader {
  private client: ImapFlow;
  private log: (m: string) => void;
  private stopped = false;

  constructor(private deps: MailReaderDeps) {
    const s = deps.settings;
    this.log = deps.log ?? ((m) => console.log(`[imap] ${m}`));
    this.client = new ImapFlow({
      host: s.host,
      port: s.port,
      secure: s.secure,
      auth: { user: s.user, pass: s.password },
      logger: false,
    });
  }

  async start(): Promise<void> {
    if (!this.deps.settings.user || !this.deps.settings.password) {
      throw new Error('IMAP kullanıcı/şifre tanımlı değil (.env).');
    }
    await this.client.connect();
    this.log(`bağlandı: ${this.deps.settings.user}`);
    await this.client.mailboxOpen(this.deps.settings.mailbox);

    await this.scanRecent();

    // IDLE: yeni mail geldikçe tetikle
    this.client.on('exists', () => {
      void this.scanRecent().catch((e) => this.log(`scan hata: ${e}`));
    });
    this.log('IDLE dinleniyor — yeni mail bekleniyor…');
  }

  async stop(): Promise<void> {
    this.stopped = true;
    try {
      await this.client.logout();
    } catch {
      /* yoksay */
    }
  }

  /**
   * Tek seferlik tarama: bağlan → son N günü tara → bağlantıyı kapat.
   * IDLE dinlemez. Zamanlanmış (cron / GitHub Actions) çalıştırma için.
   */
  async runOnce(): Promise<void> {
    if (!this.deps.settings.user || !this.deps.settings.password) {
      throw new Error('IMAP kullanıcı/şifre tanımlı değil (.env).');
    }
    await this.client.connect();
    this.log(`bağlandı: ${this.deps.settings.user}`);
    await this.client.mailboxOpen(this.deps.settings.mailbox);
    await this.scanRecent();
    await this.stop();
    this.log('tek seferlik tarama tamamlandı.');
  }

  /** Son N gün içindeki, henüz işlenmemiş mailleri tarar. */
  async scanRecent(): Promise<void> {
    if (this.stopped) return;
    const s = this.deps.settings;
    const since = new Date(Date.now() - s.lookbackDays * 86_400_000);
    const known = await this.deps.knownMailIds();
    const overrides = await this.deps.getOverrides();

    const lock = await this.client.getMailboxLock(s.mailbox);
    const batch: Transaction[] = [];
    try {
      const search: Record<string, unknown> = { since };
      if (s.fromFilter) search.from = s.fromFilter;

      for await (const msg of this.client.fetch(search, {
        envelope: true,
        source: true,
      })) {
        const mailId = msg.envelope?.messageId ?? `uid-${msg.uid}`;
        if (known.has(mailId)) continue;

        const parsed = await simpleParser(msg.source as Buffer);
        const text =
          parsed.text ??
          (parsed.html ? htmlToText(parsed.html) : '') ??
          '';
        const tx = parseGarantiMail({
          mailId,
          subject: parsed.subject,
          text,
          receivedAt: parsed.date ?? undefined,
          overrides,
        });
        if (tx) {
          batch.push(tx);
          this.log(
            `+ ${tx.direction === 'in' ? 'GELEN' : 'GİDEN'} ${tx.amount} ${tx.currency} — ${tx.counterpartyName}`,
          );
        }
      }
    } finally {
      lock.release();
    }

    if (batch.length) {
      await this.deps.onTransactions(batch);
      this.log(`${batch.length} yeni işlem kaydedildi.`);
    }
  }
}
