import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';

import engineRoutes from '../src/api/engineRoutes.js';
import { initializeOriginalData, resetGameState, executeCommand, getGameState, setCurrentLocation } from '../src/logic/engine.js';
import { getEngineDebugTrace, pushEngineDebugEvent, resetEngineDebugTrace } from '../src/logic/engineDebug.js';

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
      const stateRes = await fetch(`${baseUrl}/api/engine/state`);
      expect(stateRes.status).toBe(200);
      const stateBody = await stateRes.json();
      expect(stateBody.ok).toBe(true);
      expect(stateBody.debug?.enabled).toBe(true);

      const execRes = await fetch(`${baseUrl}/api/engine/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'INVENTARIO' }),
      });

      expect(execRes.status).toBe(200);
      const execBody = await execRes.json();
      expect(execBody.ok).toBe(true);
      expect(execBody.debug?.enabled).toBe(true);
      expect(execBody.debug?.size).toBeGreaterThanOrEqual(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
