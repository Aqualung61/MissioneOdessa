/**
 * Lessico L1: sinonimi e parser (#109, lotto L1)
 * Specifica: docs/20261015 - TD Lessico L1 sinonimi - v1.1.md, §5.2 (TB-01…TB-08).
 *
 * Motore e parser reali (parseCommand + executeCommand). Per i luoghi precisi si
 * giocano i passi dei percorsi di riferimento (full_it.json / full_en.json); nessuna
 * modifica a mano dello stato.
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

interface ParsedFields {
  IsValid: boolean;
  CommandType: string | null;
  VerbConcept: string | null;
  NounConcept: string | null;
  Error: string;
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

function walkthrough(lingua: number): Step[] {
  return loadJson('tests', 'fixtures', 'walkthrough', lingua === 1 ? 'full_it.json' : 'full_en.json').steps as Step[];
}

/** Riproduce i passi del percorso di riferimento fino al passo `uptoStep` incluso, su un motore nuovo. */
async function playUpTo(lingua: number, uptoStep: number): Promise<Engine> {
  const engine = newEngine(lingua);
  for (const s of walkthrough(lingua).filter((x) => x.step <= uptoStep)) await run(engine, s.command);
  return engine;
}

async function pickFields(command: string, lingua: number): Promise<ParsedFields> {
  const r = await parseCommand(null, command, { currentLingua: lingua });
  return { IsValid: r.IsValid, CommandType: r.CommandType, VerbConcept: r.VerbConcept, NounConcept: r.NounConcept, Error: r.Error };
}

