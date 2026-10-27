import { describe, it, expect } from 'vitest';

import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import VociLessico from '../src/data-internal/VociLessico.json';

describe('Sprint 59.4 — data-internal: VociLessico i18n', () => {
  it('usa solo ID_Lingua whitelist (1=IT, 2=EN)', () => {
    const invalid = VociLessico.filter(v => v.ID_Lingua !== 1 && v.ID_Lingua !== 2);
    expect(invalid).toEqual([]);
  });

  it('ogni ID_Termine ha almeno una voce IT e una EN, salvo le eccezioni esplicite', () => {
    // ID_Termine 80 (concetto LUCE) non ha una voce
    // EN per decisione approvata (TD Lessico L2 risposte e testi, §0 D5: "Nessuno:
    // LIGHT è già il verbo. In inglese light/extinguish da soli coprono
    // accendi luce/spegni luce" — nessun nome EN separato è necessario).
    const EXPECTED_MISSING_EN: ReadonlySet<number> = new Set([80]);

    // ID_Termine 35 (TAVOLO) e 36 (BOTTON) non hanno
    // più nessuna voce, in nessuna lingua, per la rimozione delle voci residue
    // BOTTON_LEGACY/TAVOLO_LEGACY/TABLE_LEGACY (E5, TD Lessico L3 nomi luoghi e
    // guardia, §3): "I concetti restano" nei dati, ma senza più alcuna voce che un
    // giocatore possa digitare.
    const EXPECTED_MISSING_BOTH: ReadonlySet<number> = new Set([35, 36]);

    const byTerm = new Map<number, Set<number>>();

    for (const v of VociLessico) {
      const termId = v.ID_Termine;
      const set = byTerm.get(termId) ?? new Set<number>();
      set.add(v.ID_Lingua);
      byTerm.set(termId, set);
    }

    const missing: Array<{ termId: number; missing: number[] }> = [];
    for (const t of TerminiLessico) {
      if (EXPECTED_MISSING_BOTH.has(t.ID_Termine)) continue;
      const langs = byTerm.get(t.ID_Termine) ?? new Set<number>();
      const needed = [1, 2].filter(l => !langs.has(l));
      const unexpected = EXPECTED_MISSING_EN.has(t.ID_Termine) ? needed.filter((l) => l !== 2) : needed;
      if (unexpected.length) missing.push({ termId: t.ID_Termine, missing: unexpected });
    }

    expect(missing).toEqual([]);

    // L'eccezione deve restare quella esatta e motivata: se LUCE guadagnasse una
    // voce EN, o se un altro ID_Termine perdesse la sua, questo fallisce.
    for (const termId of EXPECTED_MISSING_EN) {
      const langs = byTerm.get(termId) ?? new Set<number>();
      expect(langs.has(1), `ID_Termine ${termId}: manca la voce IT`).toBe(true);
      expect(langs.has(2), `ID_Termine ${termId}: ha guadagnato una voce EN, l'eccezione non è più necessaria`).toBe(false);
    }

    // L'eccezione di E5 deve restare esattamente TAVOLO (35) e BOTTON (36), entrambi
    // senza nessuna voce in nessuna lingua: se uno dei due ne guadagnasse una, o se un
    // altro ID_Termine perdesse entrambe, questo fallisce.
    for (const termId of EXPECTED_MISSING_BOTH) {
      const langs = byTerm.get(termId) ?? new Set<number>();
      expect(langs.size, `ID_Termine ${termId}: ha guadagnato una voce, l'eccezione non è più necessaria`).toBe(0);
    }
  });
});
