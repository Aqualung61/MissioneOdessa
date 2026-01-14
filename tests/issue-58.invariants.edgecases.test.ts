/**
 * Sprint #58.3 — Test invarianti e casi limite (Issue #58)
 * Riferimento: docs/20260114_issue_58_invarianti.md
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { request as httpRequest } from 'node:http';

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

import { score } from './testUtils/score.js';

import Introduzione from '../src/data-internal/Introduzione.json';
import LessicoSoftware from '../src/data-internal/LessicoSoftware.json';
import Lingue from '../src/data-internal/Lingue.json';
import Luoghi from '../src/data-internal/Luoghi.json';
import LuoghiLogici from '../src/data-internal/LuoghiLogici.json';
import Oggetti from '../src/data-internal/Oggetti.json';
import Piattaforme from '../src/data-internal/Piattaforme.json';
import Software from '../src/data-internal/Software.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';
import VociLessico from '../src/data-internal/VociLessico.json';
import MessaggiSistema from '../src/data-internal/MessaggiSistema.json';
import Interazioni from '../src/data-internal/Interazioni.json';

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

function httpJson(baseUrl: string, path: string, options?: { method?: string; body?: unknown }) {
  const url = new URL(path, baseUrl);
  const method = options?.method ?? 'GET';
  const bodyText = options?.body !== undefined ? JSON.stringify(options.body) : null;

  return new Promise<{ status: number; json: any }>((resolve, reject) => {
    const req = httpRequest(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          ...(bodyText ? { 'Content-Length': Buffer.byteLength(bodyText) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          try {
            const json = data.length ? JSON.parse(data) : null;
            resolve({ status, json });
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    if (bodyText) req.write(bodyText);
    req.end();
  });
}

describe('Issue #58 — Invarianti e edge cases (Sprint #58.3)', () => {
  beforeAll(() => {
    // Allineato al pattern di altri test: rendiamo il file autosufficiente.
    (globalThis as any).odessaData = {
      Introduzione,
      LessicoSoftware,
      Lingue,
      Luoghi,
      LuoghiLogici,
      Oggetti,
      Piattaforme,
      Software,
      TerminiLessico,
      TipiLessico,
      VociLessico,
      MessaggiSistema,
      Interazioni,
    };
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

  it('I58.1.D: API awaitingRestart bypassa il parser e tratta input come conferma restart', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    const { server, baseUrl } = started;

    try {
      // Forza stato in attesa riavvio (equivalente a game over già avvenuto)
      await enterLocation(8);

      // Input NON parsabile: deve comunque bypassare parser (status 200, parseResult=null)
      const res1 = await httpJson(baseUrl, '/api/engine/execute', { method: 'POST', body: { input: 'ASDFGHJKLQWERTY' } });
      expect(res1.status).toBe(200);
      const body1 = res1.json;
      expect(body1.ok).toBe(true);
      expect(body1.parseResult).toBeNull();
      expect(body1.command).toBeNull();
      expect(body1.engine).toBeDefined();
      expect(body1.engine.accepted).toBe(false);
      expect(body1.engine.resultType).toBe('ERROR');
      expect(body1.state.awaitingRestart).toBe(true);

      // NO -> termina partita (ENDED) e spegne awaitingRestart
      const res2 = await httpJson(baseUrl, '/api/engine/execute', { method: 'POST', body: { input: 'NO' } });
      expect(res2.status).toBe(200);
      const body2 = res2.json;
      expect(body2.ok).toBe(true);
      expect(body2.parseResult).toBeNull();
      expect(body2.command).toBeNull();
      expect(body2.engine?.resultType).toBe('ENDED');
      expect(body2.state.ended).toBe(true);
      expect(body2.state.awaitingRestart).toBe(false);
    } finally {
      await new Promise<void>((resolve) => {
        try {
          server.close(() => resolve());
        } catch {
          resolve();
        }
      });
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
