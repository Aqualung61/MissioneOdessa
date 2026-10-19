/**
 * Istantanea del vocabolario (#63, lotto 2 v1.4.2).
 * Specifica: `docs/20261019 - TD Lotto 2 Parser - v1.0.md`, §4.1-§4.2.
 *
 * Verifica che `ensureVocabulary({ currentLingua })` costruisca, per IT (217 token)
 * ed EN (151 token), esattamente la stessa mappa token -> info registrata dal
 * generatore di riferimento (`Claude decompiler/gen_parse.mjs`, fuori dal
 * repository) su `release/v1.4.2` @ `3c1a379`.
 *
 * Nessuna modalità di aggiornamento: un fallimento qui significa che il refactor
 * di `ensureVocabulary` ha cambiato l'ordine di costruzione o il contenuto della
 * mappa, da correggere nel codice nuovo, mai nel test o nel fixture.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { ensureVocabulary, resetVocabularyCache } from '../src/logic/parser.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

interface VocabEntry {
  canonical: string;
  concept: string;
  termId: number;
  type: string;
}

type VocabPair = [string, VocabEntry];

interface BaselineFile {
  format: number;
  generator: string;
  vocab: Record<string, VocabPair[]>;
}

const FIXTURE_PATH = resolve(__dirname, 'fixtures', 'parser', 'vocabulary_baseline.json');

function loadBaseline(): BaselineFile {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as BaselineFile;
}

function canon(v: Json): Json {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(canon);
  const o: Record<string, Json> = {};
  for (const k of Object.keys(v).sort()) {
    if (v[k] !== null && v[k] !== undefined) o[k] = canon(v[k]);
  }
  return o;
}

async function buildActualPairs(lingua: number): Promise<VocabPair[]> {
  const { tokenMap } = await ensureVocabulary({ currentLingua: lingua });
  return [...tokenMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([t, i]) => [t, canon(i)] as VocabPair);
}

describe('Istantanea del vocabolario (#63, lotto 2)', () => {
  let baseline: BaselineFile;

  beforeAll(async () => {
    await initOdessa();
    resetVocabularyCache();
    baseline = loadBaseline();
  });

  it('riporta la baseline registrata con 217 token IT e 151 token EN', () => {
    expect(baseline.vocab['1'].length).toBe(217);
    expect(baseline.vocab['2'].length).toBe(151);
  });

  it('ensureVocabulary({ currentLingua: 1 }) riproduce esattamente il vocabolario IT registrato', async () => {
    const actual = await buildActualPairs(1);
    expect(actual).toEqual(baseline.vocab['1']);
  });

  it('ensureVocabulary({ currentLingua: 2 }) riproduce esattamente il vocabolario EN registrato', async () => {
    const actual = await buildActualPairs(2);
    expect(actual).toEqual(baseline.vocab['2']);
  });

  it('un token con accento e il suo alias senza accento hanno lo stesso oggetto info (es. GIÙ / GIU)', async () => {
    const { tokenMap } = await ensureVocabulary({ currentLingua: 1 });
    const accentato = tokenMap.get('GIÙ');
    const senzaAccento = tokenMap.get('GIU');
    expect(accentato).toBeDefined();
    expect(senzaAccento).toBeDefined();
    expect(canon(senzaAccento)).toEqual(canon(accentato));
  });
});
