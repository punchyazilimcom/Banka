import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { createServer } from '../src/server.js';

const PORT = 4097;
const DB = '/tmp/gtt-backend-test.sqlite';
const base = `http://localhost:${PORT}`;
const H = { 'content-type': 'application/json', authorization: 'Bearer sek' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let server: Server;
const sseReceived: any[] = [];

const baseTx = {
  id: 'it1', mailId: 'mail1', direction: 'in' as const, amount: 250, currency: 'TRY',
  counterpartyName: 'Test Kisi', counterpartyType: 'person' as const, description: 'dene',
  channel: 'FAST' as const, datetime: '2026-06-02T10:00:00.000Z', raw: '',
};

beforeAll(async () => {
  for (const f of [DB, DB + '-wal', DB + '-shm']) rmSync(f, { force: true });
  server = createServer({ sqlitePath: DB, port: PORT, apiSecret: 'sek' }).server;
  await sleep(300);
  // SSE dinleyici
  (async () => {
    const res = await fetch(`${base}/api/stream`);
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop()!;
      for (const p of parts) {
        if (p.includes('event: transactions')) sseReceived.push(...JSON.parse(p.split('data: ')[1]));
      }
    }
  })();
  await sleep(200);
});

afterAll(() => {
  server?.close();
});

describe('backend HTTP API + SSE', () => {
  it('auth olmadan 401', async () => {
    expect((await fetch(`${base}/api/transactions`)).status).toBe(401);
  });

  const json = async (r: Response): Promise<any> => r.json();

  it('işlem kaydeder (inserted=1)', async () => {
    const r = await fetch(`${base}/api/transactions`, { method: 'POST', headers: H, body: JSON.stringify([baseTx]) });
    expect((await json(r)).inserted).toBe(1);
  });

  it('idempotent: aynı işlem tekrar inserted=0', async () => {
    const r = await fetch(`${base}/api/transactions`, { method: 'POST', headers: H, body: JSON.stringify([baseTx]) });
    expect((await json(r)).inserted).toBe(0);
  });

  it('listeler', async () => {
    const list = await json(await fetch(`${base}/api/transactions`, { headers: H }));
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('it1');
  });

  it('mail-ids döner', async () => {
    const ids = await json(await fetch(`${base}/api/mail-ids`, { headers: H }));
    expect(ids).toContain('mail1');
  });

  it('SSE gerçek zamanlı push aldı', async () => {
    await sleep(300);
    expect(sseReceived.some((t) => t.id === 'it1')).toBe(true);
  });

  it('override işlem tipini günceller + kalıcı kaydeder', async () => {
    await fetch(`${base}/api/overrides`, { method: 'POST', headers: H, body: JSON.stringify({ nameKey: 'TEST KISI', type: 'firm' }) });
    const list = await json(await fetch(`${base}/api/transactions`, { headers: H }));
    expect(list[0].counterpartyType).toBe('firm');
    const ov = await json(await fetch(`${base}/api/overrides`, { headers: H }));
    expect(ov['TEST KISI']?.type).toBe('firm');
  });
});