describe('Lessico L1: sinonimi e parser (#109)', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('TB-01: sinonimi con lo stesso concetto e lo stesso esito reale dei verbi esistenti', async () => {
    // osserva = esamina (documenti in inventario dall'inizio, nessun luogo particolare)
    const rOsserva = await run(newEngine(1), 'osserva documenti');
    const rEsamina = await run(newEngine(1), 'esamina documenti');
    expect(rOsserva).toEqual(rEsamina);

    // gira destra = ruota destra, in biblioteca dopo "sposta quadro" (passo 37 del percorso di riferimento)
    const rGira = await run(await playUpTo(1, 37), 'gira destra');
    const rRuota = await run(await playUpTo(1, 37), 'ruota destra');
    expect(rGira).toEqual(rRuota);

    // pigia / schiaccia = premi pulsante (qui il pulsante non c'è: stessa risposta per i tre)
    const rPigia = await run(newEngine(1), 'pigia pulsante');
    const rSchiaccia = await run(newEngine(1), 'schiaccia pulsante');
    const rPremi = await run(newEngine(1), 'premi pulsante');
    expect(rPigia).toEqual(rPremi);
    expect(rSchiaccia).toEqual(rPremi);

    // introduci = infila medaglione, dopo "sposta arazzo" (passo 52; il medaglione è in
    // inventario dal passo 44 del percorso di riferimento)
    const rIntroduci = await run(await playUpTo(1, 52), 'introduci medaglione');
    const rInfila = await run(await playUpTo(1, 52), 'infila medaglione');
    expect(rIntroduci).toEqual(rInfila);
  });

  it('TB-02: esamina sedia = esamina sedie, nel grande salone (passo 23)', async () => {
    const rSedia = await run(await playUpTo(1, 23), 'esamina sedia');
    const rSedie = await run(await playUpTo(1, 23), 'esamina sedie');
    expect(rSedia).toEqual(rSedie);
  });

  it('TB-03: b = basso, dal luogo 9 al luogo 7 (passo 10)', async () => {
    const engineB = await playUpTo(1, 10);
    const engineBasso = await playUpTo(1, 10);
    expect(engineB.getGameState().currentLocationId).toBe(9);
    expect(engineBasso.getGameState().currentLocationId).toBe(9);

    const rB = await run(engineB, 'b');
    const rBasso = await run(engineBasso, 'basso');
    expect(rB).toEqual(rBasso);
    expect(engineB.getGameState().currentLocationId).toBe(7);
    expect(engineBasso.getGameState().currentLocationId).toBe(7);
  });

  it('TB-04: le preposizioni vengono scartate come gli articoli', async () => {
    const rRiferimento = await run(newEngine(1), 'esamina documenti');
    for (const command of ['esamina con documenti', 'esamina verso documenti']) {
      const r = await run(newEngine(1), command);
      expect(r, command).toEqual(rRiferimento);
    }

    // prendi alla lampada, nel ripostiglio (passo 3, prima di prendere la lampada al passo 4)
    const rAlla = await run(await playUpTo(1, 3), 'prendi alla lampada');
    const rPrendi = await run(await playUpTo(1, 3), 'prendi lampada');
    expect(rAlla).toEqual(rPrendi);
  });

  it('TB-05: EN, stessi esiti degli equivalenti italiani', async () => {
    const rObserve = await run(newEngine(2), 'observe documents');
    const rExamine = await run(newEngine(2), 'examine documents');
    expect(rObserve).toEqual(rExamine);

    const rRotate = await run(await playUpTo(2, 37), 'rotate right');
    const rTurn = await run(await playUpTo(2, 37), 'turn right');
    expect(rRotate).toEqual(rTurn);

    const rPush = await run(newEngine(2), 'push button');
    const rPress = await run(newEngine(2), 'press button');
    expect(rPush).toEqual(rPress);

    const rChair = await run(await playUpTo(2, 23), 'examine chair');
    const rChairs = await run(await playUpTo(2, 23), 'examine chairs');
    expect(rChair).toEqual(rChairs);

    const rWith = await run(await playUpTo(2, 3), 'take the lamp with');
    const rTake = await run(await playUpTo(2, 3), 'take lamp');
    expect(rWith).toEqual(rTake);
  });

  it('TB-06: EN look/examine/observe da soli descrivono il luogo; sleep è valido', async () => {
    const reference = newEngine(2);
    const expectedDescription = reference.generaDescrizioneLuogoConOggetti(reference.getGameState().currentLocationId);

    for (const command of ['look', 'examine', 'observe']) {
      const r = await run(newEngine(2), command);
      expect(r.resultType, command).toBe('OK');
      expect(r.message, command).toBe(expectedDescription);
    }

    // sleep: accettato dal parser; la risposta del motore si corregge nel lotto L2
    const sleep = await run(newEngine(2), 'sleep');
    expect(sleep.resultType).not.toBe('ERROR');
    expect(sleep.resultType).not.toBe('GAME_OVER');
  });

  it('TB-07: "a" (IT) da solo resta un comando senza verbo (D1)', async () => {
    // Aggiornato per #109 (lotto L3): "a" è ora una preposizione registrata (E4, TD
    // Lessico L3 nomi luoghi e guardia, §3) e non più un token sconosciuto; da sola,
    // senza verbo, resta comunque un comando non riconosciuto (nessun token utile
    // dopo il filtro delle parole vuote), ma senza più l'informazione del token
    // sconosciuto (che non esiste più come tale: "a" non è ignota, è solo vuota).
    const r = await parseCommand(null, 'a', { currentLingua: 1 });
    expect(r.IsValid).toBe(false);
    expect(r.Error).toBe('COMMAND_UNKNOWN');
    expect(r.UnknownToken).toBeNull();
  });

  it('TB-08: copertura completa delle 19 voci nuove (§3: 11 sinonimi IT/EN e 8 preposizioni)', async () => {
    // Ogni riga: [lingua, comando con il sinonimo/la preposizione nuova, comando di riferimento equivalente]
    const rows: Array<[number, string, string]> = [
      [1, 'osserva documenti', 'esamina documenti'],
      [2, 'observe documents', 'examine documents'],
      [1, 'gira destra', 'ruota destra'],
      [2, 'rotate right', 'turn right'],
      [1, 'introduci medaglione', 'infila medaglione'],
      [1, 'pigia pulsante', 'premi pulsante'],
      [1, 'schiaccia pulsante', 'premi pulsante'],
      [2, 'push button', 'press button'],
      [1, 'esamina sedia', 'esamina sedie'],
      [2, 'examine chair', 'examine chairs'],
      [1, 'b', 'basso'],
      [1, 'esamina alla documenti', 'esamina documenti'],
      [1, 'esamina col documenti', 'esamina documenti'],
      [1, 'esamina con documenti', 'esamina documenti'],
      [1, 'esamina verso documenti', 'esamina documenti'],
      [2, 'examine with documents', 'examine documents'],
      [2, 'examine to documents', 'examine documents'],
      [2, 'examine towards documents', 'examine documents'],
      [2, 'examine at documents', 'examine documents'],
    ];
    expect(rows).toHaveLength(19);

    for (const [lingua, synonym, reference] of rows) {
      const actual = await pickFields(synonym, lingua);
      const expected = await pickFields(reference, lingua);
      expect(actual, `${synonym} (lingua ${lingua}) vs ${reference}`).toEqual(expected);
      expect(actual.IsValid, `${synonym} (lingua ${lingua})`).toBe(true);
    }
  });
});
