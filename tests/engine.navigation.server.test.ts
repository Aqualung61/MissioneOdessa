import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

import {
  initializeOriginalData,
  resetGameState,
  setCurrentLocation,
  getGameStateSnapshot,
  getDirezioniLuogo,
  executeCommand,
} from '../src/logic/engine.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';

type DirectionKey = 'Nord' | 'Est' | 'Sud' | 'Ovest' | 'Su' | 'Giu';

type Luogo = {
  ID: number;
  IDLingua: number;
  Terminale?: number;
};

type OdessaData = {
  [key: string]: unknown;
  Luoghi?: Luogo[];
};

type EngineResult = {
  accepted: boolean;
  resultType: string;
  locationId?: number;
  gameOver?: boolean;
};

declare global {
  // Popolato da tests/setup.ts
  var odessaData: OdessaData | undefined;
}

function getLuoghiLingua1(): Luogo[] {
  return (globalThis.odessaData?.Luoghi ?? []).filter((l) => l.IDLingua === 1);
}

function getDirs(fromId: number): Partial<Record<DirectionKey, number>> {
  return getDirezioniLuogo(fromId) as unknown as Partial<Record<DirectionKey, number>>;
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
    const dirs = getDirs(fromId);
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
    const dirs = getDirs(fromId);
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
  const terminalIds = new Set(
    luoghi.filter((l) => l.Terminale === -1).map((l) => l.ID)
  );
  const keys: DirectionKey[] = ['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu'];

  for (const luogo of luoghi) {
    const fromId = luogo.ID;
    // Luogo 1: può triggerare la sequenza vittoria (Ferenc) via turn effects.
    // Non è target di questo test (qui vogliamo validare catena terminale).
    if (fromId === 1) continue;
    // Luogo 59: scenario guardia/vittoria, spesso blocca NAVIGATION.
    // Non è target di questo test (qui vogliamo validare catena terminale).
    if (fromId === 59) continue;
    const dirs = getDirs(fromId);
    for (const key of keys) {
      const toId = dirs?.[key];
      if (typeof toId === 'number' && terminalIds.has(toId)) {
        return { fromId, key, terminalId: toId };
      }
    }
  }

  throw new Error('Nessuna direzione verso luogo terminale trovata nel dataset');
}

describe('Sprint 4.1.2 - NAVIGATION server-side (engine)', () => {
  beforeAll(async () => {
    initializeOriginalData();
    await ensureVocabulary();
  });

  beforeEach(() => {
    resetGameState(1);
  });

  it('direzione valida: cambia currentLocationId e ritorna locationId', async () => {
    const pick = findAnyValidMove();
    setCurrentLocation(pick.fromId);

    const verb = keyToVerb(pick.key);
    const parsed = await parseCommand(null, verb);
    expect(parsed.IsValid).toBe(true);
    expect(parsed.CommandType).toBe('NAVIGATION');

    const res = executeCommand(parsed) as unknown as EngineResult;
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('OK');
    expect(res.locationId).toBe(pick.toId);

    const snap = getGameStateSnapshot();
    expect(snap.currentLocationId).toBe(pick.toId);
  });

  it('direzione bloccata (0): non cambia location e ritorna resultType=ERROR', async () => {
    const pick = findAnyBlockedMove();
    setCurrentLocation(pick.fromId);
    const before = getGameStateSnapshot().currentLocationId;

    const verb = keyToVerb(pick.key);
    const parsed = await parseCommand(null, verb);
    expect(parsed.IsValid).toBe(true);
    expect(parsed.CommandType).toBe('NAVIGATION');

    const res = executeCommand(parsed) as unknown as EngineResult;
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('ERROR');

    const after = getGameStateSnapshot().currentLocationId;
    expect(after).toBe(before);
  });

  it('luogo terminale: entrando in Terminale=-1 attiva awaitingRestart tramite turn effects', async () => {
    const pick = findAnyTerminalMove();
    setCurrentLocation(pick.fromId);

    const verb = keyToVerb(pick.key);
    const parsed = await parseCommand(null, verb);
    expect(parsed.IsValid).toBe(true);
    expect(parsed.CommandType).toBe('NAVIGATION');

    const res = executeCommand(parsed) as unknown as EngineResult;
    // Per design: entrare in luogo terminale => game over (accepted=false)
    expect(res.accepted).toBe(false);
    expect(res.resultType).toBe('GAME_OVER');

    const snap = getGameStateSnapshot();
    expect(snap.currentLocationId).toBe(pick.terminalId);
    expect(snap.awaitingRestart).toBe(true);

    // Il middleware gameOverEffect dovrebbe aver marcato il risultato
    expect(res.gameOver).toBe(true);
  });
});
