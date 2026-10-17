/**
 * Corpus di non regressione del parser (#109, lotto L1).
 * Verifica che l'analisi di ogni comando registrato sulla baseline `release/v1.4.1`
 * (f65a102) resti identica, salvo i cambi attesi dei lotti successivi (L1: `look`,
 * `examine`, `sleep` EN da soli; L2b: verbi da soli e `carica`/`load` con un nome,
 * TD Lessico L2 risposte e testi, §5.5 v1.1; L3: i 194 casi con una voce rimossa
 * (E5), stesso esito di una parola sconosciuta nella stessa posizione, TD Lessico L3
 * nomi luoghi e guardia, §6.2 v1.1). Il corpus è protetto: si aggiorna solo
 * aggiungendo cambi attesi motivati nella specifica del lotto che lo richiede.
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

function toFields(c: { IsValid: boolean; CommandType: string | null; VerbConcept: string | null; NounConcept: string | null; Error: string }): ParsedFields {
  return { IsValid: c.IsValid, CommandType: c.CommandType, VerbConcept: c.VerbConcept, NounConcept: c.NounConcept, Error: c.Error };
}

// Aggiornato per #109 (lotto L1): cambi attesi (TD Lessico L1 sinonimi §4, §5.1):
// `look`, `examine` e `sleep` (EN) da soli sono validi come i corrispondenti italiani
// `guarda`, `esamina`, `dormi`. Per questi tre casi EN il test non accetta più il
// valore della baseline: richiede solo il valore nuovo.
const EXPECTED_CHANGES: Record<string, ParsedFields> = {
  LOOK: { IsValid: true, CommandType: 'ACTION', VerbConcept: 'GUARDARE', NounConcept: null, Error: 'NONE' },
  EXAMINE: { IsValid: true, CommandType: 'ACTION', VerbConcept: 'ESAMINARE', NounConcept: null, Error: 'NONE' },
  SLEEP: { IsValid: true, CommandType: 'ACTION', VerbConcept: 'DORMIRE', NounConcept: null, Error: 'NONE' },
};

// Aggiornato per #109 (lotto L2b): 8 verbi che diventano validi da soli, per regola
// (TD Lessico L2 risposte e testi, §5.5 v1.1). Chiave: `${lang}|${INPUT_NORMALIZZATO}`.
const BARE_VERB_CHANGES: Record<string, ParsedFields> = {
  '1|SCAVA': { IsValid: true, CommandType: 'ACTION', VerbConcept: 'SCAVARE', NounConcept: null, Error: 'NONE' },
  '1|SCAVARE': { IsValid: true, CommandType: 'ACTION', VerbConcept: 'SCAVARE', NounConcept: null, Error: 'NONE' },
  '1|ACCENDI': { IsValid: true, CommandType: 'ACTION', VerbConcept: 'ACCENDERE', NounConcept: null, Error: 'NONE' },
  '1|ACCENDERE': { IsValid: true, CommandType: 'ACTION', VerbConcept: 'ACCENDERE', NounConcept: null, Error: 'NONE' },
  '1|ILLUMINA': { IsValid: true, CommandType: 'ACTION', VerbConcept: 'ACCENDERE', NounConcept: null, Error: 'NONE' },
  '1|ILLUMINARE': { IsValid: true, CommandType: 'ACTION', VerbConcept: 'ACCENDERE', NounConcept: null, Error: 'NONE' },
  '2|DIG': { IsValid: true, CommandType: 'ACTION', VerbConcept: 'SCAVARE', NounConcept: null, Error: 'NONE' },
  '2|LIGHT': { IsValid: true, CommandType: 'ACTION', VerbConcept: 'ACCENDERE', NounConcept: null, Error: 'NONE' },
};

// Aggiornato per #109 (lotto L2b): i 12 casi con un nome di 3 o più parole
// significative restano invariati (limite preesistente del parser sui nomi composti,
// non raggiunto da nessun verbo oggi: TD §5.5 v1.1). Elencati esplicitamente per
// verificarli separatamente dal conteggio totale (sotto).
const CARICA_LOAD_UNCHANGED_INPUTS: Array<{ lang: number; input: string }> = [
  { lang: 1, input: 'carica arazzo in pessime condizioni' },
  { lang: 1, input: 'carica banco degli attrezzi' },
  { lang: 1, input: 'carica bastone di comando' },
  { lang: 1, input: 'carica lista di servizio' },
  { lang: 1, input: 'carica trofei alle pareti' },
  { lang: 1, input: 'load arazzo in pessime condizioni' },
  { lang: 1, input: 'load banco degli attrezzi' },
  { lang: 1, input: 'load bastone di comando' },
  { lang: 1, input: 'load lista di servizio' },
  { lang: 1, input: 'load trofei alle pareti' },
  { lang: 2, input: 'load tapestry in terrible condition' },
  { lang: 2, input: 'load trophies on the walls' },
];

/**
 * Regola L2b: `carica <nome>` (lingua 1) e `load <nome>` (lingua 1 o 2) diventano
 * un'azione valida (concetto CARICARE) con il nome, tranne quando il nome ha 3 o più
 * parole (limite preesistente del parser: anche un verbo d'azione esistente, non
 * toccato da questo lotto, non riconosce quei nomi come un'unica voce; verificato
 * sulla baseline per "esamina" / "examine", invariati). In quel caso il valore resta
 * quello della baseline.
 */
