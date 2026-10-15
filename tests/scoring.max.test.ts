/**
 * Punteggio massimo (HO-08, #99/#95)
 * Il massimo si calcola dai dati IT riproducendo le regole di punteggio del
 * motore v1.4.0: va aggiornato insieme a esse. Insieme al percorso completo,
 * che dimostra che 138 è raggiungibile, fissa il massimo in entrambe le direzioni.
 *   +1 per luogo non terminale; +2 per interazione (escluse quelle con effetto SEQUENZA);
 *   +3 per mistero distinto; +2 sequenza cassaforte; +4 incontro con Ferenc.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const data = (name: string) => JSON.parse(readFileSync(resolve(root, 'src', 'data-internal', name), 'utf8'));

interface Effetto {
  tipo: string;
  target?: string;
  luogo?: number;
  destinazione?: number;
}

function mysteryId(e: Effetto): string | null {
  if (e.tipo === 'VISIBILITA') return `visibilita_${e.target}`;
  if (e.tipo === 'SBLOCCA_DIREZIONE' || e.tipo === 'TOGGLE_DIREZIONE') {
    const a = e.luogo as number;
    const b = e.destinazione as number;
    return `direzione_${Math.min(a, b)}_${Math.max(a, b)}`;
  }
  return null;
}

function computeMax(): number {
  const luoghi = data('Luoghi.json').filter((l: { IDLingua: number }) => l.IDLingua === 1);
  const interazioni = data('Interazioni.json').filter((i: { IDLingua: number }) => i.IDLingua === 1);
  const places = luoghi.filter((l: { Terminale: number }) => l.Terminale !== -1).length;
  const scored = interazioni.filter((i: { effetti: Effetto[] }) => !i.effetti.some(e => e.tipo === 'SEQUENZA'));
  const mysteries = new Set<string>();
  for (const i of scored) {
    for (const e of i.effetti as Effetto[]) {
      const id = mysteryId(e);
      if (id) mysteries.add(id);
    }
  }
  return places + 2 * scored.length + 3 * mysteries.size + 2 + 4;
}

describe('punteggio massimo', () => {
  it('il massimo calcolato dai dati vale 138', () => {
    expect(computeMax()).toBe(138);
  });

  it('il massimo mostrato nei messaggi di sistema (IT, EN) è /138', () => {
    const msgs = data('MessaggiSistema.json').filter((m: { Chiave: string }) => m.Chiave === 'engine.score.breakdown');
    expect(msgs.map((m: { IDLingua: number }) => m.IDLingua).sort()).toEqual([1, 2]);
    for (const m of msgs) expect(m.Messaggio).toContain('/138');
  });

  it('il massimo mostrato nel frontend è 138', () => {
    const js = readFileSync(resolve(root, 'web', 'js', 'odessa_main.js'), 'utf8');
    expect(js).toContain("'ui.stats.score', currentScore, 138");
  });
});
