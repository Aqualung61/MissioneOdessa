import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';

import engineRoutes from '../src/api/engineRoutes.js';
import { ensureVocabulary } from '../src/logic/parser.js';
import { createSessionState, fetchWithSession } from './testUtils/sessionFetch';

type DirectionKey = 'Nord' | 'Est' | 'Sud' | 'Ovest' | 'Su' | 'Giu';

type Luogo = {
  ID: number;
  IDLingua: number;
  Terminale?: number;
  Nord?: number;
  Est?: number;
  Sud?: number;
  Ovest?: number;
  Su?: number;
  Giu?: number;
};

type OdessaData = {
  [key: string]: unknown;
  Luoghi?: Luogo[];
};

function getOdessaData(): OdessaData {
  return (globalThis.odessaData ?? {}) as OdessaData;
}

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

function getLuoghiLingua1(): Luogo[] {
  return (getOdessaData().Luoghi ?? []).filter((l) => l.IDLingua === 1);
}

function getDirsFromLuogo(luogo: Luogo): Partial<Record<DirectionKey, number>> {
  return {
    Nord: luogo.Nord,
    Est: luogo.Est,
    Sud: luogo.Sud,
    Ovest: luogo.Ovest,
    Su: luogo.Su,
    Giu: luogo.Giu,
  };
}

function keyToVerb(key: DirectionKey): string {
  switch (key) {
    case 'Nord':
      return 'NORD';
    case 'Est':
      return 'EST';
    case 'Sud':
      return 'SUD';
    case 'Ovest':
      return 'OVEST';
    case 'Su':
      return 'SU';
    case 'Giu':
      return 'GIU';
  }
}

function findAnyValidMove(): { fromId: number; key: DirectionKey; toId: number } {
  const luoghi = getLuoghiLingua1();
  const keys: DirectionKey[] = ['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu'];

  for (const luogo of luoghi) {
    const fromId = luogo.ID;
    const dirs = getDirsFromLuogo(luogo);
    for (const key of keys) {
      const toId = dirs?.[key];
      if (typeof toId === 'number' && toId >= 1) {
        return { fromId, key, toId };
      }
    }
  }

  throw new Error('Nessuna direzione valida trovata nel dataset');
}

function findAnyBlockedMove(): { fromId: number; key: DirectionKey } {
  const luoghi = getLuoghiLingua1();
  const keys: DirectionKey[] = ['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu'];

  for (const luogo of luoghi) {
    const fromId = luogo.ID;
    const dirs = getDirsFromLuogo(luogo);
    for (const key of keys) {
      const toId = dirs?.[key];
      if (toId === 0) {
        return { fromId, key };
      }
    }
  }

  throw new Error('Nessuna direzione bloccata (0) trovata nel dataset');
}

function findAnyTerminalMove(): { fromId: number; key: DirectionKey; terminalId: number } {
  const luoghi = getLuoghiLingua1();
  const terminalIds = new Set(luoghi.filter((l) => l.Terminale === -1).map((l) => l.ID));
  const keys: DirectionKey[] = ['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu'];

  for (const luogo of luoghi) {
    const fromId = luogo.ID;
    if (fromId === 1) continue;
    if (fromId === 59) continue;

    const dirs = getDirsFromLuogo(luogo);
    for (const key of keys) {
      const toId = dirs?.[key];
      if (typeof toId === 'number' && terminalIds.has(toId)) {
        return { fromId, key, terminalId: toId };
      }
    }
  }

  throw new Error('Nessuna direzione verso luogo terminale trovata nel dataset');
}

