import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

import {
  initializeOriginalData,
  resetGameState,
  setCurrentLocation,
  getGameState,
  getGameStateSnapshot,
  getDirezioniLuogo,
  executeCommand,
} from '../src/logic/engine.js';

import type { GameState } from '../types/game-state';
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

function getOdessaData(): OdessaData {
  return (globalThis.odessaData ?? {}) as OdessaData;
}

function getLuoghiLingua1(): Luogo[] {
  return (getOdessaData().Luoghi ?? []).filter((l) => l.IDLingua === 1);
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

function findAnyValidMoveAvoidingSpecials(): { fromId: number; key: DirectionKey; toId: number } {
  const luoghi = getLuoghiLingua1();
  const keys: DirectionKey[] = ['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu'];

  const terminalIds = new Set(
    luoghi.filter((l) => l.Terminale === -1).map((l) => l.ID)
  );

  for (const luogo of luoghi) {
    const fromId = luogo.ID;
    if (fromId === 1) continue;
    if (fromId === 59) continue;
    const dirs = getDirs(fromId);
    for (const key of keys) {
      const toId = dirs?.[key];
      if (typeof toId === 'number' && toId >= 1 && !terminalIds.has(toId)) {
        return { fromId, key, toId };
      }
    }
  }

  throw new Error('Nessuna direzione valida trovata nel dataset (avoid specials)');
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

  it('lampada abbandonata: se lasci lampada accesa a terra e non hai torcia funzionante, NAVIGATION causa game over immediato', async () => {
    const pick = findAnyValidMoveAvoidingSpecials();
    setCurrentLocation(pick.fromId);

    // Allinea esplicitamente il turn tracking con la location forzata (più robusto del workaround via "noop command")
    const state = getGameState() as GameState;
    state.turn.current.location = pick.fromId;
    state.turn.previous.location = pick.fromId;

    const lampada = (state.Oggetti ?? []).find((o) => o.ID === 27);
    if (!lampada) {
      throw new Error('Lampada (ID=27) non presente nei dati');
    }

    // Lampada accesa ma lasciata a terra nel luogo corrente
    lampada.IDLuogo = pick.fromId;
    state.timers.lampadaAccesa = true;

    // Nessuna torcia funzionante in inventario (forza esplicitamente sia il flag sia la posizione della torcia)
    const torcia = (state.Oggetti ?? []).find((o) => o.ID === 37);
    if (torcia) {
      torcia.IDLuogo = 999; // non in inventario
    }
    state.timers.torciaDifettosa = true;

    const verb = keyToVerb(pick.key);
    const parsed = await parseCommand(null, verb);
    expect(parsed.IsValid).toBe(true);
    expect(parsed.CommandType).toBe('NAVIGATION');

    const res = executeCommand(parsed) as unknown as EngineResult;
    expect(res.accepted).toBe(false);
    expect(res.resultType).toBe('GAME_OVER');
    expect(res.gameOver).toBe(true);

    const snap = getGameStateSnapshot();
    expect(snap.awaitingRestart).toBe(true);
  });
});
