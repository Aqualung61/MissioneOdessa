import { describe, it, expect } from 'vitest';
import VociLessico from '../src/data-internal/VociLessico.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';

function getNavVoices(): Array<{ Concetto: string; Voce: string }> {
  // Simula la query JOIN usando filtri su JSON
  return VociLessico
    .filter(vl => vl.ID_Lingua === 1)
    .map(vl => {
      const tl = TerminiLessico.find(t => t.ID_Termine === vl.ID_Termine);
      if (!tl) return null;
      const t = TipiLessico.find(tp => tp.ID_TipoLessico === tl.ID_TipoLessico);
      if (!t || t.NomeTipo !== 'NAVIGAZIONE') return null;
      return { Concetto: tl.Concetto, Voce: vl.Voce };
    })
    .filter(row => row !== null) as Array<{ Concetto: string; Voce: string }>;
}

describe('Lessico NAVIGAZIONE: voci base presenti (LinguaID=1)', () => {
  it('include NORD, EST, SUD, OVEST, SU, GIÙ in VociLessico', () => {
    const rows = getNavVoices();
    const voices = new Set(rows.map(r => r.Voce.toUpperCase()));
    const required = ['NORD','EST','SUD','OVEST','SU','GIÙ'];
    for (const v of required) {
      expect(voices.has(v)).toBe(true);
    }
  });
});