function expectedForCaricaLoad(testCase: BaselineCase, byLangInput: Map<string, BaselineCase>): ParsedFields | null {
  const normalized = testCase.input.trim();
  const match = testCase.lang === 1 ? /^(?:carica|load)\s+(.+)$/i.exec(normalized) : /^load\s+(.+)$/i.exec(normalized);
  if (!match) return null;

  const nome = match[1];
  const noteWords = nome.trim().split(/\s+/);
  if (noteWords.length >= 3) return null; // resta invariato: vedi CARICA_LOAD_UNCHANGED_INPUTS

  const verboRiferimento = testCase.lang === 1 ? 'esamina' : 'examine';
  const riferimento = byLangInput.get(`${testCase.lang}|${`${verboRiferimento} ${nome}`.toLowerCase()}`);
  const nounConcept = riferimento && riferimento.IsValid ? riferimento.NounConcept : null;

  return { IsValid: true, CommandType: 'ACTION', VerbConcept: 'CARICARE', NounConcept: nounConcept, Error: 'NONE' };
}

// Aggiornato per #109 (lotto L3): le 4 voci rimosse (E5) — BOTTON_LEGACY (IT, EN),
// TAVOLO_LEGACY (IT), TABLE_LEGACY (EN) — come regola, non come elenco: ogni caso del
// corpus che contiene una di queste parole, in qualunque posizione, deve dare lo
// stesso esito di una parola chiaramente inesistente nella stessa posizione (TD
// Lessico L3 nomi luoghi e guardia, §6.2 v1.1).
const LEGACY_REMOVED_WORDS = /\b(botton_legacy|tavolo_legacy|table_legacy)\b/i;
const NONEXISTENT_WORD = 'zzznonexistentword';

async function expectedForLegacyRemoval(testCase: BaselineCase): Promise<ParsedFields | null> {
  if (!LEGACY_REMOVED_WORDS.test(testCase.input)) return null;
  const substituted = testCase.input.replace(LEGACY_REMOVED_WORDS, NONEXISTENT_WORD);
  const res = await parseCommand(null, substituted, { currentLingua: testCase.lang });
  return toFields(res);
}

async function computeExpected(testCase: BaselineCase, byLangInput: Map<string, BaselineCase>): Promise<ParsedFields> {
  const normalizedInput = testCase.input.trim().toUpperCase();
  const baselineExpected = toFields(testCase);

  if (testCase.lang === 2 && EXPECTED_CHANGES[normalizedInput]) {
    return EXPECTED_CHANGES[normalizedInput];
  }
  const bareKey = `${testCase.lang}|${normalizedInput}`;
  if (BARE_VERB_CHANGES[bareKey]) {
    return BARE_VERB_CHANGES[bareKey];
  }
  const legacyExpected = await expectedForLegacyRemoval(testCase);
  if (legacyExpected) {
    return legacyExpected;
  }
  const caricaExpected = expectedForCaricaLoad(testCase, byLangInput);
  if (caricaExpected) {
    return caricaExpected;
  }
  return baselineExpected;
}

