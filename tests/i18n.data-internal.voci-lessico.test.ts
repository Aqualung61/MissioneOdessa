import { describe, it, expect } from 'vitest';

import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import VociLessico from '../src/data-internal/VociLessico.json';

describe('Sprint 59.4 — data-internal: VociLessico i18n', () => {
  it('usa solo ID_Lingua whitelist (1=IT, 2=EN)', () => {
    const invalid = VociLessico.filter(v => v.ID_Lingua !== 1 && v.ID_Lingua !== 2);
    expect(invalid).toEqual([]);
  });

  it('ogni ID_Termine ha almeno una voce IT e una EN', () => {
    const byTerm = new Map<number, Set<number>>();

    for (const v of VociLessico) {
      const termId = v.ID_Termine;
      const set = byTerm.get(termId) ?? new Set<number>();
      set.add(v.ID_Lingua);
      byTerm.set(termId, set);
    }

    const missing: Array<{ termId: number; missing: number[] }> = [];
    for (const t of TerminiLessico) {
      const langs = byTerm.get(t.ID_Termine) ?? new Set<number>();
      const needed = [1, 2].filter(l => !langs.has(l));
      if (needed.length) missing.push({ termId: t.ID_Termine, missing: needed });
    }

    expect(missing).toEqual([]);
  });
});
