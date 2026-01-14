/**
 * Sprint #58.3 — Test invarianti e casi limite (Issue #58)
 * Riferimento: docs/20260114_issue_58_invarianti.md
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';

import engineRoutes from '../src/api/engineRoutes.js';
import {
  enterLocation,
  executeCommand,
  getGameState,
  getGameStateSnapshot,
  initializeOriginalData,
  resetGameState,
  setCurrentLocation,
} from '../src/logic/engine.js';

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

function score() {
  return getGameState().punteggio.totale;
}

describe('Issue #58 — Invarianti e edge cases (Sprint #58.3)', () => {
  beforeAll(() => {
    // global.odessaData viene inizializzato da tests/setup.ts
    initializeOriginalData();
  });

  beforeEach(() => {
    resetGameState(1);
  });

  it('I58.1.C: entering terminal location imposta awaitingRestart=true', async () => {
    const res = await enterLocation(8);
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('TERMINAL');

    const snap = getGameStateSnapshot();
    expect(snap.awaitingRestart).toBe(true);
    expect(snap.currentLocationId).toBe(8);
  });

  it('I58.1.D: API awaitingRestart bypassa parser e tratta input come conferma restart', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    const { server, baseUrl } = started;

    try {
      // Forza stato in attesa riavvio (equivalente a game over già avvenuto)
      await enterLocation(8);

      // Input NON parsabile: deve comunque bypassare parser (status 200, parseResult=null)
      const res1 = await fetch(`${baseUrl}/api/engine/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'ASDFGHJKLQWERTY' }),
      });
      expect(res1.status).toBe(200);
      const body1 = await res1.json();
      expect(body1.ok).toBe(true);
      expect(body1.parseResult).toBeNull();
      expect(body1.command).toBeNull();
      expect(body1.engine).toBeDefined();
      expect(body1.engine.accepted).toBe(false);
      expect(body1.engine.resultType).toBe('ERROR');
      expect(body1.state.awaitingRestart).toBe(true);

      // NO -> termina partita (ENDED) e spegne awaitingRestart
      const res2 = await fetch(`${baseUrl}/api/engine/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'NO' }),
      });
      expect(res2.status).toBe(200);
      const body2 = await res2.json();
      expect(body2.ok).toBe(true);
      expect(body2.parseResult).toBeNull();
      expect(body2.command).toBeNull();
      expect(body2.engine?.resultType).toBe('ENDED');
      expect(body2.state.ended).toBe(true);
      expect(body2.state.awaitingRestart).toBe(false);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('I58.1.E: turnsInDangerZone conta solo turni consuming in danger zone (integrazione pipeline)', () => {
    // Danger zone nota: 51
    setCurrentLocation(51);
    expect(getGameState().turn.turnsInDangerZone).toBe(0);

    // SYSTEM (non-consuming): NON deve incrementare
    executeCommand({
      IsValid: true,
      CommandType: 'SYSTEM',
      CanonicalVerb: 'INVENTARIO',
      VerbConcept: 'INVENTARIO',
      Error: null,
    });
    expect(getGameState().turn.turnsInDangerZone).toBe(0);

    // ACTION (consuming): deve incrementare
    executeCommand({
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'ESAMINARE',
      VerbConcept: 'ESAMINARE',
      Error: null,
    });
    expect(getGameState().turn.turnsInDangerZone).toBe(1);

    // Uscita in safe zone (57): al successivo consuming, deve resettare
    setCurrentLocation(57);
    executeCommand({
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'ESAMINARE',
      VerbConcept: 'ESAMINARE',
      Error: null,
    });
    expect(getGameState().turn.turnsInDangerZone).toBe(0);
  });

  it('Edge: setCurrentLocation con ID non presente non incrementa punteggio', () => {
    const before = score();
    setCurrentLocation(99999);
    expect(score()).toBe(before);
  });
});
