/**
 * Generazione delle risposte per l'istantanea del lessico (#109, lotto L2a).
 * Stesse regole, stesso ordine e stesso formato del generatore di riferimento
 * (`Claude decompiler/20261016 - L2 gen_responses.mjs`); condiviso tra
 * `tests/responses.snapshot.test.ts` e `tests/responses.language.test.ts` per evitare
 * due implementazioni indipendenti dello stesso algoritmo.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createEngine } from '../../src/logic/engine.js';
import { parseCommand } from '../../src/logic/parser.js';
import { mapParseErrorToUserMessage } from '../../src/logic/messages.js';

type Engine = ReturnType<typeof createEngine>;

export interface ResponseEntry {
  lang: number;
  step: number;
  input: string;
  message: string;
}

interface Step {
  step: number;
  command: string;
}

interface VoceLessico {
  Voce: string;
  ID_Termine: number;
  ID_Lingua: number;
}

interface TermineLessico {
  ID_Termine: number;
  ID_TipoLessico: number;
}

const root = resolve(__dirname, '..', '..');
const loadJson = (...parts: string[]) => JSON.parse(readFileSync(resolve(root, ...parts), 'utf8'));

// Stessi 7 punti della partita del generatore di riferimento (passi del percorso completo).
export const STEPS = [0, 6, 37, 49, 94, 119, 146];
export const RESPONSES_FIXTURE_PATH = resolve(root, 'tests', 'fixtures', 'responses', 'responses_baseline.json');

function typeOf(terminiLessico: TermineLessico[], idTermine: number): number {
  const t = terminiLessico.find((x) => x.ID_Termine === idTermine);
  if (!t) throw new Error(`ID_Termine ${idTermine} non trovato in TerminiLessico`);
  return t.ID_TipoLessico;
}

/** Ogni voce del lessico da sola, e ogni combinazione verbo (tipi 1,2,3) + nome (tipo 4), in minuscolo, senza duplicati, in ordine alfabetico. */
function buildInputs(lingua: number): string[] {
  const vociLessico = global.odessaData.VociLessico as VoceLessico[];
  const terminiLessico = global.odessaData.TerminiLessico as TermineLessico[];

  const vociLingua = vociLessico.filter((v) => v.ID_Lingua === lingua);
  const tutte = [...new Set(vociLingua.map((v) => v.Voce.toLowerCase()))];
  const verbi = [...new Set(vociLingua.filter((v) => [1, 2, 3].includes(typeOf(terminiLessico, v.ID_Termine))).map((v) => v.Voce.toLowerCase()))];
  const nomi = [...new Set(vociLingua.filter((v) => typeOf(terminiLessico, v.ID_Termine) === 4).map((v) => v.Voce.toLowerCase()))];

  const comandi = new Set(tutte);
  for (const verbo of verbi) {
    for (const nome of nomi) {
      comandi.add(`${verbo} ${nome}`);
    }
  }
  return [...comandi].sort();
}

function walkthrough(lingua: number): Step[] {
  return loadJson('tests', 'fixtures', 'walkthrough', lingua === 1 ? 'full_it.json' : 'full_en.json').steps as Step[];
}

function newEngine(lingua: number): Engine {
  const engine = createEngine();
  engine.initializeOriginalData();
  engine.resetGameState(lingua);
  return engine;
}

/** Genera le risposte nell'ordine lingua -> passo -> comando, come il generatore di riferimento. */
export async function generateResponses(): Promise<ResponseEntry[]> {
  const entries: ResponseEntry[] = [];

  for (const lingua of [1, 2]) {
    const inputs = buildInputs(lingua);
    const passi = walkthrough(lingua);

    for (const step of STEPS) {
      const engine = newEngine(lingua);
      for (const s of passi.filter((x) => x.step <= step)) {
        const parsed = await parseCommand(null, s.command, engine.getGameState());
        engine.executeCommand(parsed);
      }
      const snapshot = JSON.stringify(engine.getGameStateSnapshot());

      for (const input of inputs) {
        const esecutore = createEngine();
        esecutore.initializeOriginalData();
        esecutore.setGameState(JSON.parse(snapshot));
        const parsed = await parseCommand(null, input, esecutore.getGameState());
        const message =
          parsed.IsValid !== true
            ? mapParseErrorToUserMessage(parsed, lingua)
            : String(esecutore.executeCommand(parsed)?.message ?? '');
        entries.push({ lang: lingua, step, input, message });
      }
    }
  }

  return entries;
}

export function loadResponsesBaseline(): ResponseEntry[] {
  return JSON.parse(readFileSync(RESPONSES_FIXTURE_PATH, 'utf8')) as ResponseEntry[];
}

export function writeResponsesSnapshot(entries: ResponseEntry[]): void {
  writeFileSync(RESPONSES_FIXTURE_PATH, '[\n' + entries.map((e) => JSON.stringify(e)).join(',\n') + '\n]\n');
}
