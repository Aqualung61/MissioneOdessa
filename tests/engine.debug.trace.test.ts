import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { resetGameState, executeCommand, getGameState } from '../src/logic/engine.js';
import { getEngineDebugTrace, resetEngineDebugTrace } from '../src/logic/engineDebug.js';

describe('Sprint #58.2 - Engine debug trace (dev/test)', () => {
  const prev = process.env.ENGINE_DEBUG;

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

  it('registra eventi con delta e permette ricostruzione base', () => {
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
});
