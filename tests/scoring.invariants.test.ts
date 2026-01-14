/**
 * Sprint #58.1 — Invarianti (Issue #58)
 * Riferimento: docs/20260114_issue_58_invarianti.md
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  resetGameState,
  getGameState,
  setCurrentLocation,
  executeCommand,
  initializeOriginalData,
} from '../src/logic/engine.js';

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
import MessaggiSistema from '../src/data-internal/MessaggiSistema.json';
import Interazioni from '../src/data-internal/Interazioni.json';

function score() {
  return getGameState().punteggio.totale;
}

describe('Issue #58 — Invarianti minime (Sprint #58.1)', () => {
  beforeAll(() => {
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
      MessaggiSistema,
      Interazioni,
    };
    initializeOriginalData();
  });

  beforeEach(() => {
    resetGameState(1);
  });

  it('I58.1.A: punteggio >= 1 e non diminuisce durante partita attiva', () => {
    // Baseline
    const s0 = score();
    expect(s0).toBeGreaterThanOrEqual(1);

    // SYSTEM: non deve diminuire
    executeCommand({
      IsValid: true,
      CommandType: 'SYSTEM',
      Concept: 'Concetto: Inventario',
      CanonicalVerb: 'INVENTARIO',
      Error: null,
    });
    const s1 = score();
    expect(s1).toBeGreaterThanOrEqual(s0);

    // ACTION senza scoring esplicito: non deve diminuire
    executeCommand({
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'ESAMINARE',
      Noun: 'PAVIMENTO',
      Error: null,
    });
    const s2 = score();
    expect(s2).toBeGreaterThanOrEqual(s1);

    // NAVIGATION (via setCurrentLocation): non deve diminuire
    setCurrentLocation(2);
    const s3 = score();
    expect(s3).toBeGreaterThanOrEqual(s2);

    // Tornare indietro su luogo già visitato: non deve diminuire
    setCurrentLocation(1);
    const s4 = score();
    expect(s4).toBeGreaterThanOrEqual(s3);
  });

  it('I58.1.B: rivisitare luogo già visitato non incrementa', () => {
    expect(score()).toBe(1);

    setCurrentLocation(2);
    expect(score()).toBe(2);

    setCurrentLocation(1);
    expect(score()).toBe(2);

    setCurrentLocation(2);
    expect(score()).toBe(2);
  });
});
