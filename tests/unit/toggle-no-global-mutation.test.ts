/**
 * Test Unit: TOGGLE_DIREZIONE non scrive sui dati globali condivisi (#94, R1)
 * Lo stato precedente al toggle è una variabile locale di applicaEffetti.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createEngine } from '../../src/logic/engine.js';
import { ensureVocabulary, parseCommand } from '../../src/logic/parser.js';
import { initOdessa } from '../../src/initOdessa.js';

type Engine = ReturnType<typeof createEngine>;

async function press(engine: Engine) {
  const parsed = await parseCommand(null, 'premi pulsante', engine.getGameState());
  expect(parsed.IsValid).toBe(true);
  return engine.executeCommand(parsed);
}

function newEngineAtLocation44(): Engine {
  const engine = createEngine();
  engine.initializeOriginalData();
  engine.resetGameState(1);
  engine.setCurrentLocation(44);
  return engine;
}

function hasPreToggleKey(value: unknown): boolean {
  return JSON.stringify(value).includes('_statoPreToggle');
}

describe('TOGGLE_DIREZIONE senza mutazione dei dati globali (#94)', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('TB-01: nessuna chiave _statoPreToggle nei dati; +3 alla prima apertura, mai alla chiusura, per ogni motore', async () => {
    for (let i = 0; i < 2; i++) {
      const engine = newEngineAtLocation44();
      const misteri = () => engine.getGameState().punteggio.misteriRisolti as Set<string>;
      expect(misteri().has('direzione_44_45')).toBe(false);

      const scoreStart = engine.getGameState().punteggio.totale;
      await press(engine); // apre
      const scoreOpen = engine.getGameState().punteggio.totale;
      // +2 per la prima esecuzione dell'interazione, +3 per il mistero (una sola volta)
      expect(scoreOpen - scoreStart).toBe(5);
      expect(misteri().has('direzione_44_45')).toBe(true);

      await press(engine); // chiude
      expect(engine.getGameState().punteggio.totale).toBe(scoreOpen);

      expect(hasPreToggleKey(global.odessaData.Interazioni)).toBe(false);
    }
  });
});
