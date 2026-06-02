import 'dotenv/config';
import { createServer } from './server.js';

/**
 * Self-host backend giriş noktası (BACKEND_MODE=sqlite).
 * Firebase modunda bu sunucuya gerek yoktur; Firestore doğrudan kullanılır.
 */
const mode = process.env.BACKEND_MODE ?? 'sqlite';
if (mode === 'firebase') {
  console.log(
    '[backend] BACKEND_MODE=firebase — self-host sunucu gerekmez. ' +
      'Firestore kuralları için packages/backend/firebase/ klasörüne bakın.',
  );
  process.exit(0);
}

createServer({
  sqlitePath: process.env.SQLITE_PATH ?? './data/transactions.sqlite',
  port: Number(process.env.BACKEND_PORT ?? 4000),
  apiSecret: process.env.API_SHARED_SECRET ?? '',
});
