import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';

import engineRoutes from '../src/api/engineRoutes.js';
import parserRoutes from '../src/api/parserRoutes.js';

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

describe('Sprint 4.1.5 - DISABLE_LEGACY_ENDPOINTS', () => {
  let server: Server | undefined;
  let baseUrl = '';

  const prev = {
    DISABLE_LEGACY_ENDPOINTS: process.env.DISABLE_LEGACY_ENDPOINTS,
  };

  beforeEach(async () => {
    process.env.DISABLE_LEGACY_ENDPOINTS = '1';

    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);
    app.use('/api/parser', parserRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterEach(async () => {
    const srv = server;
    server = undefined;
    if (srv) await new Promise<void>((resolve) => srv.close(() => resolve()));

    process.env.DISABLE_LEGACY_ENDPOINTS = prev.DISABLE_LEGACY_ENDPOINTS;
  });

  it('POST /api/engine/set-location -> 410 LEGACY_ENDPOINT_DISABLED', async () => {
    const res = await fetch(`${baseUrl}/api/engine/set-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: 1, consumeTurn: false }),
    });

    expect(res.status).toBe(410);
    expect(res.headers.get('deprecation')).toBe('true');

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('LEGACY_ENDPOINT_DISABLED');
  });

  it('POST /api/parser/parse -> 410 con parseResult IsValid=false', async () => {
    const res = await fetch(`${baseUrl}/api/parser/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'NORD' }),
    });

    expect(res.status).toBe(410);
    expect(res.headers.get('deprecation')).toBe('true');

    const body = await res.json();
    expect(body.IsValid).toBe(false);
    expect(body.Error).toBe('LEGACY_ENDPOINT_DISABLED');
  });
});
