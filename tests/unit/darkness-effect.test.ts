/**
 * Test Unit per darknessEffect.js (Sprint 3.3.5.B)
 * Test isolato del middleware darkness countdown
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetGameState, getGameState, initializeOriginalData } from '../../src/logic/engine.js';
import { darknessEffect } from '../../src/logic/turnEffects/darknessEffect.js';

describe('darknessEffect - Sprint 3.3.5.B', () => {
  
  beforeEach(() => {
    initializeOriginalData();
    resetGameState(1);
  });

  describe('Incremento turnsInDarkness', () => {
    it('NON dovrebbe incrementare al primo turno senza luce (hadLightBefore=true)', () => {
      const state = getGameState();
      
      // Setup: aveva luce prima, ora no
      state.turn.previous.hasLight = true;
      state.turn.current.hasLight = false;
      state.turn.turnsInDarkness = 0;
      
      const result = { message: '' };
      darknessEffect(state, result, null);
      
      // Non incrementa al primo turno buio
      expect(state.turn.turnsInDarkness).toBe(0);
    });

    it('dovrebbe incrementare dal secondo turno senza luce (hadLightBefore=false)', () => {
      const state = getGameState();
      
      // Setup: già al buio turno precedente
      state.turn.previous.hasLight = false;
      state.turn.current.hasLight = false;
      state.turn.turnsInDarkness = 0;
      
      const result = { message: '' };
      darknessEffect(state, result, null);
      
      // Incrementa dal secondo turno
      expect(state.turn.turnsInDarkness).toBe(1);
    });

    it('dovrebbe dare esattamente 3 turni pieni prima della morte', () => {
      const state = getGameState();
      
      // Turno 1 (primo buio): previous=luce, current=buio
      state.turn.previous.hasLight = true;
      state.turn.current.hasLight = false;
      state.turn.turnsInDarkness = 0;
      darknessEffect(state, { message: '' }, null);
      expect(state.turn.turnsInDarkness).toBe(0); // Non incrementa
      
      // Turno 2: previous=buio, current=buio
      state.turn.previous.hasLight = false;
      state.turn.current.hasLight = false;
      darknessEffect(state, { message: '' }, null);
      expect(state.turn.turnsInDarkness).toBe(1);
      
      // Turno 3: previous=buio, current=buio
      darknessEffect(state, { message: '' }, null);
      expect(state.turn.turnsInDarkness).toBe(2);
      
      // Turno 4: previous=buio, current=buio → morte a 3
      darknessEffect(state, { message: '' }, null);
      expect(state.turn.turnsInDarkness).toBe(3); // Morte (gestita da gameOverEffect)
    });
  });

  describe('Reset countdown quando recupera luce', () => {
    it('dovrebbe resettare turnsInDarkness quando hasLight diventa true', () => {
      const state = getGameState();
      
      // Setup: al buio da 2 turni
      state.turn.previous.hasLight = false;
      state.turn.current.hasLight = false;
      state.turn.turnsInDarkness = 2;
      
      // Recupera luce
      state.turn.current.hasLight = true;
      
      const result = { message: '' };
      darknessEffect(state, result, null);
      
      // Reset countdown
      expect(state.turn.turnsInDarkness).toBe(0);
    });

    it('dovrebbe salvare con ACCENDI LAMPADA al turno 3 (prima della morte)', () => {
      const state = getGameState();
      
      // Setup: 2 turni al buio, prossimo sarebbe mortale
      state.turn.previous.hasLight = false;
      state.turn.current.hasLight = false;
      state.turn.turnsInDarkness = 2;
      
      // ACCENDI LAMPADA eseguito → hasLight recalcolato in applyTurnEffects
      state.turn.current.hasLight = true;
      
      const result = { message: '' };
      darknessEffect(state, result, null);
      
      // Salvato! Counter resettato
      expect(state.turn.turnsInDarkness).toBe(0);
    });
  });

  describe('Pass-through behavior', () => {
    it('NON dovrebbe modificare result.message', () => {
      const state = getGameState();
      state.turn.previous.hasLight = false;
      state.turn.current.hasLight = false;
      state.turn.turnsInDarkness = 1;
      
      const result = { message: 'Original message' };
      darknessEffect(state, result, null);
      
      // Non modifica il result (solo tracking)
      expect(result.message).toBe('Original message');
    });

    it('dovrebbe essere chiamabile con parseResult null', () => {
      const state = getGameState();
      state.turn.previous.hasLight = true;
      state.turn.current.hasLight = false;
      
      const result = { message: '' };
      
      // Non dovrebbe crashare con parseResult null
      expect(() => darknessEffect(state, result, null)).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('dovrebbe gestire hasLight=true senza reset se turnsInDarkness già 0', () => {
      const state = getGameState();
      
      // Setup: sempre avuto luce
      state.turn.previous.hasLight = true;
      state.turn.current.hasLight = true;
      state.turn.turnsInDarkness = 0;
      
      const result = { message: '' };
      darknessEffect(state, result, null);
      
      // Rimane 0 (idempotente)
      expect(state.turn.turnsInDarkness).toBe(0);
    });

    it('dovrebbe permettere counter > 3 se gameOverEffect non eseguito', () => {
      const state = getGameState();
      
      // Setup: già a 3 (morte dovrebbe triggerare ma gameOverEffect non chiamato)
      state.turn.previous.hasLight = false;
      state.turn.current.hasLight = false;
      state.turn.turnsInDarkness = 3;
      
      const result = { message: '' };
      darknessEffect(state, result, null);
      
      // Incrementa oltre 3 (game over è responsabilità di gameOverEffect)
      expect(state.turn.turnsInDarkness).toBe(4);
    });
  });
});
