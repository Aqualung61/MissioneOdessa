/**
 * Traccia dello stato del motore (#63).
 * Specifica: `docs/20261019 - TD Lotto 0 Rete di caratterizzazione - v1.0.md`, §3.2-§3.3.
 *
 * Rigenera, con `generateEngineTrace()` (porting TypeScript del generatore di
 * riferimento `scripts/baselines/gen_trace.mjs`), la traccia di
 * 42 scenari e la confronta passo per passo con il fixture protetto
 * `tests/fixtures/trace/engine_trace.json`. Nessuna modalità di aggiornamento: la
 * traccia non si rigenera; questo file si modifica solo
 * se la specifica lo dichiara, con motivazione.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateEngineTrace } from './testUtils/trace.js';

interface Step {
  i: number;
  input: string | null;
  parse?: unknown;
  result?: unknown;
  state: unknown;
  sha: string;
}

interface Scenario {
  id: string;
  steps: Step[];
}

interface Trace {
  scenarios: Scenario[];
}

const root = resolve(__dirname, '..');
const fixturePath = resolve(root, 'tests', 'fixtures', 'trace', 'engine_trace.json');

describe('Traccia dello stato del motore (#63)', () => {
  let generated: Trace;
  let baseline: Trace;

  beforeAll(async () => {
    generated = (await generateEngineTrace()) as unknown as Trace;
    baseline = JSON.parse(readFileSync(fixturePath, 'utf8')) as Trace;
  });

  it('riproduce lo stesso numero di scenari e passi del fixture registrato', () => {
    expect(generated.scenarios.length).toBe(baseline.scenarios.length);
    const genSteps = generated.scenarios.reduce((a, s) => a + s.steps.length, 0);
    const baseSteps = baseline.scenarios.reduce((a, s) => a + s.steps.length, 0);
    expect(genSteps).toBe(baseSteps);
  }, 60000);

  it('riproduce passo per passo lo stesso input, parse, result, state e sha del fixture registrato', () => {
    const diffs: string[] = [];
    const byId = new Map(baseline.scenarios.map((s) => [s.id, s]));

    for (const gs of generated.scenarios) {
      const bs = byId.get(gs.id);
      if (!bs) {
        diffs.push(`scenario=${gs.id}: assente nel fixture`);
        continue;
      }
      const count = Math.max(gs.steps.length, bs.steps.length);
      for (let i = 0; i < count && diffs.length < 20; i++) {
        const g = gs.steps[i];
        const b = bs.steps[i];
        if (!g || !b) {
          diffs.push(
            `scenario=${gs.id} passo=${i}: presente solo in ${g ? 'generato' : 'fixture'}`
          );
          continue;
        }
        const fields: Array<keyof Step> = ['input', 'parse', 'result', 'state', 'sha'];
        for (const field of fields) {
          const gv = JSON.stringify(g[field]);
          const bv = JSON.stringify(b[field]);
          if (gv !== bv) {
            diffs.push(
              `scenario=${gs.id} passo=${g.i ?? i} input="${g.input ?? b.input}" campo=${field}: prima="${bv}" dopo="${gv}"`
            );
            if (diffs.length >= 20) break;
          }
        }
      }
    }

    expect(diffs.length, diffs.join('\n')).toBe(0);
  }, 60000);
});
