/**
 * Test Unit per darknessEffect.js
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

    // Aggiornato per decisione R1 (#107)
    it('dovrebbe far scendere il timer del buio dal secondo turno senza luce', () => {
      const state = getGameState();

      // Setup: già al buio turno precedente (timer avviato a 3)
      state.turn.current.hasLight = false;
      state.turn.darknessTimer = 3;

      const result = { message: '' };
      darknessEffect(state, result, null);

      expect(state.turn.darknessTimer).toBe(2);
      expect(state.turn.current.darknessExpired).toBeUndefined();
    });

    // Aggiornato per decisione R1 (#107)
    it('dovrebbe dare esattamente 3 turni pieni prima della morte (al movimento successivo)', () => {
      const state = getGameState();
      const navigation = { IsValid: true, CommandType: 'NAVIGATION' };
      state.turn.current.hasLight = false;
      state.turn.darknessTimer = 0;

      // Turno 1 (primo buio): il timer parte a 3
      darknessEffect(state, { message: '' }, navigation);
      expect(state.turn.darknessTimer).toBe(3);

      // Turni 2 e 3: il timer scende
      darknessEffect(state, { message: '' }, navigation);
      expect(state.turn.darknessTimer).toBe(2);
      darknessEffect(state, { message: '' }, navigation);
      expect(state.turn.darknessTimer).toBe(1);
      expect(state.turn.current.darknessExpired).toBeUndefined();

      // Turno 4: il timer arriva a 0 con un movimento → morte (gestita da gameOverEffect)
      darknessEffect(state, { message: '' }, navigation);
      expect(state.turn.darknessTimer).toBe(0);
      expect(state.turn.current.darknessExpired).toBe(true);
    });
  });

  describe('Reset countdown quando recupera luce', () => {
    // Aggiornato per decisione R1 (#107)
    it('dovrebbe azzerare darknessTimer quando hasLight diventa true', () => {
      const state = getGameState();

      // Setup: al buio da 2 turni
      state.turn.darknessTimer = 2;

      // Recupera luce
      state.turn.current.hasLight = true;

      const result = { message: '' };
      darknessEffect(state, result, null);

      // Reset countdown
      expect(state.turn.darknessTimer).toBe(0);
    });

    // Aggiornato per decisione R1 (#107)
    it('dovrebbe salvare con ACCENDI LAMPADA al turno critico (prima della morte)', () => {
      const state = getGameState();

      // Setup: timer a 1, il prossimo movimento sarebbe mortale
      state.turn.darknessTimer = 1;

      // ACCENDI LAMPADA eseguito → hasLight recalcolato in applyTurnEffects
      state.turn.current.hasLight = true;

      const result = { message: '' };
      darknessEffect(state, result, { IsValid: true, CommandType: 'ACTION' });

      // Salvato: il comando non è un movimento e il timer si azzera con la luce
      expect(state.turn.current.darknessExpired).toBeUndefined();
      expect(state.turn.darknessTimer).toBe(0);
    });
  });

  describe('Pass-through behavior', () => {
    // Aggiornato per decisione R1 (#107)
    it("dovrebbe accodare l'avviso di pericolo a result.message senza luce", () => {
      const state = getGameState();
      state.turn.current.hasLight = false;
      state.turn.darknessTimer = 2;

      const result = { message: 'Original message' };
      darknessEffect(state, result, null);

      expect(result.message).toBe('Original message\n\nÈ pericoloso muoversi senza luce.');
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

    // Test "dovrebbe permettere counter > 3 se gameOverEffect non eseguito" cancellato
    // per decisione R1 (#107): il timer del buio non supera mai 3.
  });
});
