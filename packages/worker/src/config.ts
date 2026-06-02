import 'dotenv/config';
import type { ImapSettings } from '@gtt/shared';

function bool(v: string | undefined, def = false): boolean {
  if (v == null || v.trim() === '') return def; // boş env → varsayılan
  return /^(1|true|yes|on)$/i.test(v);
}

function num(v: string | undefined, def: number): number {
  if (v == null || v.trim() === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export interface WorkerConfig {
  imap: ImapSettings;
  backendMode: 'sqlite' | 'firebase';
  backendUrl: string;
  apiSecret: string;
  firebase: {
    serviceAccountPath?: string;
    projectId?: string;
  };
}

export function loadConfig(): WorkerConfig {
  return {
    imap: {
      host: process.env.IMAP_HOST ?? 'imap.gmail.com',
      port: num(process.env.IMAP_PORT, 993),
      secure: bool(process.env.IMAP_SECURE, true),
      user: process.env.IMAP_USER ?? '',
      password: process.env.IMAP_PASSWORD ?? '',
      mailbox: process.env.IMAP_MAILBOX ?? 'INBOX',
      lookbackDays: num(process.env.IMAP_LOOKBACK_DAYS, 30),
      fromFilter: process.env.IMAP_FROM_FILTER || undefined,
    },
    backendMode: (process.env.BACKEND_MODE as 'sqlite' | 'firebase') ?? 'sqlite',
    backendUrl: process.env.BACKEND_URL ?? 'http://localhost:4000',
    apiSecret: process.env.API_SHARED_SECRET ?? '',
    firebase: {
      serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT,
      projectId: process.env.FIREBASE_PROJECT_ID,
    },
  };
}
