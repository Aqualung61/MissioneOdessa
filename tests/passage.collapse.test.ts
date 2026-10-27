/**
 * Passaggio crollato nel sotterraneo (32 → 36) (#117)
 * Specifica: docs/20261017 - TD Passaggio crollato - v1.0.md, §4 (TP-01…TP-06).
 *
 * Motore e parser reali (parseCommand + executeCommand). Il percorso fino al 32 si gioca
 * con i passi del percorso completo di riferimento; nessuna modifica a mano dello stato,
 * salvo TP-05 costruito con `setGameState` da uno stato reale, togliendo solo il flag.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { createEngine } from '../src/logic/engine.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';

type Engine = ReturnType<typeof createEngine>;

const root = resolve(__dirname, '..');
const loadJson = (...parts: string[]) => JSON.parse(readFileSync(resolve(root, ...parts), 'utf8'));

interface Step {
  step: number;
  command: string;
}

interface Walkthrough {
  lingua: number;
  expected: { score: number };
  steps: Step[];
}

function newEngine(lingua = 1): Engine {
  const engine = createEngine();
  engine.initializeOriginalData();
  engine.resetGameState(lingua);
  return engine;
}

async function run(engine: Engine, command: string) {
  const parsed = await parseCommand(null, command, engine.getGameState());
  return engine.executeCommand(parsed);
}

function walkthrough(lingua: number): Walkthrough {
  return loadJson(
    'tests',
    'fixtures',
    'walkthrough',
    lingua === 1 ? 'full_it.json' : 'full_en.json'
  ) as Walkthrough;
}

/** Stretto passaggio (32), prima di attraversarlo verso sud (dopo il passo 80 del percorso completo). */
async function toPassaggio32(lingua = 1): Promise<Engine> {
  const engine = newEngine(lingua);
  for (const s of walkthrough(lingua).steps.filter((x) => x.step <= 80))
    await run(engine, s.command);
  expect(engine.getGameState().currentLocationId).toBe(32);
  return engine;
}

const RACCONTO_IT =
  'Appena ti lasci alle spalle il tratto di passaggio, questo crolla: sei stato fortunato a non restare sepolto dal crollo ma da quella parte ora non si può più passare.';
const RACCONTO_EN =
  "As soon as you leave the stretch of passage behind you, it collapses. You were lucky not to be buried by the cave-in, but you can't go back that way anymore.";
const BLOCCATO_IT = 'Non puoi passare: il passaggio è crollato.';
const BLOCCATO_EN = "You can't get through: the passage has collapsed.";
const DESCRIZIONE_36_IT = 'Sei in uno stretto passaggio. Il soffitto è crollato a nord.';
const DESCRIZIONE_36_EN = 'You are in a narrow passage. The ceiling has collapsed to the north.';

/** Percorso di ritorno 36 → 37 → 27 → 28 → 29 → 30 → 32, verificato sul codice attuale (specifica §4, TP-02). */
function percorsoRitorno(lingua: number): string[] {
  const ovest = lingua === 1 ? 'o' : 'w';
  return [ovest, ovest, 'n', 'n', 'e', 'e'];
}

describe('passaggio crollato nel sotterraneo (#117)', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  describe.each([
    {
      label: 'IT',
      lingua: 1,
      racconto: RACCONTO_IT,
      bloccato: BLOCCATO_IT,
      descrizione36: DESCRIZIONE_36_IT,
      guarda: 'guarda',
      infila: 'infila medaglione',
    },
    {
      label: 'EN',
      lingua: 2,
      racconto: RACCONTO_EN,
      bloccato: BLOCCATO_EN,
      descrizione36: DESCRIZIONE_36_EN,
      guarda: 'look',
      infila: 'insert medallion',
    },
  ])('$label', ({ lingua, racconto, bloccato, descrizione36, guarda, infila }) => {
    it('TP-01: primo passaggio da 32 a sud (36): racconto del crollo, flag impostato', async () => {
      const engine = await toPassaggio32(lingua);
      const r = await run(engine, 's');

      expect(r.resultType).toBe('OK');
      expect(r.message).toBe(racconto);
      expect(engine.getGameState().currentLocationId).toBe(36);
      expect(engine.getGameState().flags.passaggioCrollato).toBe(true);
    });

    it('TP-02: crollo già avvenuto, di ritorno al 32: s resta bloccato, turno consumato', async () => {
      const engine = await toPassaggio32(lingua);
      await run(engine, 's'); // TP-01: primo passaggio, al 36

      const turniPrima = engine.getGameState().turn.totalTurnsConsumed;

      await run(engine, infila); // step 84 del percorso di riferimento
      for (const comando of percorsoRitorno(lingua)) {
        await run(engine, comando);
      }
      expect(engine.getGameState().currentLocationId).toBe(32);

      const r = await run(engine, 's');
      expect(r.resultType).toBe('ERROR');
      expect(r.message).toBe(bloccato);
      expect(engine.getGameState().currentLocationId).toBe(32);
      expect(engine.getGameState().turn.totalTurnsConsumed).toBeGreaterThan(turniPrima);
    });

    it('TP-03: guarda/look al 36 mostra la descrizione breve, senza il racconto', async () => {
      const engine = await toPassaggio32(lingua);
      await run(engine, 's'); // al 36

      const r = await run(engine, guarda);
      expect(r.message).toContain(descrizione36);
      expect(r.message).not.toContain(racconto);
    });

    it('TP-04: n dal 36 resta bloccato (invariato)', async () => {
      const engine = await toPassaggio32(lingua);
      await run(engine, 's'); // al 36

      const r = await run(engine, 'n');
      expect(r.resultType).toBe('ERROR');
      expect(engine.getGameState().currentLocationId).toBe(36);
    });

    it('TP-05: salvataggio con 36 visitato e senza flag: dopo il caricamento il flag è vero e s dal 32 è bloccato', async () => {
      const source = await toPassaggio32(lingua);
      await run(source, 's'); // al 36, visitedPlaces contiene 36
      await run(source, infila);
      for (const comando of percorsoRitorno(lingua)) {
        await run(source, comando);
      }
      expect(source.getGameState().currentLocationId).toBe(32);

      const snapshot = source.getGameStateSnapshot() as Record<string, unknown> & {
        visitedPlaces: number[];
      };
      expect(snapshot.visitedPlaces).toContain(36);
      delete (snapshot as { flags?: unknown }).flags;

      const engine = newEngine(lingua);
      engine.setGameState(snapshot);
      expect(engine.getGameState().flags.passaggioCrollato).toBe(true);

      const r = await run(engine, 's');
      expect(r.resultType).toBe('ERROR');
      expect(r.message).toBe(bloccato);
      expect(engine.getGameState().currentLocationId).toBe(32);
    });

    it('TP-06: percorso completo e punteggio 138 invariati', async () => {
      const engine = newEngine(lingua);
      const w = walkthrough(lingua);
      for (const s of w.steps) await run(engine, s.command);

      const state = engine.getGameState();
      expect(state.punteggio.totale).toBe(w.expected.score);
      expect(state.victory).toBe(true);
      expect(state.ended).toBe(true);
    });
  });
});
