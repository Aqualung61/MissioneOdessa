/**
 * Istantanea delle risposte (#109).
 * Specifica: docs/20261016 - TD Lessico L2 risposte e testi - v1.1.md, §4.1;
 * TD Lessico L3 nomi luoghi e guardia, §6.1 v1.1.
 *
 * Rigenera, con le stesse regole, lo stesso ordine e lo stesso formato del
 * generatore di riferimento (`scripts/baselines/gen_responses.mjs`),
 * la risposta di ogni comando del lessico in 7 punti della partita (IT ed EN) e la
 * confronta con l'istantanea protetta `tests/fixtures/responses/responses_baseline.json`.
 *
 * Aggiornamento dell'istantanea (solo per differenze attese della
 * specifica): `UPDATE_RESPONSES=1 npx vitest run tests/responses.snapshot.test.ts`.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initOdessa } from '../src/initOdessa.js';
import { ensureVocabulary } from '../src/logic/parser.js';
import {
  generateResponses,
  loadResponsesBaseline,
  writeResponsesSnapshot,
} from './testUtils/responseSnapshot.js';

describe('Istantanea delle risposte (#109)', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('riporta la baseline registrata con 88.151 righe (#109)', () => {
    const baseline = loadResponsesBaseline();
    expect(baseline.length).toBe(88151);
  });

  // Timeout esteso (#109): genera ~88.000 risposte con motore e parser
  // reali (vedi generateResponses), più lento del
  // default di Vitest sotto carico nella suite completa.
  it('rigenera esattamente le stesse risposte della baseline', async () => {
    const generated = await generateResponses();

    if (process.env.UPDATE_RESPONSES === '1') {
      writeResponsesSnapshot(generated);
      return;
    }

    const baseline = loadResponsesBaseline();
    expect(generated.length).toBe(baseline.length);

    const diffs: string[] = [];
    const count = Math.max(baseline.length, generated.length);
    for (let i = 0; i < count; i++) {
      const a = baseline[i];
      const b = generated[i];
      if (
        !a ||
        !b ||
        a.lang !== b.lang ||
        a.step !== b.step ||
        a.input !== b.input ||
        a.message !== b.message
      ) {
        diffs.push(
          `lang=${a?.lang ?? b?.lang} step=${a?.step ?? b?.step} input="${a?.input ?? b?.input}": prima="${a?.message}" dopo="${b?.message}"`
        );
      }
    }

    expect(diffs.length, diffs.join('\n')).toBe(0);
  }, 60000);
});
