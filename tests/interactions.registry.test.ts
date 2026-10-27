/**
 * Test di coerenza dei registri delle interazioni (#63).
 * Specifica: `docs/20261020 - TD Lotto 4b Interazioni - v1.0.md`, §5.1.
 *
 * 1. Chiavi di `odessaGame.prerequisiteTypes` = `PREREQUISITE_TYPES` (entrambe le direzioni).
 * 2. Chiavi di `odessaGame.effectTypes` = `EFFECT_TYPES` (entrambe le direzioni).
 * 3. Ogni voce dei due registri è una funzione.
 * 4. `rules.toggleResponseVerbs` contiene il verbo di ogni interazione dei dati con un
 *    effetto TOGGLE_DIREZIONE.
 * 5. Un tipo che coincide con una proprietà ereditata (es. "toString") non è nel registro:
 *    prerequisito fallito ed effetto ignorato, con l'avviso (come con il Set dello schema).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { odessaGame } from '../src/game/odessa/index.js';
import { PREREQUISITE_TYPES, EFFECT_TYPES } from '../src/logic/interactionSchema.js';
import { verificaPrerequisiti, applicaEffetti } from '../src/logic/core/interactions.js';
import Interazioni from '../src/data-internal/Interazioni.json';

type Effetto = { tipo: string };
type Interazione = { id: string; trigger: { verbo: string }; effetti: Effetto[] };

// Contesto minimo: il ciclo generico consulta solo il gioco e, per i misteri, lo stato.
function minimalCtx() {
  return {
    state: { punteggio: { totale: 0, misteriRisolti: new Set<string>() } },
    game: odessaGame,
    msg: (key: string) => key,
    helpers: {},
  };
}

describe('Registri delle interazioni (#63)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. i tipi di prerequisito del registro coincidono con quelli dello schema, in entrambe le direzioni', () => {
    const registro = Object.keys(odessaGame.prerequisiteTypes);
    const schema = [...PREREQUISITE_TYPES];
    expect(registro.filter((t) => !PREREQUISITE_TYPES.has(t)), 'nel registro ma non nello schema').toEqual([]);
    expect(schema.filter((t) => !Object.hasOwn(odessaGame.prerequisiteTypes, t)), 'nello schema ma non nel registro').toEqual([]);
    expect([...registro].sort()).toEqual([...schema].sort());
  });

  it('2. i tipi di effetto del registro coincidono con quelli dello schema, in entrambe le direzioni', () => {
    const registro = Object.keys(odessaGame.effectTypes);
    const schema = [...EFFECT_TYPES];
    expect(registro.filter((t) => !EFFECT_TYPES.has(t)), 'nel registro ma non nello schema').toEqual([]);
    expect(schema.filter((t) => !Object.hasOwn(odessaGame.effectTypes, t)), 'nello schema ma non nel registro').toEqual([]);
    expect([...registro].sort()).toEqual([...schema].sort());
  });

  it('3. ogni voce dei registri è una funzione', () => {
    for (const [tipo, fn] of Object.entries(odessaGame.prerequisiteTypes)) {
      expect(typeof fn, `prerequisito ${tipo}`).toBe('function');
    }
    for (const [tipo, fn] of Object.entries(odessaGame.effectTypes)) {
      expect(typeof fn, `effetto ${tipo}`).toBe('function');
    }
  });

  it('4. ogni interazione con TOGGLE_DIREZIONE ha un verbo con risposta di apertura/chiusura', () => {
    const conToggle = (Interazioni as Interazione[]).filter((i) =>
      (i.effetti || []).some((e) => e.tipo === 'TOGGLE_DIREZIONE')
    );
    expect(conToggle.length).toBeGreaterThan(0);
    for (const i of conToggle) {
      expect(odessaGame.rules.toggleResponseVerbs.has(i.trigger.verbo), `${i.id}: verbo ${i.trigger.verbo}`).toBe(true);
    }
  });

  describe('5. tipi che coincidono con proprietà ereditate (Object.hasOwn)', () => {
    for (const tipo of ['toString', 'constructor']) {
      it(`prerequisito "${tipo}": fallito, con l'avviso`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const req = { tipo };
        const esito = verificaPrerequisiti([req], minimalCtx());
        expect(esito).toEqual({ ok: false, prerequisito: req });
        expect(warn).toHaveBeenCalledWith(`[engine] prerequisito di tipo sconosciuto in Interazioni.json: ${tipo}`);
      });

      it(`effetto "${tipo}": ignorato, con l'avviso e senza punti`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const ctx = minimalCtx();
        const extra = applicaEffetti([{ tipo }], undefined, {}, ctx);
        expect(extra).toEqual([]);
        expect(ctx.state.punteggio.totale).toBe(0);
        expect(warn).toHaveBeenCalledWith(`[engine] effetto di tipo sconosciuto in Interazioni.json: ${tipo}`);
      });
    }
  });
});
