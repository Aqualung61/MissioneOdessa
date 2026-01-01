/**
 * Test per § 3.2.1 - Fondamenta Punteggio
 * Verifica sistema base luoghi + interazioni
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { resetGameState, getGameState, setCurrentLocation, executeCommand, initializeOriginalData } from '../src/logic/engine.js';
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

describe('Sprint 3.2.1 - Sistema Punteggio Base', () => {
  beforeAll(() => {
    // Carica dati JSON in global.odessaData
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
      Interazioni
    };
    initializeOriginalData();
  });

  beforeEach(() => {
    resetGameState(1); // Lingua italiana
  });

  it('Punteggio inizia a 1 (luogo iniziale ID=1 già visitato)', () => {
    const state = getGameState();
    expect(state.punteggio.totale).toBe(1);
    expect(state.visitedPlaces.has(1)).toBe(true);
    expect(state.visitedPlaces.size).toBe(1);
  });

  it('Visitare nuovo luogo assegna +1 punto', () => {
    const stateBefore = getGameState();
    expect(stateBefore.punteggio.totale).toBe(1);
    
    // Cambia luogo a ID=2
    setCurrentLocation(2);
    
    const stateAfter = getGameState();
    expect(stateAfter.currentLocationId).toBe(2);
    expect(stateAfter.visitedPlaces.has(2)).toBe(true);
    expect(stateAfter.visitedPlaces.size).toBe(2);
    expect(stateAfter.punteggio.totale).toBe(2); // +1 per luogo 2
  });

  it('Rivisitare luogo già visitato NON assegna punti', () => {
    // Visita luogo 2
    setCurrentLocation(2);
    expect(getGameState().punteggio.totale).toBe(2);
    
    // Torna a luogo 1
    setCurrentLocation(1);
    expect(getGameState().punteggio.totale).toBe(2); // Nessun incremento
    
    // Torna a luogo 2
    setCurrentLocation(2);
    expect(getGameState().punteggio.totale).toBe(2); // Nessun incremento
  });

  it('Visitare 3 luoghi nuovi assegna +3 punti totali', () => {
    setCurrentLocation(2);
    setCurrentLocation(3);
    setCurrentLocation(4);
    
    const state = getGameState();
    expect(state.visitedPlaces.size).toBe(4); // 1, 2, 3, 4
    expect(state.punteggio.totale).toBe(4); // 1 iniziale + 3 nuovi
  });

  it.skip('Eseguire interazione (sposta_quadro_24) assegna +2 punti', () => {
    // Setup: vai al luogo 24
    setCurrentLocation(24);
    const punteggioBefore = getGameState().punteggio.totale;
    
    // Esegui interazione SPOSTA QUADRO
    const result = executeCommand({
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'SPOSTARE',
      Noun: 'QUADRO',
      Error: null
    });
    
    expect(result.accepted).toBe(true);
    
    const state = getGameState();
    expect(state.punteggio.interazioniPunteggio.has('sposta_quadro_24')).toBe(true);
    expect(state.punteggio.totale).toBe(punteggioBefore + 2); // +2 per interazione
  });

  it('Rieseguire stessa interazione NON assegna +2 aggiuntivi', () => {
    setCurrentLocation(24);
    
    // Prima esecuzione
    executeCommand({
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'SPOSTARE',
      Noun: 'QUADRO',
      Error: null
    });
    
    const punteggioAfterFirst = getGameState().punteggio.totale;
    
    // Seconda esecuzione (non ripetibile, ma test logica punteggio)
    executeCommand({
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'SPOSTARE',
      Noun: 'QUADRO',
      Error: null
    });
    
    const punteggioAfterSecond = getGameState().punteggio.totale;
    expect(punteggioAfterSecond).toBe(punteggioAfterFirst); // Nessun incremento
  });

  it.skip('Eseguire interazione ripetibile (esamina_botola_57) assegna +2 solo prima volta', () => {
    // Setup: vai a luogo 57 e fai prerequisiti
    setCurrentLocation(57);
    
    // Simula carica_pesa (prerequisito per botola)
    const state = getGameState();
    const peso = state.Oggetti.find(o => o.ID === 26);
    if (peso) {
      peso.IDLuogo = 0; // Metti in inventario
      peso.Attivo = 3;
    }
    
    // Esegui carica pesa prima
    executeCommand({
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'CARICARE',
      Noun: 'PESA',
      Error: null
    });
    
    const punteggioBeforeBotola = getGameState().punteggio.totale;
    
    // Prima esecuzione esamina botola (ripetibile)
    const result1 = executeCommand({
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'ESAMINARE',
      Noun: 'BOTOLA',
      Error: null
    });
    
    expect(result1.accepted).toBe(true);
    const punteggioAfterFirst = getGameState().punteggio.totale;
    expect(punteggioAfterFirst).toBe(punteggioBeforeBotola + 2); // +2 prima volta
    
    // Seconda esecuzione (ripetibile = può essere eseguita, ma NO +2)
    const result2 = executeCommand({
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'ESAMINARE',
      Noun: 'BOTOLA',
      Error: null
    });
    
    expect(result2.accepted).toBe(true);
    const punteggioAfterSecond = getGameState().punteggio.totale;
    expect(punteggioAfterSecond).toBe(punteggioAfterFirst); // NO +2 seconda volta
  });

  it.skip('Punteggio persiste in salva/carica', () => {
    // Setup stato con punteggio
    setCurrentLocation(2);
    setCurrentLocation(3);
    setCurrentLocation(24);
    
    executeCommand({
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'SPOSTARE',
      Noun: 'QUADRO',
      Error: null
    });
    
    const stateBefore = getGameState();
    const punteggioExpected = stateBefore.punteggio.totale;
    
    // Salva
    const result = executeCommand({
      IsValid: true,
      CommandType: 'SYSTEM',
      Concept: 'Concetto: Salva Partita',
      CanonicalVerb: 'SALVARE',
      Error: null
    });
    
    expect(result.saveData).toBeDefined();
    expect(result.saveData.punteggio).toBeDefined();
    expect(result.saveData.punteggio.totale).toBe(punteggioExpected);
    expect(Array.isArray(result.saveData.punteggio.interazioniPunteggio)).toBe(true);
  });
});
