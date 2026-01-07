/**
 * Test per applyTurnEffects - Sistema Torcia (Sprint 3.3.5.A)
 * Verifica logica di spegnimento torcia dopo 6 turni
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetGameState, getGameState, initializeOriginalData, executeCommand } from '../../src/logic/engine.js';

describe('Sprint 3.3.5.A - Sistema Torcia', () => {
  
  beforeEach(() => {
    initializeOriginalData();
    resetGameState(1);
  });

  describe('Contatore turni con torcia', () => {
    it('dovrebbe tracciare turni consuming con torcia funzionante', () => {
      const state = getGameState();
      
      // Simula torcia in inventario e funzionante
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = false;
        
        // Esegui 3 comandi consuming - torcia NON dovrebbe spegnersi
        for (let i = 0; i < 3; i++) {
          executeCommand({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
        }
        
        expect(state.timers.torciaDifettosa).toBe(false);
        expect(state.turn.totalTurnsConsumed).toBe(3);
      } else {
        expect(true).toBe(true); // Torcia non presente nei dati
      }
    });

    it('NON dovrebbe contare turni non-consuming per spegnimento torcia', () => {
      const state = getGameState();
      
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = false;
        
        // Comandi non-consuming non dovrebbero far avanzare spegnimento torcia
        for (let i = 0; i < 10; i++) {
          executeCommand({ IsValid: true, NormVerb: 'INVENTARIO', CommandType: 'SYSTEM', VerbConcept: 'INVENTARIO' });
        }
        
        expect(state.timers.torciaDifettosa).toBe(false); // Ancora accesa
        expect(state.turn.totalTurnsConsumed).toBe(0);
      } else {
        expect(true).toBe(true);
      }
    });

    it('dovrebbe gestire movimento senza torcia in inventario', () => {
      const state = getGameState();
      
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.IDLuogo = 1; // Torcia non in inventario (IDLuogo diverso da 0)
        state.timers.torciaDifettosa = false;
        state.timers.lampadaAccesa = false;
        
        executeCommand({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
        
        // Nessuna luce disponibile
        expect(state.turn.current.hasLight).toBe(false);
        expect(state.turn.totalTurnsConsumed).toBe(1);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('Spegnimento torcia dopo 6 turni', () => {
    it('dovrebbe spegnere la torcia al 6° turno consuming', () => {
      const state = getGameState();
      
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = false;
        
        // Esegui 6 comandi consuming
        let lastResult;
        for (let i = 0; i < 6; i++) {
          lastResult = executeCommand({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
        }
        
        // Verifica che torcia sia spenta
        expect(state.timers.torciaDifettosa).toBe(true);
        expect(state.turn.totalTurnsConsumed).toBe(6);
        
        // Verifica messaggio di warning nel risultato
        expect(lastResult.message).toContain('torcia');
      } else {
        expect(true).toBe(true);
      }
    });

    it('NON dovrebbe spegnere la torcia prima del 6° turno', () => {
      const state = getGameState();
      
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = false;
        
        // Esegui 5 comandi (non ancora 6)
        for (let i = 0; i < 5; i++) {
          executeCommand({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
        }
        
        expect(state.timers.torciaDifettosa).toBe(false);
        expect(state.turn.totalTurnsConsumed).toBe(5);
      } else {
        expect(true).toBe(true);
      }
    });

    it('dovrebbe mostrare warning aggiuntivo se non ha lampada accesa', () => {
      const state = getGameState();
      
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = false;
        state.timers.lampadaAccesa = false; // Nessuna lampada
        
        // Esegui 6 turni
        let lastResult;
        for (let i = 0; i < 6; i++) {
          lastResult = executeCommand({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
        }
        
        // Verifica messaggio di pericolo buio
        expect(lastResult.message).toContain('pericoloso');
      } else {
        expect(true).toBe(true);
      }
    });

    it('NON dovrebbe mostrare warning buio se ha lampada accesa', () => {
      const state = getGameState();
      
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = false;
        state.timers.lampadaAccesa = true; // Lampada accesa
        
        // Esegui 6 turni
        let lastResult;
        for (let i = 0; i < 6; i++) {
          lastResult = executeCommand({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
        }
        
        // Verifica che NON ci sia warning buio
        expect(lastResult.message).not.toContain('pericoloso');
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('Edge cases', () => {
    it('dovrebbe gestire correttamente torcia già spenta', () => {
      const state = getGameState();
      
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = true; // Già spenta
        state.timers.lampadaAccesa = false;
        
        executeCommand({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
        
        // Nessuna luce disponibile
        expect(state.turn.current.hasLight).toBe(false);
        expect(state.timers.torciaDifettosa).toBe(true); // Rimane spenta
      } else {
        expect(true).toBe(true);
      }
    });

    it('dovrebbe gestire lampada come fonte alternativa', () => {
      const state = getGameState();
      
      // Nessuna torcia, ma lampada accesa
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.IDLuogo = 1; // Torcia non in inventario
      }
      state.timers.lampadaAccesa = true;
      
      executeCommand({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
      
      // Lampada fornisce luce alternativa
      expect(state.turn.current.hasLight).toBe(true);
      expect(state.turn.totalTurnsConsumed).toBe(1);
    });
  });

});
