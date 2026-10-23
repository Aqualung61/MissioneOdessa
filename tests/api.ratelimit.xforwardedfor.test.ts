/**
 * Limitatore di frequenza dietro proxy: chiave del client con X-Forwarded-For (#147).
 * Specifica: docs/20261023 - TD Test del limitatore di frequenza v1.4.3 - v1.0.md (casi C-1…C-6).
 *
 * Configurazione di produzione simulata: limitatore attivo (RATE_LIMIT_DISABLED non impostata),
 * `trust proxy` = 1 (come server.js con TRUST_PROXY=1), limitatore `heavyLimiter` del progetto
 * con i suoi valori reali. Soglia letta dall'intestazione `RateLimit-Limit` della risposta;
 * la sottorete IPv6 è quella predefinita di express-rate-limit (/56, il progetto non la imposta).
 * Nessuna attesa della finestra: ogni caso usa indirizzi propri.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';

type Limiter = express.RequestHandler;

let server: Server;
let baseUrl: string;
let limit = 0;

const prevDisabled = process.env.RATE_LIMIT_DISABLED;

async function hit(forwardedFor: string): Promise<number> {
  const res = await fetch(`${baseUrl}/heavy`, { headers: { 'X-Forwarded-For': forwardedFor } });
  const header = res.headers.get('ratelimit-limit');
  if (header && !limit) limit = Number(header);
  await res.arrayBuffer();
  return res.status;
}

/** Invia `count` richieste in sequenza, alternando gli indirizzi dati; restituisce gli stati. */
async function burst(count: number, forwardedFor: (i: number) => string): Promise<number[]> {
  const statuses: number[] = [];
  for (let i = 0; i < count; i++) statuses.push(await hit(forwardedFor(i)));
  return statuses;
}

describe('Limitatore con X-Forwarded-For e trust proxy = 1 (#147)', () => {
  beforeAll(async () => {
    delete process.env.RATE_LIMIT_DISABLED;
    // Import dinamico: il limitatore legge RATE_LIMIT_DISABLED al caricamento del modulo.
    const mod = (await import('../src/middleware/rateLimiter.js')) as { heavyLimiter: Limiter };

    const app = express();
    app.set('trust proxy', 1);
    app.use('/heavy', mod.heavyLimiter);
    app.get('/heavy', (_req, res) => res.json({ ok: true }));

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Ricava la soglia effettiva dalla prima risposta (indirizzo dedicato, non usato dai casi).
    await hit('192.0.2.250');
    expect(limit).toBeGreaterThan(0);
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (prevDisabled === undefined) delete process.env.RATE_LIMIT_DISABLED;
    else process.env.RATE_LIMIT_DISABLED = prevDisabled;
  });

  it('C-1: stesso IPv4 oltre la soglia -> la richiesta soglia+1 riceve 429, le precedenti no', async () => {
    const statuses = await burst(limit + 1, () => '192.0.2.10');
    expect(statuses.slice(0, limit).every((s) => s === 200)).toBe(true);
    expect(statuses[limit]).toBe(429);
  });

  it('C-2: IPv4 diverso mentre il primo e bloccato -> non limitato', async () => {
    const blocked = await burst(limit + 1, () => '192.0.2.20');
    expect(blocked[limit]).toBe(429);
    expect(await hit('192.0.2.21')).toBe(200);
  });

  it('C-3: X-Forwarded-For a piu voci con voci false a sinistra e stessa ultima voce -> contatore condiviso', async () => {
    const statuses = await burst(limit + 1, (i) => `198.51.100.${i + 1}, 192.0.2.30`);
    expect(statuses.slice(0, limit).every((s) => s === 200)).toBe(true);
    expect(statuses[limit]).toBe(429);
  });

  it('C-4: due IPv6 che differiscono solo nei bit bassi, stessa sottorete -> contatore condiviso', async () => {
    const a = '2001:db8:1:1::1';
    const b = '2001:db8:1:1:ffff:ffff:ffff:ffff';
    const statuses = await burst(limit + 1, (i) => (i % 2 === 0 ? a : b));
    expect(statuses.slice(0, limit).every((s) => s === 200)).toBe(true);
    expect(statuses[limit]).toBe(429);
  });

  it('C-5: due IPv6 in sottoreti diverse -> contatori indipendenti', async () => {
    const blocked = await burst(limit + 1, () => '2001:db8:aaaa::1');
    expect(blocked[limit]).toBe(429);
    expect(await hit('2001:db8:bbbb::1')).toBe(200);
  });

  it('C-6: IPv4-mapped IPv6 (forma puntata ed esadecimale) e IPv4 condividono il contatore, in entrambe le direzioni', async () => {
    // Le due notazioni devono corrispondere allo stesso IPv4.
    const hexToIpv4 = (hex: string) => {
      const [hi, lo] = hex.split(':').map((g) => parseInt(g, 16));
      return [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
    };
    expect(hexToIpv4('c000:23c')).toBe('192.0.2.60');
    expect(hexToIpv4('c000:243')).toBe('192.0.2.67');

    // IPv4 bloccato -> mapped puntato e mapped esadecimale limitati
    const a = await burst(limit + 1, () => '192.0.2.60');
    expect(a[limit]).toBe(429);
    expect(await hit('::ffff:192.0.2.60')).toBe(429);
    expect(await hit('::ffff:c000:23c')).toBe(429);

    // mapped puntato bloccato -> IPv4 limitato
    const b = await burst(limit + 1, () => '::ffff:192.0.2.61');
    expect(b[limit]).toBe(429);
    expect(await hit('192.0.2.61')).toBe(429);

    // mapped esadecimale bloccato -> IPv4 limitato
    const c = await burst(limit + 1, () => '::ffff:c000:243');
    expect(c[limit]).toBe(429);
    expect(await hit('192.0.2.67')).toBe(429);

    // Controllo: un IPv4 diverso non e limitato
    expect(await hit('192.0.2.68')).toBe(200);
  });
});
