/**
 * Istantanea completa del parser (#63, lotto 2 v1.4.2).
 * Specifica: `docs/20261019 - TD Lotto 2 Parser - v1.0.md`, §4.1-§4.2.
 *
 * Verifica che `parseCommand` (e, dopo il refactor, anche `parseInput`) produca,
 * per ciascuna delle 12.966 coppie (lingua, input) e dei 10 input non stringa,
 * esattamente lo stesso `ParseResult` registrato dal generatore di riferimento
 * (`Claude decompiler/gen_parse.mjs`, fuori dal repository) su `release/v1.4.2`
 * @ `3c1a379`. Stessa normalizzazione: campi `null`/`undefined` rimossi, chiavi
 * ordinate, `OriginalInput` rimosso per gli input stringa (uguale all'input).
 *
 * Nessuna modalità di aggiornamento: un fallimento qui significa che il refactor
 * ha cambiato il comportamento, da correggere nel codice nuovo, mai nel test o
 * nel fixture (regola 8 dell'handoff).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { ensureVocabulary, parseCommand, parseInput } from '../src/logic/parser.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

interface Case {
  lang: number;
  input: string;
  result: Json;
}

interface BaselineFile {
  format: number;
  generator: string;
  note: string;
  cases: Case[];
  nonString: Case[];
}

const FIXTURE_PATH = resolve(__dirname, 'fixtures', 'parser', 'parse_full_baseline.json');

function loadBaseline(): BaselineFile {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as BaselineFile;
}

// Stessa normalizzazione del generatore: chiavi non null/undefined, ordinate.
function canon(v: Json): Json {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(canon);
  const o: Record<string, Json> = {};
  for (const k of Object.keys(v).sort()) {
    if (v[k] !== null && v[k] !== undefined) o[k] = canon(v[k]);
  }
  return o;
}

function normalize(result: Json, input: Json): Json {
  const c = canon(result);
  if (typeof input === 'string') delete c.OriginalInput;
  return c;
}

// Etichetta registrata dal generatore: `v === undefined ? '(undefined)' : JSON.stringify(v)`
// per v in [null, undefined, 5, {}, []] — univocamente invertibile con JSON.parse.
function nonStringInputFor(label: string): Json {
  if (label === '(undefined)') return undefined;
  return JSON.parse(label);
}

describe('Istantanea completa del parser (#63)', () => {
  let baseline: BaselineFile;

  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary({ currentLingua: 1 });
    await ensureVocabulary({ currentLingua: 2 });
    baseline = loadBaseline();
  });

  it('riporta la baseline registrata con 12.966 casi e 10 input non stringa', () => {
    expect(baseline.cases.length).toBe(12966);
    expect(baseline.nonString.length).toBe(10);
  });

  it(
    'parseCommand(null, input, { currentLingua }) riproduce esattamente il ParseResult registrato',
    async () => {
      const diffs: string[] = [];

      for (const { lang, input, result } of baseline.cases) {
        if (diffs.length >= 20) break;
        const actual = normalize(await parseCommand(null, input, { currentLingua: lang }), input);
        const expected = normalize(result, input);
        compareAndCollect(diffs, lang, input, expected, actual);
      }

      for (const { lang, input, result } of baseline.nonString) {
        if (diffs.length >= 20) break;
        const realInput = nonStringInputFor(input);
        const actual = normalize(await parseCommand(null, realInput, { currentLingua: lang }), realInput);
        const expected = normalize(result, realInput);
        compareAndCollect(diffs, lang, input, expected, actual);
      }

      expect(diffs.length, diffs.join('\n')).toBe(0);
    },
    60000
  );

  it(
    'parseInput(input, { currentLingua }) riproduce esattamente il ParseResult registrato',
    async () => {
      const diffs: string[] = [];

      for (const { lang, input, result } of baseline.cases) {
        if (diffs.length >= 20) break;
        const actual = normalize(await parseInput(input, { currentLingua: lang }), input);
        const expected = normalize(result, input);
        compareAndCollect(diffs, lang, input, expected, actual);
      }

      for (const { lang, input, result } of baseline.nonString) {
        if (diffs.length >= 20) break;
        const realInput = nonStringInputFor(input);
        const actual = normalize(await parseInput(realInput, { currentLingua: lang }), realInput);
        const expected = normalize(result, realInput);
        compareAndCollect(diffs, lang, input, expected, actual);
      }

      expect(diffs.length, diffs.join('\n')).toBe(0);
    },
    60000
  );
});

function compareAndCollect(diffs: string[], lang: number, input: string, expected: Json, actual: Json): void {
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  for (const key of keys) {
    if (diffs.length >= 20) return;
    const before = JSON.stringify(expected[key]);
    const after = JSON.stringify(actual[key]);
    if (before !== after) {
      diffs.push(`lang=${lang} input=${JSON.stringify(input)} campo=${key}: prima=${before} dopo=${after}`);
    }
  }
}
