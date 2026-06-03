import { loadConfig } from './config.js';
import { MailReader } from './imap.js';
import type { Transaction } from '@gtt/shared';

/**
 * IMAP KURU ÇALIŞTIRMA (dry-run): bağlantıyı ve ayrıştırmayı test eder.
 * Backend'e HİÇBİR ŞEY yazmaz — sadece son mailleri okuyup sonucu ekrana basar.
 * Mail kurulumunu doğrulamak için: `npm run test:imap --workspace=@gtt/worker`
 */
async function main() {
  const cfg = loadConfig();
  console.log('─'.repeat(60));
  console.log('  IMAP KURU ÇALIŞTIRMA (test) — hiçbir şey kaydedilmez');
  console.log('─'.repeat(60));
  console.log(`  Sunucu : ${cfg.imap.host}:${cfg.imap.port} (secure=${cfg.imap.secure})`);
  console.log(`  Hesap  : ${cfg.imap.user || '(BOŞ! .env IMAP_USER doldurun)'}`);
  console.log(`  Klasör : ${cfg.imap.mailbox}`);
  console.log(`  Tarama : son ${cfg.imap.lookbackDays} gün`);
  console.log(`  Filtre : ${cfg.imap.fromFilter ?? '(yok)'}`);
  console.log('─'.repeat(60));

  if (!cfg.imap.user || !cfg.imap.password) {
    console.error('\n  ✗ IMAP_USER / IMAP_PASSWORD .env içinde tanımlı değil.\n');
    process.exit(1);
  }

  const found: Transaction[] = [];
  const reader = new MailReader({
    settings: cfg.imap,
    knownMailIds: async () => new Set(), // hepsini tara
    getOverrides: async () => ({}),
    onTransactions: async (txs) => {
      found.push(...txs);
    },
    log: (m) => console.log(`  [imap] ${m}`),
  });

  try {
    // Sadece bir kez tara (IDLE dinlemeden) ve çık
    await (reader as any).client.connect();
    await (reader as any).client.mailboxOpen(cfg.imap.mailbox);
    console.log('  ✓ Bağlantı başarılı, mailler taranıyor…\n');
    await reader.scanRecent();
  } catch (e: any) {
    console.error(`\n  ✗ Bağlantı/okuma hatası: ${e?.message ?? e}`);
    // imapflow ayrıntılı alanları (gerçek sunucu yanıtı)
    if (e?.authenticationFailed) console.error('    → Kimlik doğrulama BAŞARISIZ (kullanıcı/parola reddedildi)');
    if (e?.serverResponseCode) console.error(`    → Sunucu kodu: ${e.serverResponseCode}`);
    if (e?.responseText) console.error(`    → Sunucu yanıtı: ${e.responseText}`);
    if (e?.response) console.error(`    → Yanıt: ${e.response}`);
    console.error('    İpucu: Outlook/Gmail için 2FA + "uygulama şifresi" gerekir; IMAP açık olmalı.');
    console.error('    Not: Microsoft bazı hesaplarda şifreyle IMAP girişini (basic auth) kapatmıştır → OAuth2 gerekebilir.');
    await reader.stop();
    process.exit(1);
  }

  console.log('\n' + '─'.repeat(60));
  if (found.length === 0) {
    console.log('  Hiç Garanti transfer maili ayrıştırılamadı.');
    console.log('  Olası nedenler:');
    console.log('   • Garanti e-posta bildirimleri kapalı (internet bankacılığından açın)');
    console.log('   • Bu klasörde son N günde bildirim maili yok');
    console.log('   • IMAP_FROM_FILTER yanlış (geçici olarak boş bırakıp deneyin)');
  } else {
    console.log(`  ✓ ${found.length} işlem ayrıştırıldı:\n`);
    for (const t of found.slice(0, 20)) {
      const yon = t.direction === 'in' ? 'GELEN ' : 'GİDEN ';
      const tip = t.counterpartyType === 'firm' ? '🏢' : '👤';
      console.log(
        `   ${yon} ${String(t.amount).padStart(10)} ${t.currency}  ${tip} ${t.counterpartyName}  [${t.channel}]  ${t.datetime.slice(0, 16)}`,
      );
    }
    if (found.length > 20) console.log(`   … ve ${found.length - 20} işlem daha`);
  }
  console.log('─'.repeat(60));
  console.log('  Bu bir testti — veri kaydedilmedi. Gerçek çalıştırma: npm run worker\n');

  await reader.stop();
  process.exit(0);
}

main().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
