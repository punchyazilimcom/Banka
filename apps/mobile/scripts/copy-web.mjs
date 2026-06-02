// Core UI build çıktısını (packages/core/dist) Capacitor webDir'ine (www) kopyalar.
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '..', '..', '..', 'packages', 'core', 'dist');
const dest = resolve(here, '..', 'www');

if (!existsSync(src)) {
  console.error('[mobile] packages/core/dist bulunamadı. Önce `npm run build:core` çalıştırın.');
  process.exit(1);
}

await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log(`[mobile] web varlıkları kopyalandı → ${dest}`);
