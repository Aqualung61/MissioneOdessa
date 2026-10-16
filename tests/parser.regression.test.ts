/**
 * Corpus di non regressione del parser (#109, lotto L1).
 * Verifica che l'analisi di ogni comando registrato sulla baseline `release/v1.4.1`
 * (f65a102) resti identica, salvo i tre cambi attesi di `look`, `examine` e `sleep`
 * (EN) da soli (TD Lessico L1 sinonimi, §5.1). Il corpus è protetto: si aggiorna
 * solo aggiungendo cambi attesi motivati nella specifica del lotto che lo richiede.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import VociLessico from '../src/data-internal/VociLessico.json';
import Oggetti from '../src/data-internal/Oggetti.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';

interface BaselineCase {
  lang: number;
  input: string;
  IsValid: boolean;
  CommandType: string | null;
  VerbConcept: string | null;
  NounConcept: string | null;
  Error: string;
}

interface BaselineFile {
  baseline: string;
  cases: BaselineCase[];
}

interface ParsedFields {
  IsValid: boolean;
  CommandType: string | null;
  VerbConcept: string | null;
  NounConcept: string | null;
  Error: string;
}

const FIXTURE_PATH = resolve(__dirname, 'fixtures', 'parser', 'parser_baseline.json');

function loadBaseline(): BaselineFile {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as BaselineFile;
}

function sameFields(a: ParsedFields, b: ParsedFields): boolean {
  return (
    a.IsValid === b.IsValid &&
    a.CommandType === b.CommandType &&
    a.VerbConcept === b.VerbConcept &&
    a.NounConcept === b.NounConcept &&
    a.Error === b.Error
  );
}

// Aggiornato per #109 (lotto L1): il test è ora protetto. Cambi attesi (TD Lessico L1
// sinonimi §4, §5.1): `look`, `examine` e `sleep` (EN) da soli sono validi come i
// corrispondenti italiani `guarda`, `esamina`, `dormi`. Per questi tre casi EN il test
// non accetta più il valore della baseline: richiede solo il valore nuovo.
const EXPECTED_CHANGES: Record<string, ParsedFields> = {
  LOOK: { IsValid: true, CommandType: 'ACTION', VerbConcept: 'GUARDARE', NounConcept: null, Error: 'NONE' },
  EXAMINE: { IsValid: true, CommandType: 'ACTION', VerbConcept: 'ESAMINARE', NounConcept: null, Error: 'NONE' },
  SLEEP: { IsValid: true, CommandType: 'ACTION', VerbConcept: 'DORMIRE', NounConcept: null, Error: 'NONE' },
};

describe('Corpus di non regressione del parser (#109, lotto L1)', () => {
  let baseline: BaselineFile;

  beforeAll(async () => {
    global.odessaData = { VociLessico, Oggetti, TerminiLessico, TipiLessico };
    await ensureVocabulary({ currentLingua: 1 });
    await ensureVocabulary({ currentLingua: 2 });
    baseline = loadBaseline();
  });

  it('riporta la baseline registrata su release/v1.4.1 con 5.080 casi', () => {
    expect(baseline.baseline).toBe('release/v1.4.1 f65a102');
    expect(baseline.cases.length).toBe(5080);
  });

  it('ogni comando del corpus resta coerente con la baseline, salvo i tre cambi attesi', async () => {
    const mismatches: string[] = [];

    for (const testCase of baseline.cases) {
      const res = await parseCommand(null, testCase.input, { currentLingua: testCase.lang });
      const actual: ParsedFields = {
        IsValid: res.IsValid,
        CommandType: res.CommandType,
        VerbConcept: res.VerbConcept,
        NounConcept: res.NounConcept,
        Error: res.Error,
      };
      const baselineExpected: ParsedFields = {
        IsValid: testCase.IsValid,
        CommandType: testCase.CommandType,
        VerbConcept: testCase.VerbConcept,
        NounConcept: testCase.NounConcept,
        Error: testCase.Error,
      };

      const normalizedInput = testCase.input.trim().toUpperCase();
      const expectedChange =
        testCase.lang === 2 ? EXPECTED_CHANGES[normalizedInput as keyof typeof EXPECTED_CHANGES] : undefined;

      const expected = expectedChange ?? baselineExpected;
      const matches = sameFields(expected, actual);

      if (!matches) {
        mismatches.push(
          `lang=${testCase.lang} input="${testCase.input}": atteso ${JSON.stringify(expected)}, ottenuto ${JSON.stringify(actual)}`
        );
      }
    }

    expect(mismatches.length, mismatches.join('\n')).toBe(0);
  });
});
