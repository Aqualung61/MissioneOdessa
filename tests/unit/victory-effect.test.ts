/**
 * Test Unit per victoryEffect.js (Sprint 3.3.5.D)
 * Test isolato della sequenza Ferenc + Teleport + Vittoria
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetGameState, getGameState, initializeOriginalData } from '../../src/logic/engine.js';
import { victoryEffect } from '../../src/logic/turnEffects/victoryEffect.js';

describe('victoryEffect - Sprint 3.3.5.D', () => {
  
  beforeEach(() => {
    initializeOriginalData();
    resetGameState(1);
  });

  describe('Prerequisiti Ferenc', () => {
    it('dovrebbe verificare Luogo ID=1 (Atrio)', () => {
      const state = getGameState();
      state.currentLocationId = 2; // Luogo sbagliato
      state.turn.current.hasLight = true;
      
      // Setup oggetti prerequisito in inventario
      const fascicolo = state.Oggetti.find(o => o.ID === 16);
      const lista = state.Oggetti.find(o => o.ID === 6);
      const dossier = state.Oggetti.find(o => o.ID === 34);
      if (fascicolo) fascicolo.IDLuogo = 0;
      if (lista) lista.IDLuogo = 0;
      if (dossier) dossier.IDLuogo = 0;
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      // Non dovrebbe triggerare Ferenc se non al luogo 1
      expect(result.resultType).toBe('OK');
      expect(state.narrativeState).not.toBe('ENDING_PHASE_2_WAIT');
    });

    it('dovrebbe verificare hasLight = true', () => {
      const state = getGameState();
      state.currentLocationId = 1;
      state.turn.current.hasLight = false; // Buio!
      
      const fascicolo = state.Oggetti.find(o => o.ID === 16);
      const lista = state.Oggetti.find(o => o.ID === 6);
      const dossier = state.Oggetti.find(o => o.ID === 34);
      if (fascicolo) fascicolo.IDLuogo = 0;
      if (lista) lista.IDLuogo = 0;
      if (dossier) dossier.IDLuogo = 0;
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(result.resultType).toBe('OK');
      expect(state.narrativeState).not.toBe('ENDING_PHASE_2_WAIT');
    });

    it('dovrebbe verificare Fascicolo (ID=16) in inventario', () => {
      const state = getGameState();
      state.currentLocationId = 1;
      state.turn.current.hasLight = true;
      
      const fascicolo = state.Oggetti.find(o => o.ID === 16);
      const lista = state.Oggetti.find(o => o.ID === 6);
      const dossier = state.Oggetti.find(o => o.ID === 34);
      if (fascicolo) fascicolo.IDLuogo = 5; // Non in inventario
      if (lista) lista.IDLuogo = 0;
      if (dossier) dossier.IDLuogo = 0;
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(result.resultType).toBe('OK');
      expect(state.narrativeState).not.toBe('ENDING_PHASE_2_WAIT');
    });

    it('dovrebbe verificare Lista (ID=6) in inventario', () => {
      const state = getGameState();
      state.currentLocationId = 1;
      state.turn.current.hasLight = true;
      
      const fascicolo = state.Oggetti.find(o => o.ID === 16);
      const lista = state.Oggetti.find(o => o.ID === 6);
      const dossier = state.Oggetti.find(o => o.ID === 34);
      if (fascicolo) fascicolo.IDLuogo = 0;
      if (lista) lista.IDLuogo = 10; // Non in inventario
      if (dossier) dossier.IDLuogo = 0;
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(result.resultType).toBe('OK');
      expect(state.narrativeState).not.toBe('ENDING_PHASE_2_WAIT');
    });

    it('dovrebbe verificare Dossier (ID=34) in inventario', () => {
      const state = getGameState();
      state.currentLocationId = 1;
      state.turn.current.hasLight = true;
      
      const fascicolo = state.Oggetti.find(o => o.ID === 16);
      const lista = state.Oggetti.find(o => o.ID === 6);
      const dossier = state.Oggetti.find(o => o.ID === 34);
      if (fascicolo) fascicolo.IDLuogo = 0;
      if (lista) lista.IDLuogo = 0;
      if (dossier) dossier.IDLuogo = 15; // Non in inventario
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(result.resultType).toBe('OK');
      expect(state.narrativeState).not.toBe('ENDING_PHASE_2_WAIT');
    });

    it('NON dovrebbe triggerare senza tutti i prerequisiti', () => {
      const state = getGameState();
      state.currentLocationId = 1;
      state.turn.current.hasLight = true;
      // Non imposta oggetti in inventario
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(result.resultType).toBe('OK');
      expect(state.currentLocationId).toBe(1); // Nessun teleport
    });
  });

  describe('Sequenza Ferenc', () => {
    function setupVictoryPrerequisites(state: { currentLocationId: number; turn: { current: { hasLight: boolean; location: number } }; Oggetti: Array<{ ID: number; IDLuogo: number }> }) {
      state.currentLocationId = 1;
      state.turn.current.hasLight = true;
      state.turn.current.location = 1;
      
      const fascicolo = state.Oggetti.find((o: { ID: number; IDLuogo: number }) => o.ID === 16);
      const lista = state.Oggetti.find((o: { ID: number; IDLuogo: number }) => o.ID === 6);
      const dossier = state.Oggetti.find((o: { ID: number; IDLuogo: number }) => o.ID === 34);
      if (fascicolo) fascicolo.IDLuogo = 0;
      if (lista) lista.IDLuogo = 0;
      if (dossier) dossier.IDLuogo = 0;
    }

    it('dovrebbe assegnare +4 punti per Ferenc', () => {
      const state = getGameState();
      setupVictoryPrerequisites(state);
      const punteggioBefore = state.punteggio.totale;
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      // victoryEffect assegna +4 Ferenc + +1 Luogo 59 = +5 totale
      expect(state.punteggio.totale).toBe(punteggioBefore + 5);
    });

    it('dovrebbe mostrare testo victory.phase1a (IT)', () => {
      const state = getGameState();
      state.currentLingua = 1;
      setupVictoryPrerequisites(state);
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(result.message).toBeTruthy();
      expect(result.message.length).toBeGreaterThan(50);
    });

    it('dovrebbe mostrare testo victory.phase1a (EN)', () => {
      const state = getGameState();
      state.currentLingua = 2;
      setupVictoryPrerequisites(state);
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(result.message).toBeTruthy();
      expect(result.message.length).toBeGreaterThan(50);
    });

    it('dovrebbe triggerare teleport immediato a Luogo 59', () => {
      const state = getGameState();
      setupVictoryPrerequisites(state);
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(state.currentLocationId).toBe(59);
      expect(state.turn.current.location).toBe(59);
      expect(result.resultType).toBe('TELEPORT');
      expect(result.locationId).toBe(59);
      expect(result.teleport).toBe(true);
    });
  });

  describe('Teleport e Cleanup', () => {
    function setupVictoryPrerequisites(state: { currentLocationId: number; turn: { current: { hasLight: boolean; location: number } }; Oggetti: Array<{ ID: number; IDLuogo: number }> }) {
      state.currentLocationId = 1;
      state.turn.current.hasLight = true;
      state.turn.current.location = 1;
      
      const fascicolo = state.Oggetti.find((o: { ID: number; IDLuogo: number }) => o.ID === 16);
      const lista = state.Oggetti.find((o: { ID: number; IDLuogo: number }) => o.ID === 6);
      const dossier = state.Oggetti.find((o: { ID: number; IDLuogo: number }) => o.ID === 34);
      if (fascicolo) fascicolo.IDLuogo = 0;
      if (lista) lista.IDLuogo = 0;
      if (dossier) dossier.IDLuogo = 0;
    }

    it('dovrebbe rimuovere Fascicolo (Attivo=0, IDLuogo=-1)', () => {
      const state = getGameState();
      setupVictoryPrerequisites(state);
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      const fascicolo = state.Oggetti.find((o: { ID: number; Attivo?: number; IDLuogo?: number; Inventario?: boolean }) => o.ID === 16);
      expect(fascicolo?.Attivo).toBe(0);
      expect(fascicolo?.IDLuogo).toBe(-1);
      expect(fascicolo?.Inventario).toBe(false);
    });

    it('dovrebbe rimuovere Lista (Attivo=0, IDLuogo=-1)', () => {
      const state = getGameState();
      setupVictoryPrerequisites(state);
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      const lista = state.Oggetti.find((o: { ID: number; Attivo?: number; IDLuogo?: number; Inventario?: boolean }) => o.ID === 6);
      expect(lista?.Attivo).toBe(0);
      expect(lista?.IDLuogo).toBe(-1);
      expect(lista?.Inventario).toBe(false);
    });

    it('dovrebbe rimuovere Dossier (Attivo=0, IDLuogo=-1)', () => {
      const state = getGameState();
      setupVictoryPrerequisites(state);
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      const dossier = state.Oggetti.find((o: { ID: number; Attivo?: number; IDLuogo?: number; Inventario?: boolean }) => o.ID === 34);
      expect(dossier?.Attivo).toBe(0);
      expect(dossier?.IDLuogo).toBe(-1);
      expect(dossier?.Inventario).toBe(false);
    });

    it('dovrebbe conservare Documenti (ID=35) in inventario se presenti', () => {
      const state = getGameState();
      setupVictoryPrerequisites(state);
      
      // Setup Documenti in inventario
      const documenti = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number }) => o.ID === 35);
      if (documenti) {
        documenti.IDLuogo = 0;
        documenti.Attivo = 1;
      }
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      const documentiAfter = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number }) => o.ID === 35);
      expect(documentiAfter?.IDLuogo).toBe(0); // Ancora in inventario
      expect(documentiAfter?.Attivo).toBe(1); // Ancora attivo
    });

    it('dovrebbe assegnare +1 punto per arrivo Luogo 59', () => {
      const state = getGameState();
      setupVictoryPrerequisites(state);
      const punteggioBefore = state.punteggio.totale;
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      // +4 Ferenc + +1 Luogo 59 = +5 totale
      expect(state.punteggio.totale).toBe(punteggioBefore + 5);
      expect(state.visitedPlaces.has(59)).toBe(true);
    });

    it('dovrebbe bloccare movimenti (movementBlocked=true)', () => {
      const state = getGameState();
      setupVictoryPrerequisites(state);
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(state.movementBlocked).toBe(true);
    });

    it('dovrebbe impostare narrativeState=ENDING_PHASE_2_WAIT', () => {
      const state = getGameState();
      setupVictoryPrerequisites(state);
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(state.narrativeState).toBe('ENDING_PHASE_2_WAIT');
      expect(state.narrativePhase).toBe(2);
      expect(state.awaitingContinue).toBe(false);
    });

    it('dovrebbe resettare unusefulCommandsCounter a 0', () => {
      const state = getGameState();
      setupVictoryPrerequisites(state);
      state.unusefulCommandsCounter = 5; // Imposta valore non-zero
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(state.unusefulCommandsCounter).toBe(0);
    });

    it('dovrebbe impostare result.narrativePhase nel risultato', () => {
      const state = getGameState();
      setupVictoryPrerequisites(state);
      
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(result.narrativePhase).toBe('ENDING_PHASE_2_WAIT');
    });
  });

  describe('Guard Clauses', () => {
    it('NON dovrebbe eseguire se awaitingRestart = true', () => {
      const state = getGameState();
      state.currentLocationId = 1;
      state.turn.current.hasLight = true;
      state.awaitingRestart = true; // Game over attivo
      
      const punteggioBefore = state.punteggio.totale;
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(state.punteggio.totale).toBe(punteggioBefore); // Nessun incremento
      expect(state.currentLocationId).toBe(1); // Nessun teleport
    });

    it('NON dovrebbe eseguire se ended = true', () => {
      const state = getGameState();
      state.currentLocationId = 1;
      state.turn.current.hasLight = true;
      state.ended = true; // Gioco terminato
      
      const punteggioBefore = state.punteggio.totale;
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(state.punteggio.totale).toBe(punteggioBefore);
      expect(state.currentLocationId).toBe(1);
    });

    it('NON dovrebbe eseguire se victory = true', () => {
      const state = getGameState();
      state.currentLocationId = 1;
      state.turn.current.hasLight = true;
      state.victory = true; // Già vittoria
      
      const punteggioBefore = state.punteggio.totale;
      const result = { message: '', resultType: 'OK' };
      victoryEffect(state, result, null);
      
      expect(state.punteggio.totale).toBe(punteggioBefore);
      expect(state.currentLocationId).toBe(1);
    });
  });
});

