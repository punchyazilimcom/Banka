import 'dotenv/config';
import { Store } from './store.js';
import { sampleTransactions } from '@gtt/shared/sample';

/**
 * SQLite'ı örnek işlemlerle doldurur (UI'yı IMAP olmadan denemek için).
 * Çalıştır: `npm run seed --workspace=@gtt/backend`
 */
const store = new Store(process.env.SQLITE_PATH ?? './data/transactions.sqlite');
const inserted = store.upsertTransactions(sampleTransactions());
console.log(`[seed] ${inserted.length} örnek işlem eklendi.`);
