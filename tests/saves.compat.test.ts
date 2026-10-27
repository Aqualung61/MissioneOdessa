/**
 * Compatibilità dei salvataggi v1.4.1 (#63).
 * Specifica: `docs/20261019 - TD Lotto 0 Rete di caratterizzazione - v1.0.md`, §3.4.
 *
 * Due verifiche sul fixture protetto `tests/fixtures/trace/save_v141_full_it_step91.json`
 * (salvataggio v1.4.1 al passo 91 del percorso completo IT, formato di
 * `POST /api/engine/save-client-state`):
 * 1. il formato di salvataggio prodotto oggi (`luoghi: []`, dopo gli stessi 91 comandi)
 *    coincide con quello registrato, esclusi `timestamp`/`version` (anche dentro `gameState`);
 * 2. caricamento via `POST /api/engine/load-client-state` e `/execute`: i passi 92-147
 *    di `full_it` completano la vittoria con punteggio 138 e 147 turni.
 *
 * Il caricamento del salvataggio v1.4.0 è già coperto da `tests/walkthrough.test.ts`
 * e dallo scenario `S-ripresa-v140` di `tests/trace.engine.test.ts`.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import type { Server } from 'node:http';

import { initOdessa } from '../src/initOdessa.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { createEngine } from '../src/logic/engine.js';
import engineRoutes from '../src/api/engineRoutes.js';
import { createSessionState, fetchWithSession, type SessionState } from './testUtils/sessionFetch';

type Engine = ReturnType<typeof createEngine>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const root = resolve(__dirname, '..');
const FIXTURE_PATH = resolve(root, 'tests', 'fixtures', 'trace', 'save_v141_full_it_step91.json');
const WALKTHROUGH_PATH = resolve(root, 'tests', 'fixtures', 'walkthrough', 'full_it.json');

interface Step {
  step: number;
  command: string;
}

interface Walkthrough {
  steps: Step[];
  expected: { victory: boolean; ended: boolean; finalTurns: number; score: number };
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function newEngine(lingua: number): Engine {
  const engine = createEngine();
  engine.initializeOriginalData();
  engine.resetGameState(lingua);
  return engine;
}

// Rimuove timestamp/version, anche dentro gameState (come nel generatore di riferimento).
function stripVolatile(body: Json): Json {
  const b = JSON.parse(JSON.stringify(body));
  delete b.timestamp;
  delete b.version;
  if (b.gameState) {
    delete b.gameState.timestamp;
    delete b.gameState.version;
  }
  return b;
}

async function runCommands(engine: Engine, commands: string[]): Promise<void> {
  for (const c of commands) {
    const parsed = await parseCommand(null, c, engine.getGameState());
    engine.executeCommand(parsed);
  }
}

describe('Compatibilità dei salvataggi v1.4.1 (#63)', () => {
  const save = loadJson<{ gameState: Json }>(FIXTURE_PATH);
  const walkthrough = loadJson<Walkthrough>(WALKTHROUGH_PATH);
  const commandsUpTo91 = walkthrough.steps.filter((s) => s.step <= 91).map((s) => s.command);
  const commandsAfter91 = walkthrough.steps.filter((s) => s.step > 91).map((s) => s.command);

  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('il formato di salvataggio prodotto oggi coincide con quello registrato (esclusi timestamp/version)', async () => {
    const engine = newEngine(1);
    await runCommands(engine, commandsUpTo91);

    const gameState = engine.getGameStateSnapshot();
    const produced = {
      gameState,
      odessaData: { Luoghi: [], Oggetti: gameState.Oggetti },
      timestamp: new Date().toISOString(),
      version: '1.4.2-test',
    };

    expect(stripVolatile(produced)).toEqual(stripVolatile(save));
  });

  it(
    'caricamento via HTTP (load-client-state): i passi 92-147 via /execute completano la vittoria con punteggio 138 e 147 turni',
    async () => {
      const app = express();
      app.use(express.json({ limit: '1mb' }));
      app.use('/api/engine', engineRoutes);

      const server: Server = await new Promise((resolveServer) => {
        const s = app.listen(0, '127.0.0.1', () => resolveServer(s));
      });
      const address = server.address();
      const port = typeof address === 'string' ? 0 : address?.port ?? 0;
      const base = `http://127.0.0.1:${port}`;

      try {
        const session: SessionState = createSessionState();
        await fetchWithSession(
          `${base}/api/engine/reset`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idLingua: 1 }) },
          session
        );

        const loadRes = await fetchWithSession(
          `${base}/api/engine/load-client-state`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(save) },
          session
        );
        expect(loadRes.status).toBe(200);

        let lastBody: Json = null;
        for (const c of commandsAfter91) {
          const res = await fetchWithSession(
            `${base}/api/engine/execute`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: c }) },
            session
          );
          lastBody = await res.json();
        }

        const state = lastBody.state ?? lastBody.gameState;
        expect(state.victory).toBe(walkthrough.expected.victory);
        expect(state.ended).toBe(walkthrough.expected.ended);
        expect(state.turn.totalTurnsConsumed).toBe(walkthrough.expected.finalTurns);
        expect(state.punteggio.totale).toBe(walkthrough.expected.score);
      } finally {
        await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
      }
    },
    60000
  );
});
