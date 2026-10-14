/**
 * Test Unit per i prerequisiti delle interazioni (#93)
 * FLAG_FALSE, risposte dedicate, fallback all'interazione successiva, tipi sconosciuti.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import {
  executeCommand,
  getGameState,
  initializeOriginalData,
  resetGameState,
  setCurrentLocation,
} from '../../src/logic/engine.js';
import { ensureVocabulary, parseCommand } from '../../src/logic/parser.js';

import Interazioni from '../../src/data-internal/Interazioni.json';
import Introduzione from '../../src/data-internal/Introduzione.json';
import LessicoSoftware from '../../src/data-internal/LessicoSoftware.json';
import Lingue from '../../src/data-internal/Lingue.json';
import Luoghi from '../../src/data-internal/Luoghi.json';
import LuoghiLogici from '../../src/data-internal/LuoghiLogici.json';
import MessaggiSistema from '../../src/data-internal/MessaggiSistema.json';
import Oggetti from '../../src/data-internal/Oggetti.json';
import Piattaforme from '../../src/data-internal/Piattaforme.json';
import Software from '../../src/data-internal/Software.json';
import TerminiLessico from '../../src/data-internal/TerminiLessico.json';
import TipiLessico from '../../src/data-internal/TipiLessico.json';
import VociLessico from '../../src/data-internal/VociLessico.json';

async function run(input: string) {
  const parsed = await parseCommand(null, input, getGameState());
  expect(parsed.IsValid).toBe(true);
  return executeCommand(parsed) as { accepted: boolean; message: string };
}

type Oggetto = { Oggetto: string; IDLuogo: number; Attivo: number };

function findObject(name: string): Oggetto {
  return getGameState().Oggetti.find((o: Oggetto) => o.Oggetto === name);
}

function giveInventory(name: string) {
  const obj = findObject(name);
  obj.IDLuogo = 0;
  obj.Attivo = 3;
}

describe('Prerequisiti delle interazioni (#93)', () => {
  beforeAll(async () => {
    global.odessaData = {
      Interazioni,
      Introduzione,
      LessicoSoftware,
      Lingue,
      Luoghi,
      LuoghiLogici,
      MessaggiSistema,
      Oggetti,
      Piattaforme,
      Software,
      TerminiLessico,
      TipiLessico,
      VociLessico,
    };
    initializeOriginalData();
    await ensureVocabulary();
  });

  beforeEach(() => {
    resetGameState(1);
  });

  describe('accendi lampada (IT)', () => {
    it('TB-01: lampada assente -> "Non hai la lampada."', async () => {
      const scoreBefore = getGameState().punteggio.totale;
      const res = await run('accendi lampada');
      expect(res.message).toBe('Non hai la lampada.');
      expect(getGameState().timers.lampadaAccesa).toBeFalsy();
      expect(getGameState().punteggio.totale).toBe(scoreBefore);
      expect(getGameState().interazioniEseguite).not.toContain('accendi_lampada');
    });

    it('TB-02: fiammiferi assenti -> messaggio dedicato', async () => {
      giveInventory('Lampada');
      findObject('Fiammiferi').IDLuogo = 1;

      const res = await run('accendi lampada');
      expect(res.message).toBe('Non hai i fiammiferi per accendere la lampada.');
      expect(getGameState().timers.lampadaAccesa).toBeFalsy();
    });

    it('TB-03: successo -> lampada accesa, +2 punti', async () => {
      giveInventory('Lampada');
      const scoreBefore = getGameState().punteggio.totale;

      const res = await run('accendi lampada');
      expect(res.message).toContain('Accendi la lampada con i fiammiferi');
      expect(getGameState().timers.lampadaAccesa).toBe(true);
      expect(getGameState().punteggio.totale).toBe(scoreBefore + 2);
    });

    it('TB-04: già accesa dopo il successo -> risposta_gia_eseguita', async () => {
      giveInventory('Lampada');

      await run('accendi lampada');
      const res = await run('accendi lampada');
      expect(res.message).toBe('La lampada è già accesa.');
    });

    it('TB-06: FLAG_FALSE impostato a mano -> risposta del prerequisito', async () => {
      giveInventory('Lampada');
      getGameState().timers.lampadaAccesa = true;

      const res = await run('accendi lampada');
      expect(res.message).toBe('La lampada è già accesa.');
      expect(getGameState().interazioniEseguite).not.toContain('accendi_lampada');
    });
  });

  describe('accendi lampada (EN)', () => {
    beforeEach(() => {
      resetGameState(2);
    });

    it('TB-11: lampada assente -> messaggio EN', async () => {
      const res = await run('light lamp');
      expect(res.message).toBe("You don't have the lamp.");
    });

    it('TB-11: fiammiferi assenti -> messaggio EN', async () => {
      giveInventory('Lamp');
      findObject('Matches').IDLuogo = 1;

      const res = await run('light lamp');
      expect(res.message).toBe("You don't have any matches to light the lamp.");
    });
  });

  describe('fallback senza risposta dedicata', () => {
    it("TB-05: prerequisito fallito senza risposta passa all'interazione successiva", async () => {
      setCurrentLocation(24);
      getGameState().sequenze.cassaforte_24 = { pattern: [], progressione: [], completata: true };
      expect(findObject('Medaglione').Attivo).toBe(0);

      const res = await run('esamina cassaforte');
      expect(res.message).toContain("vedi all'interno un medaglione");
      expect(findObject('Medaglione').Attivo).toBe(3);
    });
  });

  describe('tipi sconosciuti', () => {
    it('AC-4: un prerequisito di tipo sconosciuto non è soddisfatto, senza eccezioni', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const original = global.odessaData.Interazioni;
      try {
        global.odessaData.Interazioni = [
          {
            id: 'test_tipo_sconosciuto',
            IDLingua: 1,
            trigger: { verbo: 'ACCENDERE', oggetto: 'LAMPADA' },
            condizioni: { luogo: null, prerequisiti: [{ tipo: 'TIPO_INESISTENTE', target: 'x' }] },
            risposta: 'NON DEVE COMPARIRE',
            effetti: [],
            ripetibile: true,
          },
          ...original,
        ];

        // Il prerequisito sconosciuto fallisce e, senza risposta, si passa a accendi_lampada.
        const res = await run('accendi lampada');
        expect(res.message).toBe('Non hai la lampada.');
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain('TIPO_INESISTENTE');

        // Una sola segnalazione per tipo.
        await run('accendi lampada');
        expect(warn).toHaveBeenCalledTimes(1);
      } finally {
        global.odessaData.Interazioni = original;
        warn.mockRestore();
      }
    });
  });
});
