import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import type { Transaction, ClassificationOverride } from '@gtt/shared';
import { Store } from './store.js';

export interface ServerConfig {
  sqlitePath: string;
  port: number;
  apiSecret: string;
}

/**
 * Self-host backend HTTP API + SSE gerçek zamanlı akış.
 * Cihazlar /api/stream'i dinler, worker yeni işlem yazınca anında push edilir.
 */
export function createServer(cfg: ServerConfig) {
  const store = new Store(cfg.sqlitePath);
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  // SSE istemcileri
  const clients = new Set<Response>();
  const broadcast = (event: string, data: unknown) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of clients) c.write(payload);
  };

  const auth = (req: Request, res: Response, next: NextFunction) => {
    if (!cfg.apiSecret) return next(); // secret tanımsızsa açık (yalnızca local dev)
    const header = req.headers.authorization ?? '';
    if (header === `Bearer ${cfg.apiSecret}`) return next();
    res.status(401).json({ error: 'unauthorized' });
  };

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Worker: bilinen mailId'ler (idempotency)
  app.get('/api/mail-ids', auth, (_req, res) => {
    res.json(store.knownMailIds());
  });

  // UI: tüm işlemler
  app.get('/api/transactions', auth, (_req, res) => {
    res.json(store.listTransactions());
  });

  // Worker: yeni işlemleri yaz → SSE push
  app.post('/api/transactions', auth, (req, res) => {
    const txs = req.body as Transaction[];
    if (!Array.isArray(txs)) return res.status(400).json({ error: 'array bekleniyor' });
    const inserted = store.upsertTransactions(txs);
    if (inserted.length) broadcast('transactions', inserted);
    res.json({ inserted: inserted.length });
  });

  // Sınıflandırma düzeltmeleri
  app.get('/api/overrides', auth, (_req, res) => {
    res.json(store.getOverrides());
  });
  app.post('/api/overrides', auth, (req, res) => {
    const o = req.body as ClassificationOverride;
    if (!o?.nameKey || !o?.type) return res.status(400).json({ error: 'geçersiz' });
    store.setOverride({ ...o, updatedAt: new Date().toISOString() });
    broadcast('override', o);
    res.json({ ok: true });
  });

  // SSE: gerçek zamanlı akış (onSnapshot eşdeğeri)
  app.get('/api/stream', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders();
    res.write(`event: ready\ndata: {}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
    });
  });

  const server = app.listen(cfg.port, () => {
    console.log(`[backend] SQLite API http://localhost:${cfg.port}`);
  });

  return { app, server, store, broadcast };
}
