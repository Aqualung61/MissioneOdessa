/**
 * Endpoint legacy rimossi (#124).
 * Specifica: `docs/20261019 - TD Lotto 1 Pulizia ed endpoint legacy - v1.0.md`, §3.1-§3.2, §4.
 * Sostituisce `tests/api.legacy.endpoints.disabled.test.ts` (meccanismo `DISABLE_LEGACY_ENDPOINTS`
 * rimosso): `POST /api/engine/set-location` e `POST /api/parser/parse` ora rispondono come
 * qualunque route inesistente; `GET /api/parser/stats` e `POST /api/parser/reload` restano,
 * disponibili solo fuori produzione.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';

import engineRoutes from '../src/api/engineRoutes.js';
import parserRoutes from '../src/api/parserRoutes.js';
import { ensureVocabulary } from '../src/logic/parser.js';
import { createSessionState, fetchWithSession } from './testUtils/sessionFetch';

type StartedServer = { server: Server; baseUrl: string };

function startServer(app: express.Express): Promise<StartedServer> {
  return new Promise<StartedServer>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'string' ? 0 : (address?.port ?? 0);
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('Endpoint legacy rimossi (#124)', () => {
  let server: Server;
  let baseUrl = '';
  const prevNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    await ensureVocabulary();

    // App di test: nessun catch-all, così una route inesistente riceve il 404
    // predefinito di Express, non la pagina web/404.html del server reale.
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);
    app.use('/api/parser', parserRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  afterEach(() => {
    if (typeof prevNodeEnv === 'string') process.env.NODE_ENV = prevNodeEnv;
    else delete process.env.NODE_ENV;
  });

  it('POST /api/engine/set-location -> 404 (endpoint rimosso)', async () => {
    const session = createSessionState();
    const res = await fetchWithSession(`${baseUrl}/api/engine/set-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: 2 }),
    }, session);
    expect(res.status).toBe(404);
  });

  it('POST /api/parser/parse -> 404 (endpoint rimosso)', async () => {
    const res = await fetch(`${baseUrl}/api/parser/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'guarda' }),
    });
    expect(res.status).toBe(404);
  });

  it('NODE_ENV=production: GET /api/parser/stats e POST /api/parser/reload -> 404', async () => {
    process.env.NODE_ENV = 'production';

    const statsRes = await fetch(`${baseUrl}/api/parser/stats`);
    expect(statsRes.status).toBe(404);

    const reloadRes = await fetch(`${baseUrl}/api/parser/reload`, { method: 'POST' });
    expect(reloadRes.status).toBe(404);
  });

  it('NODE_ENV diverso da production: GET /api/parser/stats -> 200 con byType, POST /api/parser/reload -> 200 { ok: true }', async () => {
    process.env.NODE_ENV = 'test';

    const statsRes = await fetch(`${baseUrl}/api/parser/stats`);
    expect(statsRes.status).toBe(200);
    const statsBody = await statsRes.json();
    expect(Array.isArray(statsBody.byType)).toBe(true);
    expect(statsBody.byType.length).toBeGreaterThan(0);

    const reloadRes = await fetch(`${baseUrl}/api/parser/reload`, { method: 'POST' });
    expect(reloadRes.status).toBe(200);
    const reloadBody = await reloadRes.json();
    expect(reloadBody).toEqual({ ok: true });
  });
});
