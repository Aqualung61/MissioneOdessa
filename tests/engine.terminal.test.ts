import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { resetGameState, getGameStateSnapshot, enterLocation, confirmRestart, initializeOriginalData } from '../src/logic/engine.js';
import Introduzione from '../src/data-internal/Introduzione.json';
import LessicoSoftware from '../src/data-internal/LessicoSoftware.json';
import Lingue from '../src/data-internal/Lingue.json';
import Luoghi from '../src/data-internal/Luoghi.json';
import LuoghiLogici from '../src/data-internal/LuoghiLogici.json';
import Oggetti from '../src/data-internal/Oggetti.json';
import Piattaforme from '../src/data-internal/Piattaforme.json';
import Software from '../src/data-internal/Software.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';
import VociLessico from '../src/data-internal/VociLessico.json';

describe('Engine - luoghi terminali', () => {
  beforeAll(async () => {
    // Carica dati JSON in global.odessaData per simulare initOdessa
    global.odessaData = {
      Introduzione,
      LessicoSoftware,
      Lingue,
      Luoghi,
      LuoghiLogici,
      Oggetti,
      Piattaforme,
      Software,
      TerminiLessico,
      TipiLessico,
      VociLessico,
    };
    initializeOriginalData();
  });

  beforeEach(() => {
    resetGameState();
  });

  it('entra in luogo terminale e chiede riavvio', async () => {
    // Scegli un ID noto terminale (dal dataset: 8, 40 o 54); usiamo 8
    const res = await enterLocation(8);
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('TERMINAL');
    const snap = getGameStateSnapshot();
    expect(snap.awaitingRestart).toBe(true);
    expect(snap.currentLocationId).toBe(8);
  });

  it('riavvia con risposta positiva (S)', async () => {
    await enterLocation(8);
    const res = await confirmRestart('S');
    expect(res.accepted).toBe(true);
    expect(['OK', 'TERMINAL']).toContain(res.resultType); // se ID=1 fosse terminale, sarebbe TERMINAL
    const snap = getGameStateSnapshot();
    expect(snap.awaitingRestart).toBe(false);
    expect(snap.currentLocationId).toBe(1);
  });

  it('termina la partita con risposta negativa', async () => {
    await enterLocation(8);
    const res = await confirmRestart('NO');
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('ENDED');
    const snap = getGameStateSnapshot();
    expect(snap.ended).toBe(true);
  });

  it('accetta varianti SI e SÌ', async () => {
    await enterLocation(8);
    const res1 = await confirmRestart('SI');
    expect(res1.accepted).toBe(true);
    // Torna in attesa: porta nuovamente in terminale e prova con accento
    await enterLocation(8);
    const res2 = await confirmRestart('Sì');
    expect(res2.accepted).toBe(true);
  });
});
