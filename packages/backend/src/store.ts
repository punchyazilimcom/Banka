import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Transaction, ClassificationOverride } from '@gtt/shared';

/**
 * SQLite kalıcı katmanı. Worker yazar, UI okur. İşlemler upsert (idempotent).
 */
export class Store {
  private db: Database.Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        mailId TEXT NOT NULL,
        direction TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        counterpartyName TEXT NOT NULL,
        counterpartyType TEXT NOT NULL,
        iban TEXT,
        description TEXT,
        channel TEXT NOT NULL,
        datetime TEXT NOT NULL,
        balanceAfter REAL,
        raw TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_tx_datetime ON transactions(datetime);
      CREATE INDEX IF NOT EXISTS idx_tx_mailId ON transactions(mailId);
      CREATE INDEX IF NOT EXISTS idx_tx_name ON transactions(counterpartyName);

      CREATE TABLE IF NOT EXISTS overrides (
        nameKey TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  knownMailIds(): string[] {
    return this.db
      .prepare('SELECT DISTINCT mailId FROM transactions')
      .all()
      .map((r: any) => r.mailId);
  }

  listTransactions(): Transaction[] {
    return this.db
      .prepare('SELECT * FROM transactions ORDER BY datetime DESC')
      .all() as Transaction[];
  }

  /** Yeni/güncel işlemleri upsert eder, gerçekten eklenenleri döndürür. */
  upsertTransactions(txs: Transaction[]): Transaction[] {
    const stmt = this.db.prepare(`
      INSERT INTO transactions
        (id, mailId, direction, amount, currency, counterpartyName,
         counterpartyType, iban, description, channel, datetime, balanceAfter, raw)
      VALUES
        (@id, @mailId, @direction, @amount, @currency, @counterpartyName,
         @counterpartyType, @iban, @description, @channel, @datetime, @balanceAfter, @raw)
      ON CONFLICT(id) DO UPDATE SET
        counterpartyType = excluded.counterpartyType,
        description = excluded.description,
        balanceAfter = excluded.balanceAfter
    `);
    const inserted: Transaction[] = [];
    const tx = this.db.transaction((rows: Transaction[]) => {
      for (const r of rows) {
        const info = stmt.run({
          ...r,
          iban: r.iban ?? null,
          description: r.description ?? '',
          balanceAfter: r.balanceAfter ?? null,
          raw: r.raw ?? '',
        });
        if (info.changes > 0) inserted.push(r);
      }
    });
    tx(txs);
    return inserted;
  }

  getOverrides(): Record<string, ClassificationOverride> {
    const rows = this.db.prepare('SELECT * FROM overrides').all() as any[];
    const out: Record<string, ClassificationOverride> = {};
    for (const r of rows) out[r.nameKey] = r;
    return out;
  }

  setOverride(o: ClassificationOverride) {
    this.db
      .prepare(
        `INSERT INTO overrides (nameKey, type, updatedAt)
         VALUES (@nameKey, @type, @updatedAt)
         ON CONFLICT(nameKey) DO UPDATE SET type = excluded.type, updatedAt = excluded.updatedAt`,
      )
      .run(o);
    // Aynı isimli tüm işlemlerin tipini de güncelle
    this.db
      .prepare(
        `UPDATE transactions SET counterpartyType = @type
         WHERE UPPER(counterpartyName) = @nameKey`,
      )
      .run({ type: o.type, nameKey: o.nameKey });
  }
}
