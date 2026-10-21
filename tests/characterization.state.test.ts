/**
 * Caratterizzazione del caricamento dello stato (#63, lotto 5 v1.4.2, P0).
 * Specifica: `Claude decompiler/20261020 - TD Lotto 5 Effetti di turno, route e ESLint - v1.0.md`, §5.1 test 2.
 *
 * `setGameState` su 9 gruppi di salvataggi (11 casi) costruiti sul fixture protetto
 * `tests/fixtures/trace/save_v141_full_it_step91.json` e registrati in
 * `tests/fixtures/state/state_load_lotto5.json`, generato sul baseline (`e088e7c`) dal
 * generatore `Claude decompiler/HO-24 gen_state_load.mjs` (fuori dal repository; non si rigenera).
 * Tutti i salvataggi contengono le quattro collezioni di TD §3.3.4: il comportamento per le
 * collezioni mancanti (D-5-4) è coperto da `tests/state.load-defaults.test.ts`.
 *
 * Per ogni caso si confrontano lo stato (`getGameState()` serializzato, Set → array) e lo
 * snapshot (`getGameStateSnapshot()` senza `timestamp`/`version`), con uguaglianza profonda e
 * con ordine delle chiavi d'inserimento (confronto di stringhe JSON). Più lo stato iniziale
 * dopo `resetGameState(1)` e `resetGameState(2)`.
 *
 * Usa solo l'API pubblica del motore: resta valido dopo la scomposizione di `engine.js`.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { createEngine } from '../src/logic/engine.js';

type Engine = ReturnType<typeof createEngine>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const root = resolve(__dirname, '..');
const fixture: {
  initial: { it: Json; en: Json };
  cases: Array<{ id: string; group: number; description: string; input: Json; state: Json; snapshot: Json }>;
} = JSON.parse(readFileSync(resolve(root, 'tests', 'fixtures', 'state', 'state_load_lotto5.json'), 'utf8'));

// Serializzazione identica a quella del generatore: Set → array, chiavi nell'ordine d'inserimento.
function ser(v: Json): Json {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Set) return [...v].map(ser);
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'function' || x === undefined ? null : ser(x)));
  const o: Record<string, Json> = {};
  for (const k of Object.keys(v)) {
    if (typeof v[k] === 'function' || v[k] === undefined) continue;
    o[k] = ser(v[k]);
  }
  return o;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function newEngine(lingua: number): Engine {
  const engine = createEngine();
  engine.initializeOriginalData();
  engine.resetGameState(lingua);
  return engine;
}

describe('Caratterizzazione del caricamento dello stato (lotto 5, P0)', () => {
  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await initOdessa();
  });

  it('la fixture contiene 9 gruppi (11 casi) e tutte le quattro collezioni in ogni salvataggio', () => {
    expect(new Set(fixture.cases.map((c) => c.group)).size).toBe(9);
    expect(fixture.cases.length).toBe(11);
    for (const c of fixture.cases) {
      for (const k of ['interazioniEseguite', 'direzioniSbloccate', 'direzioniToggle', 'sequenze']) {
        expect(c.input[k], `${c.id}: ${k}`).toBeDefined();
        expect(c.input[k], `${c.id}: ${k}`).not.toBeNull();
      }
    }
  });

  it('i due casi di bastoneLiberato partono con il flag già presente (true e false)', () => {
    const a = fixture.cases.find((c) => c.id === 'g7a');
    const b = fixture.cases.find((c) => c.id === 'g7b');
    expect(a?.input.flags.bastoneLiberato).toBe(true);
    expect(b?.input.flags.bastoneLiberato).toBe(false);
    expect(a?.state.flags.bastoneLiberato).toBe(true);
    expect(b?.state.flags.bastoneLiberato).toBe(false);
  });

  describe.each(fixture.cases.map((c) => [c.id, c.description, c] as const))('%s — %s', (_id, _desc, c) => {
    it('lo stato caricato coincide con quello registrato (valori e ordine delle chiavi)', () => {
      const engine = newEngine(1);
      const input = clone(c.input);
      engine.setGameState(input);
      const state = ser(engine.getGameState());
      expect(state).toEqual(c.state);
      expect(JSON.stringify(state)).toBe(JSON.stringify(c.state));
      // il salvataggio ricevuto non viene modificato
      expect(input).toEqual(c.input);
    });

    it('lo snapshot coincide con quello registrato (senza timestamp/version)', () => {
      const engine = newEngine(1);
      engine.setGameState(clone(c.input));
      const snapshot = engine.getGameStateSnapshot() as Json;
      expect(typeof snapshot.timestamp).toBe('string');
      delete snapshot.timestamp;
      delete snapshot.version;
      const s = ser(snapshot);
      expect(s).toEqual(c.snapshot);
      expect(JSON.stringify(s)).toBe(JSON.stringify(c.snapshot));
    });
  });

  describe.each([
    ['IT', 1, 'it'],
    ['EN', 2, 'en'],
  ] as const)('stato iniziale dopo resetGameState — %s', (_label, lingua, key) => {
    it('coincide con quello registrato (valori e ordine delle chiavi)', () => {
      const state = ser(newEngine(lingua).getGameState());
      expect(state).toEqual(fixture.initial[key]);
      expect(JSON.stringify(state)).toBe(JSON.stringify(fixture.initial[key]));
    });
  });
});