describe('Sprint 4.1.5 - hardening navigation via HTTP (POST /api/engine/execute)', () => {
  let server: Server | undefined;
  let baseUrl = '';

  beforeAll(async () => {
    await ensureVocabulary();
  });

  afterEach(async () => {
    const srv = server;
    server = undefined;
    if (!srv) return;
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  });

  async function startEngineApi(): Promise<void> {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;
  }

  it('direzione valida: 200, resultType=OK e state/ui su nuova location', async () => {
    await startEngineApi();

    const session = createSessionState();

    const pick = findAnyValidMove();

    const setLoc = await fetchWithSession(`${baseUrl}/api/engine/set-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: pick.fromId }),
    }, session);
    expect(setLoc.status).toBe(200);

    const res = await fetchWithSession(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: keyToVerb(pick.key) }),
    }, session);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.engine).toBeDefined();
    expect(body.engine.resultType).toBe('OK');

    expect(body.state?.currentLocationId).toBe(pick.toId);
    expect(body.ui?.location?.id).toBe(pick.toId);

    // Per NAVIGATION l'engine in genere espone locationId
    if (typeof body.engine.locationId === 'number') {
      expect(body.engine.locationId).toBe(pick.toId);
    }
  });

  it('direzione bloccata (0): 200, resultType=ERROR e location invariata', async () => {
    await startEngineApi();

    const session = createSessionState();

    const pick = findAnyBlockedMove();

    const setLoc = await fetchWithSession(`${baseUrl}/api/engine/set-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: pick.fromId }),
    }, session);
    expect(setLoc.status).toBe(200);

    const beforeStateRes = await fetchWithSession(`${baseUrl}/api/engine/state`, undefined, session);
    expect(beforeStateRes.status).toBe(200);
    const beforeStateBody = await beforeStateRes.json();
    const before = beforeStateBody?.state?.currentLocationId;

    const res = await fetchWithSession(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: keyToVerb(pick.key) }),
    }, session);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.engine).toBeDefined();
    expect(body.engine.resultType).toBe('ERROR');

    expect(body.state?.currentLocationId).toBe(before);
    expect(body.ui?.location?.id).toBe(before);
  });

  it('luogo terminale: 200, resultType=GAME_OVER e awaitingRestart=true', async () => {
    await startEngineApi();

    const session = createSessionState();

    const pick = findAnyTerminalMove();

    const setLoc = await fetchWithSession(`${baseUrl}/api/engine/set-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: pick.fromId }),
    }, session);
    expect(setLoc.status).toBe(200);

    const res = await fetchWithSession(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: keyToVerb(pick.key) }),
    }, session);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.engine).toBeDefined();
    expect(body.engine.resultType).toBe('GAME_OVER');
    expect(body.engine.gameOver).toBe(true);

    expect(body.state?.currentLocationId).toBe(pick.terminalId);
    expect(body.state?.awaitingRestart).toBe(true);
  });

  it('awaitingRestart: NO -> parseResult=null, command=null, resultType=ENDED e ended=true', async () => {
    await startEngineApi();

    const session = createSessionState();

    const pick = findAnyTerminalMove();

    const setLoc = await fetchWithSession(`${baseUrl}/api/engine/set-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: pick.fromId }),
    }, session);
    expect(setLoc.status).toBe(200);

    // Porta lo stato in awaitingRestart
    const r1 = await fetchWithSession(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: keyToVerb(pick.key) }),
    }, session);
    expect(r1.status).toBe(200);

    const snap1Res = await fetchWithSession(`${baseUrl}/api/engine/state`, undefined, session);
    expect(snap1Res.status).toBe(200);
    const snap1Body = await snap1Res.json();
    expect(snap1Body?.state?.awaitingRestart).toBe(true);

    const r2 = await fetchWithSession(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'NO' }),
    }, session);
    expect(r2.status).toBe(200);
    const body2 = await r2.json();

    expect(body2.ok).toBe(true);
    expect(body2.parseResult).toBe(null);
    expect(body2.command).toBe(null);
    expect(body2.engine?.resultType).toBe('ENDED');
    expect(body2.state?.ended).toBe(true);
    expect(body2.state?.awaitingRestart).toBe(false);
  });

  it('awaitingRestart: SI -> hard reset (currentLocationId=1, stats e turn azzerati)', async () => {
    await startEngineApi();

    const session = createSessionState();

    const pick = findAnyTerminalMove();

    const setLoc = await fetchWithSession(`${baseUrl}/api/engine/set-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: pick.fromId }),
    }, session);
    expect(setLoc.status).toBe(200);

    // Porta lo stato in awaitingRestart
    const r1 = await fetchWithSession(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: keyToVerb(pick.key) }),
    }, session);
    expect(r1.status).toBe(200);

    const snap1Res = await fetchWithSession(`${baseUrl}/api/engine/state`, undefined, session);
    expect(snap1Res.status).toBe(200);
    const snap1Body = await snap1Res.json();
    expect(snap1Body?.state?.awaitingRestart).toBe(true);

    const r2 = await fetchWithSession(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'SI' }),
    }, session);

    expect(r2.status).toBe(200);
    const body2 = await r2.json();

    expect(body2.ok).toBe(true);
    expect(body2.parseResult).toBe(null);
    expect(body2.command).toBe(null);

    expect(body2.state?.currentLocationId).toBe(1);
    expect(body2.state?.awaitingRestart).toBe(false);

    // Stats azzerate (iniziale: luogo 1 già visitato, score=1)
    expect(body2.stats?.visitedPlaces).toBe(1);
    expect(body2.stats?.score).toBe(1);

    // Turn system azzerato
    expect(body2.state?.turn?.globalTurnNumber).toBe(0);
    expect(body2.state?.turn?.totalTurnsConsumed).toBe(0);
  });
});
