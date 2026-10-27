/**
 * Toggle di direzione in `getDirezioniLuogo` (#63, emendamento E-7).
 * Specifica: `docs/20261021 - TD Lotto 5 Effetti di turno, route e ESLint - v1.2.md`, §11.2.
 *
 * Fedeltà al comportamento di riferimento: con il toggle aperto e l'interazione `TOGGLE_DIREZIONE`
 * trovata, la direzione riceve `effetto.destinazione` **anche se assente** (`undefined`); con
 * l'interazione assente la direzione resta quella del luogo; con il toggle chiuso vale 0.
 * `toggleDestination` restituisce l'effetto trovato o `null`.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { initOdessa } from '../src/initOdessa.js';
import { getGameData } from '../src/logic/core/gameData.js';
import { getDirezioniLuogo, toggleDestination } from '../src/logic/core/location.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

describe('Toggle di direzione (E-7)', () => {
  let original: Json;

  beforeAll(async () => {
    const quiet = console.log;
    console.log = () => undefined;
    try {
      await initOdessa();
    } finally {
      console.log = quiet;
    }
    original = getGameData();
  });

  afterEach(() => {
    global.odessaData = original;
  });

  const engineWithToggle = (key: string, isOpen: boolean): Json => ({
    state: { currentLingua: 1, direzioniSbloccate: {}, direzioniToggle: { [key]: isOpen } },
  });

  const withInteractions = (transform: (all: Json[]) => Json[]) => {
    global.odessaData = { ...original, Interazioni: transform(JSON.parse(JSON.stringify(original.Interazioni))) };
  };

  const luogo44 = () => original.Luoghi.find((l: Json) => l.ID === 44 && l.IDLingua === 1);

  it('toggle aperto con interazione trovata: la direzione riceve la destinazione dell\'effetto', () => {
    expect(getDirezioniLuogo(engineWithToggle('44_Est', true), 44).Est).toBe(45);
  });

  it('toggle chiuso: la direzione vale 0', () => {
    expect(getDirezioniLuogo(engineWithToggle('44_Est', false), 44).Est).toBe(0);
  });

  it('interazione trovata ma senza destinazione: la direzione diventa undefined, come prima', () => {
    withInteractions((all) => {
      for (const i of all) {
        for (const e of i.effetti || []) {
          if (e.tipo === 'TOGGLE_DIREZIONE' && e.luogo === 44 && e.direzione === 'Est') delete e.destinazione;
        }
      }
      return all;
    });
    const direzioni = getDirezioniLuogo(engineWithToggle('44_Est', true), 44);
    expect('Est' in direzioni).toBe(true);
    expect(direzioni.Est).toBeUndefined();
  });

  it('interazione assente: la direzione resta quella del luogo', () => {
    withInteractions(() => []);
    expect(getDirezioniLuogo(engineWithToggle('44_Est', true), 44).Est).toBe(luogo44().Est);
  });

  it('toggleDestination: restituisce l\'effetto trovato oppure null', () => {
    const effetto = toggleDestination(original, 1, 44, 'Est');
    expect(effetto).toMatchObject({ tipo: 'TOGGLE_DIREZIONE', luogo: 44, direzione: 'Est', destinazione: 45 });
    expect(toggleDestination(original, 1, 44, 'Nord')).toBeNull();
    expect(toggleDestination({}, 1, 44, 'Est')).toBeNull();
  });
});
