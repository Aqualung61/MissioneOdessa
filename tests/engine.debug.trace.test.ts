import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { request as httpRequest } from 'node:http';

import engineRoutes from '../src/api/engineRoutes.js';
import { initializeOriginalData, resetGameState, executeCommand, getGameState, setCurrentLocation } from '../src/logic/engine.js';
import { getEngineDebugTrace, pushEngineDebugEvent, resetEngineDebugTrace } from '../src/logic/engineDebug.js';

type StartedServer = { server: Server; baseUrl: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, name = 'value'): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${name} is not an object`);
  }
}

async function httpJson(
  url: string,
  options?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<{ status: number; json: unknown }> {
  return await new Promise((resolve, reject) => {
    const u = new URL(url);
    const bodyString = options?.body === undefined ? undefined : JSON.stringify(options.body);

    const req = httpRequest(
      {
        hostname: u.hostname,
        port: u.port,
        path: `${u.pathname}${u.search}`,
        method: options?.method ?? (bodyString ? 'POST' : 'GET'),
        headers: {
          Accept: 'application/json',
          ...(bodyString
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyString).toString(),
              }
            : null),
          ...(options?.headers ?? null),
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json: unknown = data.length ? JSON.parse(data) : null;
            resolve({ status: res.statusCode ?? 0, json });
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    req.on('error', reject);
    if (bodyString) req.write(bodyString);
    req.end();
  });
}

function startServer(app: express.Express): Promise<StartedServer> {
  return new Promise<StartedServer>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'string' ? 0 : (address?.port ?? 0);
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('Sprint #58.2 - Engine debug trace (dev/test)', () => {
  const prev = process.env.ENGINE_DEBUG;

  beforeAll(() => {
    // Stabilizza base dati per resetGameState e scorri test senza dipendenze dall'ordine di esecuzione.
    initializeOriginalData();
  });

  beforeEach(() => {
    process.env.ENGINE_DEBUG = '1';
    resetEngineDebugTrace();
    resetGameState(1);
  });

  afterEach(() => {
    if (typeof prev === 'string') process.env.ENGINE_DEBUG = prev;
    else delete process.env.ENGINE_DEBUG;
    resetEngineDebugTrace();
  });

  it('registra eventi di debug con before/after e delta per comandi di sistema e di azione', () => {
    const before = getGameState().punteggio.totale;

    executeCommand({
      IsValid: true,
      CommandType: 'SYSTEM',
      CanonicalVerb: 'INVENTARIO',
      VerbConcept: 'INVENTARIO',
      Error: null,
    });

    executeCommand({
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'ESAMINARE',
      VerbConcept: 'ESAMINARE',
      CanonicalNoun: 'PAVIMENTO',
      NounConcept: 'PAVIMENTO',
      Error: null,
    });

    const trace = getEngineDebugTrace();
    expect(trace.enabled).toBe(true);
    expect(trace.size).toBeGreaterThanOrEqual(2);

    const commandEvents = trace.events.filter((e) => e.kind === 'EXECUTE_COMMAND');
    expect(commandEvents.length).toBeGreaterThanOrEqual(2);

    for (const ev of commandEvents) {
      expect(ev.before).toBeDefined();
      expect(ev.after).toBeDefined();
      expect(ev.delta).toBeDefined();
      expect(typeof ev.delta.score).toBe('number');
      expect(typeof ev.result?.resultType).toBe('string');
    }

    const after = getGameState().punteggio.totale;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('non registra eventi quando ENGINE_DEBUG=0', () => {
    process.env.ENGINE_DEBUG = '0';
    resetEngineDebugTrace();

    executeCommand({
      IsValid: true,
      CommandType: 'SYSTEM',
      CanonicalVerb: 'INVENTARIO',
      VerbConcept: 'INVENTARIO',
      Error: null,
    });

    const trace = getEngineDebugTrace();
    expect(trace.enabled).toBe(false);
    expect(trace.size).toBe(0);
  });

  it('mantiene la dimensione del ring buffer a MAX_EVENTS', () => {
    resetEngineDebugTrace();
    const maxEvents = getEngineDebugTrace().maxEvents;

    for (let i = 0; i < maxEvents + 5; i++) {
      pushEngineDebugEvent({ kind: 'TEST_EVENT', i });
    }

    const trace = getEngineDebugTrace();
    expect(trace.enabled).toBe(true);
    expect(trace.size).toBe(maxEvents);
    expect(trace.events[0].id).toBe(6);
    expect(trace.events[trace.events.length - 1].id).toBe(maxEvents + 5);
  });

  it('registra SET_CURRENT_LOCATION su cambio location', () => {
    resetEngineDebugTrace();
    setCurrentLocation(2);

    const trace = getEngineDebugTrace();
    const locationEvents = trace.events.filter((e) => e.kind === 'SET_CURRENT_LOCATION');
    expect(locationEvents.length).toBe(1);
    expect(locationEvents[0].toLocationId).toBe(2);
  });

  it('include debug nelle risposte API quando abilitato', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    const { server, baseUrl } = started;
    try {
      const stateRes = await httpJson(`${baseUrl}/api/engine/state`);
      expect(stateRes.status).toBe(200);

      assertRecord(stateRes.json, 'stateBody');
      const stateBody = stateRes.json;
      expect(stateBody.ok).toBe(true);

      assertRecord(stateBody.debug, 'stateBody.debug');
      expect(stateBody.debug.enabled).toBe(true);

      const execRes = await httpJson(`${baseUrl}/api/engine/execute`, {
        method: 'POST',
        body: { input: 'INVENTARIO' },
      });
      expect(execRes.status).toBe(200);

      assertRecord(execRes.json, 'execBody');
      const execBody = execRes.json;
      expect(execBody.ok).toBe(true);

      assertRecord(execBody.debug, 'execBody.debug');
      expect(execBody.debug.enabled).toBe(true);
      expect(execBody.debug.size).toBeGreaterThanOrEqual(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 15_000);
});
