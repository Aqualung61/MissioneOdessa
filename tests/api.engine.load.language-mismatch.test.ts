import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import type { Server } from 'http';
import engineRoutes from '../src/api/engineRoutes.js';

type StartedServer = { server: Server; baseUrl: string };

type OdessaDataGlobal = {
  Luoghi?: unknown;
};

function getOdessaDataGlobal(): OdessaDataGlobal {
  return (globalThis as unknown as { odessaData?: OdessaDataGlobal }).odessaData ?? {};
}

function startServer(app: express.Express): Promise<StartedServer> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'string' ? 0 : address?.port;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('POST /api/engine/load-client-state (language mismatch)', () => {
  let server: Server | null = null;
  let baseUrl: string;

  beforeEach(() => {
    server = null;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      if (!server) return resolve();
      server.close(() => resolve());
    });
  });

  it('ritorna 409 e non applica lo stato quando la lingua del save è diversa dalla lingua corrente', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    // Metti la sessione in lingua IT (1)
    const resetRes = await fetch(`${baseUrl}/api/engine/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idLingua: 1 }),
    });
    expect(resetRes.status).toBe(200);

    const luoghiRef = getOdessaDataGlobal().Luoghi;
    const luoghiLen = Array.isArray(luoghiRef) ? luoghiRef.length : null;

    // Prova a caricare un save in lingua EN (2)
    const res = await fetch(`${baseUrl}/api/engine/load-client-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameState: { currentLingua: 2 },
        odessaData: { Luoghi: [] },
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('LANGUAGE_MISMATCH');
    expect(body.saveLanguage).toBe(2);
    expect(body.sessionLanguage).toBe(1);

    // Verifica che lo stato non sia cambiato
    const stateRes = await fetch(`${baseUrl}/api/engine/state`);
    expect(stateRes.status).toBe(200);
    const stateBody = await stateRes.json();
    expect(stateBody.ok).toBe(true);
    expect(stateBody.state.currentLingua).toBe(1);

    // Verifica che i Luoghi globali non siano stati sostituiti
    const luoghiAfter = getOdessaDataGlobal().Luoghi;
    expect(luoghiAfter).toBe(luoghiRef);
    if (luoghiLen !== null) {
      expect(luoghiAfter.length).toBe(luoghiLen);
    }
  });
});
