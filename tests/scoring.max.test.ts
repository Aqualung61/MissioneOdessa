/**
 * Punteggio massimo (#99/#95)
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
const data = (name: string) =>
  JSON.parse(readFileSync(resolve(root, 'src', 'data-internal', name), 'utf8'));

interface Effetto {
  tipo: string;
  target?: string;
  luogo?: number;
  destinazione?: number;
}

interface Interazione {
  id: string;
  effetti: Effetto[];
  punteggio?: string | false;
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

// Aggiornato per #96: campo punteggio
// `punteggio: false` esclude l'interazione dal conteggio (nessun +2 né mistero dei suoi
// effetti); `punteggio` stringa condivide la chiave con l'interazione indicata, quindi non
// aggiunge un nuovo +2 se quella chiave è già stata contata (§4.1 della specifica).
function computeMax(): number {
  const luoghi = data('Luoghi.json').filter((l: { IDLingua: number }) => l.IDLingua === 1);
  const interazioni = data('Interazioni.json').filter(
    (i: { IDLingua: number }) => i.IDLingua === 1
  ) as Interazione[];
  const places = luoghi.filter((l: { Terminale: number }) => l.Terminale !== -1).length;
  const scored = interazioni.filter(
    (i) => !i.effetti.some((e) => e.tipo === 'SEQUENZA') && i.punteggio !== false
  );

  const chiavi = new Set<string>();
  const mysteries = new Set<string>();
  let bonusInterazioni = 0;
  for (const i of scored) {
    const chiave = typeof i.punteggio === 'string' ? i.punteggio : i.id;
    if (!chiavi.has(chiave)) {
      chiavi.add(chiave);
      bonusInterazioni += 2;
    }
    for (const e of i.effetti) {
      const id = mysteryId(e);
      if (id) mysteries.add(id);
    }
  }
  return places + bonusInterazioni + 3 * mysteries.size + 2 + 4;
}

describe('punteggio massimo', () => {
  it('il massimo calcolato dai dati vale 138', () => {
    expect(computeMax()).toBe(138);
  });

  it('il massimo mostrato nei messaggi di sistema (IT, EN) è /138', () => {
    const msgs = data('MessaggiSistema.json').filter(
      (m: { Chiave: string }) => m.Chiave === 'engine.score.breakdown'
    );
    expect(msgs.map((m: { IDLingua: number }) => m.IDLingua).sort()).toEqual([1, 2]);
    for (const m of msgs) expect(m.Messaggio).toContain('/138');
  });

  it('il massimo mostrato nel frontend è 138', () => {
    const js = readFileSync(resolve(root, 'web', 'js', 'odessa_main.js'), 'utf8');
    expect(js).toContain("'ui.stats.score', currentScore, 138");
  });
});
