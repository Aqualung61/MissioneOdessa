/**
 * Caratterizzazione delle route di servizio (#63, lotto 5 v1.4.2, P0).
 * Specifica: `Claude decompiler/20261020 - TD Lotto 5 Effetti di turno, route e ESLint - v1.0.md`, §5.1 test 4.
 *
 * Fuori produzione: `GET /api/lingue`, `GET /api/parser/stats`, `POST /api/parser/reload`,
 * `GET /api/storia` (lingua 2, id inesistente, valori predefiniti), `GET /api/introduzione`.
 * Si verificano stato HTTP, corpo e ORDINE delle chiavi. Gli attesi sono stati ricavati
 * eseguendo il baseline (`e088e7c`); per i testi lunghi (Storia, Introduzione) il valore atteso
 * è letto da `src/data-internal/*.json`, mentre l'ordine delle chiavi è scritto qui.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';

import { initOdessa } from '../src/initOdessa.js';
import { ensureVocabulary } from '../src/logic/parser.js';
import apiRoutes from '../src/api/routes.js';
import linguaRoutes from '../src/api/linguaRoutes.js';
import parserRoutes from '../src/api/parserRoutes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import Storia from '../src/data-internal/Storia.json';
import Introduzione from '../src/data-internal/Introduzione.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

describe('Route di servizio (lotto 5, P0)', () => {
  let server: Server;
  let base = '';
  const prevNodeEnv = process.env.NODE_ENV;

  async function call(method: string, path: string): Promise<{ status: number; body: Json }> {
    const res = await fetch(base + path, { method });
    return { status: res.status, body: await res.json() };
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const quiet = console.log;
    console.log = () => undefined;
    try {
      await initOdessa();
      await ensureVocabulary();
    } finally {
      console.log = quiet;
    }
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/lingue', linguaRoutes);
    app.use('/api/parser', parserRoutes);
    app.use('/api', apiRoutes);
    app.use(errorHandler);
    server = await new Promise((resolveServer) => {
      const s = app.listen(0, '127.0.0.1', () => resolveServer(s));
    });
    const address = server.address();
    base = `http://127.0.0.1:${typeof address === 'string' ? 0 : address?.port ?? 0}`;
  });

  afterAll(async () => {
    process.env.NODE_ENV = prevNodeEnv;
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  });

  it('GET /api/lingue', async () => {
    const r = await call('GET', '/api/lingue');
    expect(r.status).toBe(200);
    expect(r.body).toEqual([
      { ID: 1, IDLingua: 'IT', Descrizione: 'Italiano' },
      { ID: 2, IDLingua: 'EN', Descrizione: 'English' },
    ]);
    expect(Object.keys(r.body[0])).toEqual(['ID', 'IDLingua', 'Descrizione']);
  });

  it('GET /api/parser/stats', async () => {
    const r = await call('GET', '/api/parser/stats');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      byType: [
        { Tipo: 'VERBO_AZIONE', Termini: 24, Voci: 100 },
        { Tipo: 'NAVIGAZIONE', Termini: 6, Voci: 29 },
        { Tipo: 'SISTEMA', Termini: 6, Voci: 19 },
        { Tipo: 'NOUN', Termini: 47, Voci: 170 },
        { Tipo: 'STOPWORD', Termini: 3, Voci: 53 },
      ],
    });
    expect(Object.keys(r.body)).toEqual(['byType']);
    expect(Object.keys(r.body.byType[0])).toEqual(['Tipo', 'Termini', 'Voci']);
  });

  it('POST /api/parser/reload', async () => {
    const r = await call('POST', '/api/parser/reload');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
  });

  const STORIA_KEYS = ['testo1', 'testo2', 'labelLinks', 'labelDocumenti', 'autoreLine', 'genereLine', 'piattaformaLine'];

  it('GET /api/storia?id=1&lingua=2', async () => {
    const row = (Storia as Json[]).find((s) => s.ID === 1 && s.IDLingua === 2);
    const r = await call('GET', '/api/storia?id=1&lingua=2');
    expect(r.status).toBe(200);
    expect(Object.keys(r.body)).toEqual(STORIA_KEYS);
    expect(r.body).toEqual({
      testo1: row.Testo1,
      testo2: row.Testo2,
      labelLinks: row.LabelLinks,
      labelDocumenti: row.LabelDocumenti,
      autoreLine: row.AutoreLine,
      genereLine: row.GenereLine,
      piattaformaLine: row.PiattaformaLine,
    });
    expect(row.Testo1.length).toBeGreaterThan(0);
  });

  it('GET /api/storia?id=999 (riga inesistente: tutte le chiavi con stringa vuota)', async () => {
    const r = await call('GET', '/api/storia?id=999');
    expect(r.status).toBe(200);
    expect(Object.keys(r.body)).toEqual(STORIA_KEYS);
    expect(r.body).toEqual({ testo1: '', testo2: '', labelLinks: '', labelDocumenti: '', autoreLine: '', genereLine: '', piattaformaLine: '' });
  });

  it('GET /api/storia?id=1&lingua=999 (lingua inesistente)', async () => {
    const r = await call('GET', '/api/storia?id=1&lingua=999');
    expect(r.status).toBe(200);
    expect(Object.keys(r.body)).toEqual(STORIA_KEYS);
    expect(Object.values(r.body)).toEqual(['', '', '', '', '', '', '']);
  });

  it('GET /api/storia senza parametri (id=1, lingua=1)', async () => {
    const row = (Storia as Json[]).find((s) => s.ID === 1 && s.IDLingua === 1);
    const r = await call('GET', '/api/storia');
    expect(r.status).toBe(200);
    expect(Object.keys(r.body)).toEqual(STORIA_KEYS);
    expect(r.body.testo1).toBe(row.Testo1);
    expect(r.body.piattaformaLine).toBe(row.PiattaformaLine);
  });

  it('GET /api/introduzione?lingua=2', async () => {
    const row = (Introduzione as Json[]).find((s) => s.ID === 1 && s.IDLingua === 2);
    const r = await call('GET', '/api/introduzione?lingua=2');
    expect(r.status).toBe(200);
    expect(Object.keys(r.body)).toEqual(['testo']);
    expect(r.body).toEqual({ testo: row.Testo });
    expect(row.Testo.length).toBeGreaterThan(0);
  });

  it('GET /api/introduzione?id=999 (riga inesistente)', async () => {
    const r = await call('GET', '/api/introduzione?id=999');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ testo: '' });
  });
});
