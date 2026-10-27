/**
 * Default dei salvataggi incompleti (#63, D-5-4).
 * Specifica: `docs/20261021 - TD Lotto 5 Effetti di turno, route e ESLint - v1.2.md`, §3.3.4 e §5.2.
 *
 * Un salvataggio senza una delle quattro collezioni (`interazioniEseguite`, `direzioniToggle`,
 * `sequenze`, `direzioniSbloccate`; `undefined` o `null`) si carica con il valore vuoto (`[]` o `{}`)
 * e il comando che prima finiva in `TypeError` (errore 500 via HTTP) risponde senza eccezioni.
 * Un valore presente, anche di tipo errato, non si tocca. Lo snapshot è quello di sempre
 * (restituisce `[]`/`{}` per i campi assenti). Eccezione dichiarata al vincolo "comportamento
 * invariato": riguarda solo i casi che prima davano errore.
 *
 * Base: il salvataggio v1.4.1 protetto `save_v141_full_it_step91.json`.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { loadMessaggiSistema } from '../src/logic/systemMessages.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { createEngine } from '../src/logic/engine.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const SAVE_PATH = resolve(__dirname, '..', 'tests', 'fixtures', 'trace', 'save_v141_full_it_step91.json');

function baseSave(): Json {
  return JSON.parse(readFileSync(SAVE_PATH, 'utf8')).gameState;
}

function loadInto(save: Json) {
  const engine = createEngine();
  engine.initializeOriginalData();
  engine.resetGameState(1);
  engine.setGameState(save);
  return engine;
}

async function run(engine: ReturnType<typeof createEngine>, command: string): Promise<Json> {
  const parsed = await parseCommand(null, command, engine.getGameState());
  return engine.executeCommand(parsed);
}

// Collezione → default, luogo e comando che senza il default finiscono in TypeError.
const COLLECTIONS: Array<{ field: string; empty: Json; location: number; command: string }> = [
  { field: 'interazioniEseguite', empty: [], location: 20, command: 'sposta arazzo' }, // interazione non ripetibile
  { field: 'direzioniToggle', empty: {}, location: 44, command: 'premi pulsante' },
  { field: 'sequenze', empty: {}, location: 24, command: 'ruota destra' }, // passo della combinazione
  { field: 'direzioniSbloccate', empty: {}, location: 20, command: 'sposta arazzo' }, // nessun errore: default per uniformità
];

describe('Default dei salvataggi incompleti (D-5-4)', () => {
  beforeAll(async () => {
    const quiet = console.log;
    console.log = () => undefined;
    try {
      await initOdessa();
      loadMessaggiSistema();
      await ensureVocabulary();
    } finally {
      console.log = quiet;
    }
  });

  describe.each(COLLECTIONS)('$field', ({ field, empty, location, command }) => {
    it.each([['assente', undefined], ['null', null]])('%s → default vuoto e il comando risponde senza eccezioni', async (_label, value) => {
      const save = baseSave();
      if (value === undefined) delete save[field];
      else save[field] = value;
      save.currentLocationId = location;

      const engine = loadInto(save);
      expect(engine.getGameState()[field]).toEqual(empty);

      const result = await run(engine, command);
      expect(result).toBeDefined();
      expect(typeof result.accepted).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('un valore presente non viene sostituito', () => {
      const save = baseSave();
      const present = Array.isArray(empty) ? ['x_presente'] : { x_presente: true };
      save[field] = present;
      expect(loadInto(save).getGameState()[field]).toEqual(present);
    });

    it('un valore presente di tipo errato non viene toccato', () => {
      const save = baseSave();
      save[field] = 'tipo errato';
      expect(loadInto(save).getGameState()[field]).toBe('tipo errato');
    });

    it('lo snapshot di un salvataggio senza il campo coincide con quello del salvataggio con il campo vuoto', () => {
      const without = baseSave();
      delete without[field];
      const withEmpty = baseSave();
      withEmpty[field] = empty;

      const a = loadInto(without).getGameStateSnapshot() as Json;
      const b = loadInto(withEmpty).getGameStateSnapshot() as Json;
      delete a.timestamp;
      delete b.timestamp;
      expect(a[field]).toEqual(empty);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
  });

  it('tutte e quattro le collezioni assenti insieme', async () => {
    const save = baseSave();
    for (const { field } of COLLECTIONS) delete save[field];
    save.currentLocationId = 44;
    const engine = loadInto(save);
    for (const { field, empty } of COLLECTIONS) expect(engine.getGameState()[field]).toEqual(empty);
    const result = await run(engine, 'premi pulsante');
    expect(result.accepted).toBe(true);
  });
});
