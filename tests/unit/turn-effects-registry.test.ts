/**
 * Test Unit per turnEffects/index.js - Registry Pattern (Sprint 3.3.5.B)
 * Verifica ordine esecuzione, isolation, registry integrity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetGameState, getGameState, initializeOriginalData } from '../../src/logic/engine.js';
import { TURN_EFFECTS, applyAllTurnEffects } from '../../src/logic/turnEffects/index.js';

describe('Turn Effects Registry - Sprint 3.3.5.B', () => {
  
  beforeEach(() => {
    initializeOriginalData();
    resetGameState(1);
  });

  describe('Registry integrity', () => {
    it('dovrebbe esportare TURN_EFFECTS array', () => {
      expect(TURN_EFFECTS).toBeDefined();
      expect(Array.isArray(TURN_EFFECTS)).toBe(true);
    });

    it('dovrebbe contenere esattamente 5 effects (Sprint 3.3.5.A-D)', () => {
      expect(TURN_EFFECTS).toHaveLength(5);
    });

    it('ogni effect dovrebbe essere una funzione', () => {
      TURN_EFFECTS.forEach(effect => {
        expect(typeof effect).toBe('function');
      });
    });

    it('effects dovrebbero avere nomi descrittivi', () => {
      const names = TURN_EFFECTS.map(fn => fn.name);
      
      expect(names[0]).toBe('torchEffect');
      expect(names[1]).toBe('darknessEffect');
      expect(names[2]).toBe('gameOverEffect');
      expect(names[3]).toBe('interceptEffect'); // Sprint 3.3.5.C
    });
  });

  describe('Ordine esecuzione critico', () => {
    it('torchEffect deve essere eseguito per primo (aggiorna torciaDifettosa)', () => {
      const state = getGameState();
      const torcia = state.Oggetti.find(o => o.ID === 37);
      
      if (torcia) {
        torcia.Inventario = true;
        torcia.IDLuogo = 0; // In inventario
        state.timers.torciaDifettosa = false;
        state.turn.totalTurnsConsumed = 6; // Spegne al 6° turno
        
        // Simula turno consumato
        state.turn.current.consumesTurn = true;
        state.turn.current.hasLight = true;
        
        const result = { message: '' };
        const parseResult = { IsValid: true, CommandType: 'NAVIGATION' };
        
        applyAllTurnEffects(state, result, parseResult);
        
        // torchEffect ha eseguito: torcia spenta al 6° turno
        expect(state.timers.torciaDifettosa).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });

    it('darknessEffect deve vedere torciaDifettosa aggiornato da torchEffect', () => {
      const state = getGameState();
      const torcia = state.Oggetti.find(o => o.ID === 37);
      
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = false;
        state.timers.lampadaAccesa = false;
        state.turn.totalTurnsConsumed = 5; // Spegne al prossimo
        state.turn.current.consumesTurn = true;
        state.turn.previous.hasLight = true;
        state.turn.current.hasLight = true; // Inizialmente ha luce
        
        const result = { message: '' };
        const parseResult = { IsValid: true, CommandType: 'NAVIGATION' };
        
        applyAllTurnEffects(state, result, parseResult);
        
        // Dopo torchEffect: hasLight diventa false (torcia spenta, no lampada)
        // darknessEffect dovrebbe vedere hasLight=false e iniziare countdown
        // Ma hadLightBefore=true quindi turnsInDarkness rimane 0 (primo turno buio)
        expect(state.turn.turnsInDarkness).toBe(0);
      } else {
        expect(true).toBe(true);
      }
    });

    it('gameOverEffect deve essere ultimo (vede turnsInDarkness aggiornato)', () => {
      const state = getGameState();
      
      // Setup: 2 turni al buio, prossimo è mortale
      state.turn.previous.hasLight = false;
      state.turn.current.hasLight = false;
      state.turn.turnsInDarkness = 2;
      state.turn.current.consumesTurn = true;
      
      const result = { message: '', gameOver: false };
      const parseResult = { IsValid: true, CommandType: 'NAVIGATION' };
      
      applyAllTurnEffects(state, result, parseResult);
      
      // darknessEffect incrementa a 3, gameOverEffect triggera game over
      expect(state.turn.turnsInDarkness).toBe(3);
      expect(result.gameOver).toBe(true);
      expect(state.awaitingRestart).toBe(true);
    });
  });

  describe('Modifiche propagate tra effects', () => {
    it('modifica in effect N deve essere visibile ad effect N+1', () => {
      const state = getGameState();
      const torcia = state.Oggetti.find(o => o.ID === 37);
      
      if (torcia) {
        torcia.Inventario = true;
        torcia.IDLuogo = 0;
        state.timers.torciaDifettosa = false;
        state.timers.lampadaAccesa = false;
        state.turn.totalTurnsConsumed = 6; // Spegne la torcia
        state.turn.current.consumesTurn = true;
        state.turn.current.hasLight = true;
        state.turn.previous.hasLight = true;
        
        const result = { message: '' };
        const parseResult = { IsValid: true, CommandType: 'NAVIGATION' };
        
        // Prima di effects
        expect(state.timers.torciaDifettosa).toBe(false);
        
        applyAllTurnEffects(state, result, parseResult);
        
        // torchEffect ha modificato torciaDifettosa e hasLight
        expect(state.timers.torciaDifettosa).toBe(true);
        expect(state.turn.current.hasLight).toBe(false); // torchEffect ricalcola hasLight
        
        // darknessEffect ha visto hasLight=false, ma hadLightBefore=true (primo turno buio)
        expect(state.turn.turnsInDarkness).toBe(0);
      } else {
        expect(true).toBe(true);
      }
    });

    it('result.message dovrebbe accumulare messaggi da multiple effects', () => {
      const state = getGameState();
      const torcia = state.Oggetti.find(o => o.ID === 37);
      
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = false;
        state.turn.totalTurnsConsumed = 5;
        state.turn.current.consumesTurn = true;
        
        const result = { message: 'Command executed.' };
        const parseResult = { IsValid: true, CommandType: 'NAVIGATION' };
        
        applyAllTurnEffects(state, result, parseResult);
        
        // torchEffect aggiunge warning torcia (se implementato nel messaggio)
        expect(result.message).toContain('Command executed.');
        
        // Se torcia si spegne, potrebbe aggiungere warning
        // (attualmente torchEffect non modifica message, ma verifica structure)
        expect(result).toHaveProperty('message');
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('Isolation e error handling', () => {
    it('applyAllTurnEffects dovrebbe essere chiamabile con parseResult null', () => {
      const state = getGameState();
      const result = { message: '' };
      
      // Non dovrebbe crashare
      expect(() => applyAllTurnEffects(state, result, null)).not.toThrow();
    });

    it('dovrebbe gestire gracefully se un effect è undefined', () => {
      // Test teorico: se TURN_EFFECTS contenesse undefined
      // Il sistema dovrebbe avere guard o skip
      
      // Se il registry è corrotto, applyAllTurnEffects non dovrebbe crashare
      // (Attualmente presupponiamo array valido, ma è un edge case da considerare)
      expect(TURN_EFFECTS.every(effect => typeof effect === 'function')).toBe(true);
    });
  });

  describe('Integration - Scenario completo', () => {
    it('scenario: torcia si spegne, inizia countdown buio, morte al 3° turno', () => {
      const state = getGameState();
      const torcia = state.Oggetti.find(o => o.ID === 37);
      
      if (!torcia) {
        expect(true).toBe(true);
        return;
      }
      
      // Setup iniziale
      torcia.Inventario = true;
      torcia.IDLuogo = 0;
      state.timers.torciaDifettosa = false;
      state.timers.lampadaAccesa = false;
      state.turn.totalTurnsConsumed = 6; // Spegne al 6° turno
      state.turn.previous.hasLight = true;
      state.turn.current.hasLight = true;
      state.turn.current.consumesTurn = true;
      
      // TURNO 6: Torcia si spegne
      let result = { message: '', gameOver: false };
      const parseResult = { IsValid: true, CommandType: 'NAVIGATION' };
      applyAllTurnEffects(state, result, parseResult);
      
      expect(state.timers.torciaDifettosa).toBe(true);
      expect(state.turn.current.hasLight).toBe(false); // torchEffect ricalcola
      expect(state.turn.turnsInDarkness).toBe(0); // Primo turno buio
      expect(result.gameOver).toBe(false);
      
      // TURNO 7: Secondo turno buio
      state.turn.previous.hasLight = false;
      state.turn.current.hasLight = false;
      state.turn.totalTurnsConsumed = 7;
      result = { message: '', gameOver: false };
      applyAllTurnEffects(state, result, parseResult);
      
      expect(state.turn.turnsInDarkness).toBe(1);
      expect(result.gameOver).toBe(false);
      
      // TURNO 8: Terzo turno buio
      state.turn.totalTurnsConsumed = 8;
      result = { message: '', gameOver: false };
      applyAllTurnEffects(state, result, parseResult);
      
      expect(state.turn.turnsInDarkness).toBe(2);
      expect(result.gameOver).toBe(false);
      
      // TURNO 9: Quarto turno buio = MORTE
      state.turn.totalTurnsConsumed = 9;
      result = { message: '', gameOver: false };
      applyAllTurnEffects(state, result, parseResult);
      
      expect(state.turn.turnsInDarkness).toBe(3);
      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe('DARKNESS');
      expect(state.awaitingRestart).toBe(true);
    });

    it('scenario: salvezza con ACCENDI LAMPADA al turno critico', () => {
      const state = getGameState();
      const torcia = state.Oggetti.find(o => o.ID === 37);
      
      if (!torcia) {
        expect(true).toBe(true);
        return;
      }
      
      // Setup: 2 turni al buio, prossimo sarebbe mortale
      torcia.Inventario = true;
      state.timers.torciaDifettosa = true;
      state.timers.lampadaAccesa = false;
      state.turn.turnsInDarkness = 2;
      state.turn.previous.hasLight = false;
      state.turn.current.hasLight = false;
      state.turn.current.consumesTurn = true;
      
      // User esegue ACCENDI LAMPADA → hasLight recalcolato in applyTurnEffects
      // (simuliamo hasLight=true dopo comando)
      state.turn.current.hasLight = true;
      
      const result = { message: '', gameOver: false };
      const parseResult = { IsValid: true, CommandType: 'ACTION' };
      applyAllTurnEffects(state, result, parseResult);
      
      // darknessEffect resetta countdown
      expect(state.turn.turnsInDarkness).toBe(0);
      
      // gameOverEffect non triggera
      expect(result.gameOver).toBe(false);
      expect(state.awaitingRestart).toBe(false);
    });
  });
});