describe('Corpus di non regressione del parser (#109, lotto L1)', () => {
  let baseline: BaselineFile;
  let byLangInput: Map<string, BaselineCase>;

  beforeAll(async () => {
    global.odessaData = { VociLessico, Oggetti, TerminiLessico, TipiLessico };
    await ensureVocabulary({ currentLingua: 1 });
    await ensureVocabulary({ currentLingua: 2 });
    baseline = loadBaseline();
    byLangInput = new Map(baseline.cases.map((c) => [`${c.lang}|${c.input.toLowerCase()}`, c]));
  });

  it('riporta la baseline registrata su release/v1.4.1 con 5.080 casi', () => {
    expect(baseline.baseline).toBe('release/v1.4.1 f65a102');
    expect(baseline.cases.length).toBe(5080);
  });

  it('ogni comando del corpus resta coerente con la baseline, salvo i cambi attesi', async () => {
    const mismatches: string[] = [];

    for (const testCase of baseline.cases) {
      const res = await parseCommand(null, testCase.input, { currentLingua: testCase.lang });
      const actual = toFields(res);
      const expected = await computeExpected(testCase, byLangInput);
      const matches = sameFields(expected, actual);

      if (!matches) {
        mismatches.push(
          `lang=${testCase.lang} input="${testCase.input}": atteso ${JSON.stringify(expected)}, ottenuto ${JSON.stringify(actual)}`
        );
      }
    }

    expect(mismatches.length, mismatches.join('\n')).toBe(0);
  });

  it('i cambi attesi del lotto L2b sono esattamente 150 (8 verbi da soli + 94 IT + 48 EN con CARICA/LOAD), e i 12 nomi di 3+ parole restano invariati', () => {
    // Conteggio della sola regola L2b (EXPECTED_CHANGES L1 + BARE_VERB_CHANGES + CARICA/LOAD),
    // senza il livello di L3 (rimozione E5): quest'ultimo è un livello indipendente,
    // aggiunto sopra in `computeExpected`, non una modifica alla regola L2b in sé. Per i
    // 6 casi "carica/load + voce rimossa" (su 194), questo resta quindi il conteggio
    // originale di L2b (dove la voce esisteva ancora), verificato separatamente nel
    // test successivo per il comportamento odierno dopo la rimozione.
    let changedCount = 0;
    for (const testCase of baseline.cases) {
      const normalizedInput = testCase.input.trim().toUpperCase();
      if (testCase.lang === 2 && EXPECTED_CHANGES[normalizedInput]) continue; // cambio del lotto L1, non di L2b

      const baselineExpected = toFields(testCase);
      const bareKey = `${testCase.lang}|${normalizedInput}`;
      const expected = BARE_VERB_CHANGES[bareKey] || expectedForCaricaLoad(testCase, byLangInput) || baselineExpected;
      if (!sameFields(baselineExpected, expected)) changedCount++;
    }
    // 8 (verbi da soli) + 94 (IT carica/load + nome) + 48 (EN load + nome) = 150
    expect(changedCount).toBe(150);

    for (const { lang, input } of CARICA_LOAD_UNCHANGED_INPUTS) {
      const testCase = byLangInput.get(`${lang}|${input.toLowerCase()}`);
      expect(testCase, `caso non trovato nel corpus: "${input}" (lingua ${lang})`).toBeDefined();
      if (!testCase) continue;
      const expected = expectedForCaricaLoad(testCase, byLangInput) || toFields(testCase);
      expect(expected, `"${input}" deve restare invariato`).toEqual(toFields(testCase));
      expect(expected.Error, `"${input}" deve restare SYNTAX_INVALID_STRUCTURE`).toBe('SYNTAX_INVALID_STRUCTURE');
    }
  });

  // Aggiornato per #109 (lotto L3)
  it('i cambi attesi del lotto L3 sono esattamente 194 casi (una voce rimossa, E5): ciascuno dà oggi lo stesso esito di una parola sconosciuta nella stessa posizione, nessun altro caso è toccato da questa regola', async () => {
    const legacyCases = baseline.cases.filter((c) => LEGACY_REMOVED_WORDS.test(c.input));
    expect(legacyCases.length).toBe(194);

    for (const testCase of legacyCases) {
      // Criterio esatto di §6.2: l'esito odierno (via `computeExpected`, già verificato
      // identico all'esito reale del parser dal test di coerenza sopra) è lo stesso di
      // una parola chiaramente inesistente nella stessa posizione.
      const expected = await computeExpected(testCase, byLangInput);
      const asUnknown = await expectedForLegacyRemoval(testCase);
      expect(asUnknown, `"${testCase.input}" (lingua ${testCase.lang})`).not.toBeNull();
      expect(expected, `"${testCase.input}" (lingua ${testCase.lang})`).toEqual(asUnknown);
    }

    // Nessun altro caso del corpus è toccato dalla regola di rimozione: la funzione si
    // applica solo quando l'input contiene una delle 3 parole rimosse.
    const nonLegacyCases = baseline.cases.filter((c) => !LEGACY_REMOVED_WORDS.test(c.input));
    for (const testCase of nonLegacyCases) {
      expect(await expectedForLegacyRemoval(testCase)).toBeNull();
    }
  });
});
