/**
 * Test Unit per createEngine() (A1, #91)
 * Verifica che motori distinti abbiano stati di gioco indipendenti.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initOdessa } from '../../src/initOdessa.js';
import { createEngine } from '../../src/logic/engine.js';
import { ensureVocabulary, parseCommand } from '../../src/logic/parser.js';

describe('createEngine - isolamento dello stato tra motori', () => {
  let A: ReturnType<typeof createEngine>;
  let B: ReturnType<typeof createEngine>;

  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  beforeEach(() => {
    A = createEngine();
    B = createEngine();
    A.initializeOriginalData();
    B.initializeOriginalData();
    A.resetGameState(1);
    B.resetGameState(1);
  });

  it('TB-03: setCurrentLocation su A non cambia il luogo di B', () => {
    A.setCurrentLocation(5);
    expect(A.getGameState().currentLocationId).toBe(5);
    expect(B.getGameState().currentLocationId).toBe(1);
  });

  it('TB-04: resetGameState su B non modifica A', () => {
    A.setCurrentLocation(5);
    B.resetGameState(1);
    expect(A.getGameState().currentLocationId).toBe(5);
  });

  it('TB-05: un comando eseguito su A consuma turni solo di A', async () => {
    const parsed = await parseCommand(null, 'e');
    expect(parsed.IsValid).toBe(true);
    A.executeCommand(parsed);
    expect(A.getGameState().turn.totalTurnsConsumed).toBe(1);
    expect(B.getGameState().turn.totalTurnsConsumed).toBe(0);
  });

  it('TB-06: setGameState su B non condivide riferimenti con A', () => {
    B.setGameState(A.getGameStateSnapshot());
    A.setCurrentLocation(3);
    expect(B.getGameState().currentLocationId).not.toBe(3);
    expect(B.getOggetti()).not.toBe(A.getOggetti());
  });
});
