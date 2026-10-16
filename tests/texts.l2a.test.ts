/**
 * Lessico L2a: rete dei testi e correzioni IT/EN (#109)
 * Specifica: docs/20261016 - TD Lessico L2 risposte e testi - v1.1.md, §6.1 (TA-01…TA-07).
 *
 * Motore e parser reali (parseCommand + executeCommand). Per i luoghi precisi si
 * giocano i passi dei percorsi di riferimento (full_it.json / full_en.json); nessuna
 * modifica a mano dello stato.
 *
 * TA-05 e TA-06 coincidono con i due test della rete e del controllo lingua, già
 * coperti integralmente da `tests/responses.snapshot.test.ts` e
 * `tests/responses.language.test.ts` (TD §6.1: "basta un rimando").
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { createEngine } from '../src/logic/engine.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { getSystemMessage } from '../src/logic/systemMessages.js';

type Engine = ReturnType<typeof createEngine>;

const root = resolve(__dirname, '..');
const loadJson = (...parts: string[]) => JSON.parse(readFileSync(resolve(root, ...parts), 'utf8'));
const msg = (key: string, lingua = 1) => getSystemMessage(key, lingua);

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

async function runAll(engine: Engine, commands: string[]) {
  const results = [];
  for (const command of commands) results.push(await run(engine, command));
  return results;
}

function walkthrough(lingua: number): Step[] {
  return loadJson('tests', 'fixtures', 'walkthrough', lingua === 1 ? 'full_it.json' : 'full_en.json').steps as Step[];
}

async function playUpTo(lingua: number, uptoStep: number): Promise<Engine> {
  const engine = newEngine(lingua);
  for (const s of walkthrough(lingua).filter((x) => x.step <= uptoStep)) await run(engine, s.command);
  return engine;
}

async function pickFields(command: string, lingua: number): Promise<ParsedFields> {
  const r = await parseCommand(null, command, { currentLingua: lingua });
  return { IsValid: r.IsValid, CommandType: r.CommandType, VerbConcept: r.VerbConcept, NounConcept: r.NounConcept, Error: r.Error };
}

describe('Lessico L2a: rete dei testi e correzioni IT/EN (#109)', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('TA-01: EN, nomi senza traduzione nei messaggi generici (destra/sinistra/porta)', async () => {
    // Aggiornato per #109 (lotto L2b): "turn right" ricade ora nella regola più
    // specifica di D4 ("Non vedo niente da ruotare.", TD §5.3), che prevale
    // correttamente su quella generica di L2a; "take right" verifica lo stesso
    // difetto (a) con un verbo non toccato da L2b.
    const engine = newEngine(2);
    const [right, door, left] = await runAll(engine, ['take right', 'drop door', 'close left']);
    expect(right.message).toBe("You don't see right here.");
    expect(door.message).toBe("You don't have door.");
    expect(left.message).toBe("You don't see left here.");
  });

  it('TA-02: EN, testo di ripetizione tradotto (move painting due volte, passo 37)', async () => {
    // Fino al passo 36 (il percorso di riferimento esegue "move painting" al passo 37:
    // qui lo eseguiamo noi stessi due volte, per avere la prima e la seconda volta).
    const engine = await playUpTo(2, 36);
    const [first, second] = await runAll(engine, ['move painting', 'move painting']);
    expect(first.message).not.toBe("There's no need to do that again.");
    expect(second.message).toBe("There's no need to do that again.");
  });

  it('TA-03: IT, infinito nei messaggi generici', async () => {
    const engine1 = newEngine(1);
    const engine2 = newEngine(1);
    const engine3 = newEngine(1);
    const engine4 = newEngine(1);
    const apri = await run(engine1, 'apri documenti');
    const premi = await run(engine2, 'premi documenti');
    const ruota = await run(engine3, 'ruota documenti');
    const porgi = await run(engine4, 'porgi documenti');
    expect(apri.message).toBe('Non puoi aprire documenti.');
    expect(premi.message).toBe('Non puoi premere documenti.');
    expect(ruota.message).toBe('Non puoi ruotare documenti.');
    expect(porgi.message).toBe('Non puoi porgere documenti.');
  });

  it('TA-04: le 5 voci infinite nuove danno lo stesso concetto della voce esistente', async () => {
    const rows: Array<[string, string]> = [
      ['aprire documenti', 'apri documenti'],
      ['chiudere documenti', 'chiudi documenti'],
      ['dormire', 'dormi'],
      ['infilare documenti', 'infila documenti'],
      ['leggere documenti', 'leggi documenti'],
    ];
    for (const [infinito, riferimento] of rows) {
      const actual = await pickFields(infinito, 1);
      const expected = await pickFields(riferimento, 1);
      expect(actual, `${infinito} vs ${riferimento}`).toEqual(expected);
    }
  });

  it('TA-07: alla barriera il movimento bloccato precede l\'avviso della guardia', async () => {
    const engine = await playUpTo(1, 146);
    expect(engine.getGameState().currentLocationId).toBe(59);

    const [first, second] = await runAll(engine, ['n', 'n']);
    expect(first.resultType).toBe('ERROR');
    expect(first.message).toBe(msg('narrative.movement.blocked'));

    expect(second.resultType).toBe('ERROR');
    expect(second.message).toContain(msg('narrative.movement.blocked'));
    expect(second.message).toContain(msg('timer.guard.warning1'));
    expect(second.message.indexOf(msg('narrative.movement.blocked'))).toBeLessThan(
      second.message.indexOf(msg('timer.guard.warning1'))
    );
  });
});
