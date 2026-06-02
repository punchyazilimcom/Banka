import { loadConfig } from './config.js';
import { createBackendClient } from './backendClient.js';
import { MailReader } from './imap.js';

/**
 * Worker giriş noktası: IMAP'i dinler, Garanti maillerini ayrıştırır,
 * yeni işlemleri seçili backend'e (SQLite/Firebase) yazar.
 */
async function main() {
  const cfg = loadConfig();
  console.log(`[worker] backend modu: ${cfg.backendMode}`);

  const backend = createBackendClient(cfg);

  const reader = new MailReader({
    settings: cfg.imap,
    knownMailIds: () => backend.knownMailIds(),
    getOverrides: () => backend.getOverrides(),
    onTransactions: (txs) => backend.saveTransactions(txs),
  });

  const shutdown = async () => {
    console.log('\n[worker] kapatılıyor…');
    await reader.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await reader.start();
}

main().catch((err) => {
  console.error('[worker] ölümcül hata:', err);
  process.exit(1);
});
