import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';

import engineRoutes from '../src/api/engineRoutes.js';
import { initializeOriginalData, resetGameState, getGameState } from '../src/logic/engine.js';
import { getSystemMessage } from '../src/logic/systemMessages.js';

type LuogoRow = {
  ID: number;
  IDLingua?: number;
  ID_Lingua?: number;
  Nord?: number;
  Est?: number;
  Sud?: number;
  Ovest?: number;
  Su?: number;
  Giu?: number;
};

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

describe('M0 contract: POST /api/engine/execute', () => {
  let server: Server | undefined;
  let baseUrl = '';

  beforeAll(() => {
    // Stabilizza base dati per resetGameState (usa global.odessaData da tests/setup.ts)
    initializeOriginalData();
  });

  beforeEach(() => {
    resetGameState();
  });

  afterEach(async () => {
    const srv = server;
    server = undefined;
    if (!srv) return;
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  });

  it('success: ritorna ok=true, engine normalizzato e parseResult valido', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'INVENTARIO' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.engine).toBeDefined();
    expect(typeof body.engine.accepted).toBe('boolean');
    expect(typeof body.engine.resultType).toBe('string');
    expect(typeof body.engine.message).toBe('string');
    expect(Array.isArray(body.engine.turnMessages)).toBe(true);
    expect(typeof body.engine.gameOver).toBe('boolean');

    expect(body.parseResult).toBeDefined();
    expect(body.parseResult.IsValid).toBe(true);

    // Sprint 4.1.3: response arricchita
    expect(body.state).toBeDefined();
    expect(typeof body.state.currentLocationId).toBe('number');
    expect(body.ui).toBeDefined();
    expect(typeof body.ui.location.id).toBe('number');
    expect(typeof body.ui.location.name).toBe('string');
    expect(body.stats).toBeDefined();
    expect(typeof body.stats.visitedPlaces).toBe('number');
    expect(typeof body.stats.score).toBe('number');
  });

  it('parse error: ritorna 400 con ok=false, userMessage e parseResult', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'ASDFGHJKLQWERTY' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(body.parseResult).toBeDefined();
    expect(body.parseResult.IsValid).toBe(false);
    expect(typeof body.userMessage).toBe('string');

    // Contract: in parse-error non deve esserci engine/command
    expect(body.engine).toBe(null);
    expect(body.command).toBe(null);

    // Sprint 4.1.3: anche su parse error torna snapshot + ui + stats
    expect(body.state).toBeDefined();
    expect(typeof body.state.currentLocationId).toBe('number');
    expect(body.ui).toBeDefined();
    expect(typeof body.ui.location.id).toBe('number');
    expect(body.stats).toBeDefined();
    expect(typeof body.stats.visitedPlaces).toBe('number');
  });

  it('parse error: verbo sconosciuto -> 400 error=COMMAND_UNKNOWN e userMessage localizzato', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'ASDFGHJKLQWERTY' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(body.error).toBe('COMMAND_UNKNOWN');
    expect(body.parseResult?.IsValid).toBe(false);
    expect(typeof body.parseResult?.UnknownToken).toBe('string');
    expect(body.userMessage).toBe(getSystemMessage('parse.error.commandUnknown', 1));
  });

  it('parse error: NOUN sconosciuto -> 400 error=SYNTAX_NOUN_UNKNOWN + placeholder risolto', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'PRENDI ZZZ' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(body.error).toBe('SYNTAX_NOUN_UNKNOWN');
    expect(body.parseResult?.IsValid).toBe(false);
    expect(body.parseResult?.UnknownNounToken).toBe('ZZZ');
    expect(body.userMessage).toBe(getSystemMessage('parse.error.syntaxNounUnknown', 1, ['zzz']));
  });

  it('parse error: struttura non parsabile -> 400 error=SYNTAX_INVALID_STRUCTURE e userMessage localizzato', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'N LAMPADA' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(body.error).toBe('SYNTAX_INVALID_STRUCTURE');
    expect(body.parseResult?.IsValid).toBe(false);
    expect(body.userMessage).toBe(getSystemMessage('parse.error.syntaxInvalidStructure', 1));
  });

  it('awaitingRestart: bypass parser e ritorna parseResult=null, command=null, engine normalizzato', async () => {
    // Imposta stato in attesa riavvio prima della request
    const state = getGameState();
    state.awaitingRestart = true;

    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'SI' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.parseResult).toBe(null);
    expect(body.command).toBe(null);

    expect(body.engine).toBeDefined();
    expect(typeof body.engine.accepted).toBe('boolean');
    expect(typeof body.engine.resultType).toBe('string');
    expect(typeof body.engine.message).toBe('string');
    expect(Array.isArray(body.engine.turnMessages)).toBe(true);

    // Sprint 4.1.3: response arricchita
    expect(body.state).toBeDefined();
    expect(typeof body.state.currentLocationId).toBe('number');
    expect(body.ui).toBeDefined();
    expect(typeof body.ui.location.id).toBe('number');
    expect(body.stats).toBeDefined();
    expect(typeof body.stats.score).toBe('number');
  });

  it('FINE: conferma NO server-side (bypass parser) e continua il gioco', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res1 = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'FINE' }),
    });
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.ok).toBe(true);
    expect(body1.engine?.resultType).toBe('CONFIRM_END');
    expect(body1.state?.awaitingEndConfirm).toBe(true);

    const res2 = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'N' }),
    });
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.ok).toBe(true);
    expect(body2.parseResult).toBe(null);
    expect(body2.command).toBe(null);
    expect(body2.engine?.resultType).toBe('OK');
    expect(body2.engine?.message).toBe('Gioco continuato.');
    expect(body2.state?.awaitingEndConfirm).toBe(false);
    expect(body2.state?.awaitingRestart).toBe(false);
    expect(body2.state?.ended).toBe(false);
  });

  it('FINE: conferma SI -> GAME_OVER + awaitingRestart, poi SI -> hard reset', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const r1 = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'FINE' }),
    });
    expect(r1.status).toBe(200);
    const b1 = await r1.json();
    expect(b1.ok).toBe(true);
    expect(b1.state?.awaitingEndConfirm).toBe(true);

    const r2 = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'SI' }),
    });
    expect(r2.status).toBe(200);
    const b2 = await r2.json();
    expect(b2.ok).toBe(true);
    expect(b2.parseResult).toBe(null);
    expect(b2.command).toBe(null);
    expect(b2.engine?.resultType).toBe('GAME_OVER');
    expect(b2.engine?.gameOver).toBe(true);
    expect(b2.engine?.message).toBe('Hai deciso di terminare la partita.');
    expect(b2.state?.awaitingEndConfirm).toBe(false);
    expect(b2.state?.awaitingRestart).toBe(true);

    const r3 = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'SI' }),
    });
    expect(r3.status).toBe(200);
    const b3 = await r3.json();
    expect(b3.ok).toBe(true);
    expect(b3.parseResult).toBe(null);
    expect(b3.command).toBe(null);
    expect(b3.engine?.resultType).toBe('OK');
    expect(b3.state?.awaitingRestart).toBe(false);
    expect(b3.state?.currentLocationId).toBe(1);
    expect(b3.stats?.visitedPlaces).toBe(1);
    expect(b3.stats?.score).toBe(1);
  });

  it('navigation: aggiorna contatori e li ritorna in state/stats', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    // Scegli una direzione valida a partire da luogo 1 dai dati statici.
    const luoghiData = (global.odessaData as { Luoghi?: unknown[] } | undefined)?.Luoghi;
    const luogo1 = (luoghiData || []).find((l): l is LuogoRow => {
      if (!l || typeof l !== 'object') return false;
      const row = l as Partial<LuogoRow>;
      return row.ID === 1 && (row.IDLingua ?? row.ID_Lingua) === 1;
    });
    expect(luogo1).toBeDefined();
    if (!luogo1) throw new Error('Luogo 1 (IT) non trovato nei dati statici');

    const directions = ['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu'] as const;
    const tokenByDir: Record<(typeof directions)[number], string> = {
      Nord: 'NORD',
      Est: 'EST',
      Sud: 'SUD',
      Ovest: 'OVEST',
      Su: 'SU',
      Giu: 'GIU',
    };

    const chosen = directions.find((d) => typeof luogo1[d] === 'number' && luogo1[d] > 0);
    expect(chosen).toBeDefined();
    if (!chosen) throw new Error('Nessuna direzione valida trovata a partire da luogo 1');
    const expectedNextId = luogo1[chosen];
    if (typeof expectedNextId !== 'number' || expectedNextId <= 0) {
      throw new Error(`Direzione valida '${chosen}' ma nextId non valido: ${String(expectedNextId)}`);
    }

    const res = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: tokenByDir[chosen] }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.state).toBeDefined();
    expect(body.ui).toBeDefined();
    expect(body.stats).toBeDefined();

    // Luogo corrente aggiornato
    expect(body.state.currentLocationId).toBe(expectedNextId);
    expect(body.ui.location.id).toBe(expectedNextId);

    // visitedPlaces e punteggio avanzano (iniziale: 1)
    expect(body.stats.visitedPlaces).toBeGreaterThanOrEqual(2);
    expect(body.stats.score).toBeGreaterThanOrEqual(2);

    // Turn counters avanzano su NAVIGATION (consuma turno)
    expect(body.state.turn).toBeDefined();
    expect(body.state.turn.globalTurnNumber).toBeGreaterThanOrEqual(1);
    expect(body.state.turn.totalTurnsConsumed).toBeGreaterThanOrEqual(1);
  });
});
