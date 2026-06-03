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

  // REPROCESS=true → bilinen mailId'leri yok say, hepsini yeniden ayrıştır.
  // Mevcut kayıtlar (aynı id) üzerine yazılır; parser düzeltmelerini uygulamak için.
  const reprocess = /^(1|true|yes)$/i.test(process.env.REPROCESS ?? '');
  if (reprocess) console.log('[worker] YENİDEN İŞLEME modu (REPROCESS) — tüm mailler yeniden ayrıştırılacak');

  const reader = new MailReader({
    settings: cfg.imap,
    knownMailIds: reprocess ? async () => new Set<string>() : () => backend.knownMailIds(),
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

  // SCAN_ONCE=true → tek seferlik tara ve çık (cron / GitHub Actions için)
  if (/^(1|true|yes)$/i.test(process.env.SCAN_ONCE ?? '')) {
    console.log('[worker] tek seferlik tarama modu (SCAN_ONCE)');
    await reader.runOnce();
    process.exit(0);
  }

  await reader.start();
}

main().catch((err) => {
  console.error('[worker] ölümcül hata:', err);
  process.exit(1);
});
