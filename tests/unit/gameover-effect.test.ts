/**
 * Test Unit per gameOverEffect.js (Sprint 3.3.5.B)
 * Test isolato del game over centralizzato
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetGameState, getGameState, initializeOriginalData } from '../../src/logic/engine.js';
import { gameOverEffect } from '../../src/logic/turnEffects/gameOverEffect.js';

describe('gameOverEffect - Sprint 3.3.5.B', () => {
  
  beforeEach(() => {
    initializeOriginalData();
    resetGameState(1);
  });

  describe('CHECK 1: Darkness Death', () => {
    // Aggiornato per decisione R1 (#107)
    it('dovrebbe triggerare game over quando il timer del buio è scaduto (darknessExpired)', () => {
      const state = getGameState();
      state.turn.current.darknessExpired = true;
      state.awaitingRestart = false;
      state.ended = false;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe('DARKNESS');
      expect(result.message).toBeTruthy();
      expect(state.awaitingRestart).toBe(true);
    });

    it('NON dovrebbe triggerare con turnsInDarkness < 3', () => {
      const state = getGameState();
      state.turn.turnsInDarkness = 2;
      state.awaitingRestart = false;
      state.ended = false;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(false);
      expect(state.awaitingRestart).toBe(false);
    });

    // Aggiornato per decisione R1 (#107)
    it('dovrebbe usare messaggio i18n corretto (lingua IT)', () => {
      const state = getGameState();
      state.currentLingua = 1;
      state.turn.current.darknessExpired = true;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOverReason).toBe('DARKNESS');
      expect(result.message).toContain('💀');
      expect(result.message).toContain('BUIO');
    });

    // Aggiornato per decisione R1 (#107)
    it('dovrebbe usare messaggio i18n corretto (lingua EN)', () => {
      const state = getGameState();
      state.currentLingua = 2;
      state.turn.current.darknessExpired = true;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOverReason).toBe('DARKNESS');
      expect(result.message).toContain('💀');
      expect(result.message).toContain('DARK');
    });
  });

  describe('CHECK 2: Terminal Location', () => {
    it('dovrebbe triggerare game over con Terminale === -1', () => {
      const state = getGameState();
      state.currentLocationId = 8;
      state.currentLingua = 1;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe('TERMINAL_LOCATION');
      expect(result.message).toBeTruthy();
      expect(state.awaitingRestart).toBe(true);
    });

    it('NON dovrebbe triggerare con Terminale !== -1', () => {
      const state = getGameState();
      state.currentLocationId = 1;
      state.currentLingua = 1;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(false);
    });

    it('dovrebbe usare i18n per messaggio terminal location', () => {
      const state = getGameState();
      state.currentLocationId = 8;
      state.currentLingua = 1;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOverReason).toBe('TERMINAL_LOCATION');
      expect(result.message).toBeTruthy();
      expect(typeof result.message).toBe('string');
    });
  });

  describe('Guards e priorità', () => {
    it('NON dovrebbe verificare condizioni se awaitingRestart === true', () => {
      const state = getGameState();
      state.awaitingRestart = true;
      state.turn.turnsInDarkness = 5;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(false);
    });

    it('NON dovrebbe verificare condizioni se ended === true', () => {
      const state = getGameState();
      state.ended = true;
      state.turn.turnsInDarkness = 3;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(false);
    });

    // Aggiornato per decisione R1 (#107)
    it('darkness death dovrebbe avere priorità su terminal location', () => {
      const state = getGameState();
      state.turn.current.darknessExpired = true;
      state.currentLocationId = 8;
      state.currentLingua = 1;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOverReason).toBe('DARKNESS');
      expect(result.message).toContain('BUIO');
    });
  });

  describe('State mutations', () => {
    // Aggiornato per decisione R1 (#107)
    it('dovrebbe impostare awaitingRestart = true al game over', () => {
      const state = getGameState();
      state.turn.current.darknessExpired = true;
      state.awaitingRestart = false;

      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);

      expect(state.awaitingRestart).toBe(true);
    });

    // Aggiornato per decisione R1 (#107)
    it('dovrebbe popolare result.gameOver e result.gameOverReason', () => {
      const state = getGameState();
      state.turn.current.darknessExpired = true;

      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);

      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe('DARKNESS');
      expect(typeof result.gameOverReason).toBe('string');
    });

    // Aggiornato per decisione R1 (#107)
    it('dovrebbe sovrascrivere result.message con game over message', () => {
      const state = getGameState();
      state.turn.current.darknessExpired = true;
      
      const result = { message: 'Original command result', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.message).not.toBe('Original command result');
      expect(result.message).toContain('💀');
      expect(result.gameOverReason).toBe('DARKNESS');
    });
  });

  describe('CHECK 3: Intercettazione (Sprint 3.3.5.C)', () => {
    // Aggiornato per decisione R2 (#107)
    it('dovrebbe triggare game over quando il timer della zona aperta è scaduto (openAreaExpired)', () => {
      const state = getGameState();
      state.currentLocationId = 51;
      state.turn.current.openAreaExpired = true;

      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);

      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe('INTERCEPT');
      expect(result.resultType).toBe('GAME_OVER');
      expect(state.awaitingRestart).toBe(true);
      expect(result.message).toContain('Sei stato scorto da una ronda russa'); // Testo originale IT (R12)
    });

    it('NON dovrebbe triggare con turnsInDangerZone = 3', () => {
      const state = getGameState();
      state.turn.turnsInDangerZone = 3;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(false);
    });

    it('NON dovrebbe triggerare con turnsInDangerZone < 4', () => {
      const state = getGameState();
      state.turn.turnsInDangerZone = 2;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(false);
    });
  });

  describe('CHECK 4: Guardia Insospettita - Sprint 3.3.5.D', () => {
    // Aggiornato per decisione R4 (#107)
    it('dovrebbe triggerare l\'arresto quando il timer della guardia arriva a 0 al luogo 59', () => {
      const state = getGameState();
      state.currentLocationId = 59;
      state.narrativeState = 'ENDING_PHASE_2_WAIT';
      state.guardTimer = 0;
      state.awaitingRestart = false;
      state.ended = false;

      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);

      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe('GUARD_ARREST');
      expect(result.message).toBeTruthy();
      expect(state.awaitingRestart).toBe(true);
    });

    // Aggiornato per decisione R4 (#107)
    it('NON dovrebbe triggerare con guardTimer = 2', () => {
      const state = getGameState();
      state.currentLocationId = 59;
      state.narrativeState = 'ENDING_PHASE_2_WAIT';
      state.guardTimer = 2;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(false);
      expect(state.awaitingRestart).toBe(false);
    });

    it('dovrebbe richiedere narrativeState === ENDING_PHASE_2_WAIT', () => {
      const state = getGameState();
      state.currentLocationId = 59;
      state.narrativeState = null; // Stato narrativo non attivo
      state.unusefulCommandsCounter = 3;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(false); // Non triggerare senza stato narrativo
    });

    // Aggiornato per decisione R4 (#107)
    it('dovrebbe usare messaggio i18n corretto (lingua IT)', () => {
      const state = getGameState();
      state.currentLingua = 1;
      state.currentLocationId = 59;
      state.narrativeState = 'ENDING_PHASE_2_WAIT';
      state.guardTimer = 0;

      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);

      expect(result.gameOverReason).toBe('GUARD_ARREST');
      expect(result.message).toContain('💀 ARRESTATO');
      expect(result.message).toContain('Hai fallito nella missione.'); // Verifica testo italiano
    });

    // Aggiornato per decisione R4 (#107)
    it('dovrebbe usare messaggio i18n corretto (lingua EN)', () => {
      const state = getGameState();
      state.currentLingua = 2;
      state.currentLocationId = 59;
      state.narrativeState = 'ENDING_PHASE_2_WAIT';
      state.guardTimer = 0;

      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);

      expect(result.gameOverReason).toBe('GUARD_ARREST');
      expect(result.message).toContain('💀 ARRESTED');
      expect(result.message).toContain('You have failed the mission.'); // Verifica testo inglese
    });
  });

  describe('CHECK 5: Limite turni consumati (GAME_MAX_TURNS_CONSUMED)', () => {
    const ENV_KEY = 'GAME_MAX_TURNS_CONSUMED';

    type EngineResultLike = {
      message: string;
      gameOver: boolean;
      accepted?: boolean;
      resultType?: string;
      gameOverReason?: string;
    };

    beforeEach(() => {
      // Default per questa suite: abilitato a 20 per test
      process.env[ENV_KEY] = '20';
    });

    // Aggiornato per decisione R3 (#107)
    it('dovrebbe triggerare game over quando totalTurnsConsumed >= limite', () => {
      const state = getGameState();
      state.turn.totalTurnsConsumed = 20;
      state.currentLingua = 1;
      state.awaitingRestart = false;
      state.ended = false;

      const result: EngineResultLike = { message: '', gameOver: false };
      gameOverEffect(state, result, null);

      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe('TOO_LATE');
      expect(result.resultType).toBe('GAME_OVER');
      expect(state.awaitingRestart).toBe(true);
      // Luogo 1 (in casa): morte "in casa" (R12)
      expect(result.message).toContain("💀 SORPRESO ALL'ALBA");
    });

    it('NON dovrebbe triggerare se totalTurnsConsumed < limite', () => {
      const state = getGameState();
      state.turn.totalTurnsConsumed = 19;
      state.awaitingRestart = false;
      state.ended = false;

      const result: EngineResultLike = { message: '', gameOver: false };
      gameOverEffect(state, result, null);

      expect(result.gameOver).toBe(false);
      expect(state.awaitingRestart).toBe(false);
      expect(state.ended).toBe(false);
    });

    // Aggiornato per decisione R3 (#107)
    it('dovrebbe usare il limite di gioco 200 se env non impostata', () => {
      delete process.env[ENV_KEY];

      const state = getGameState();
      state.turn.totalTurnsConsumed = 199;
      state.awaitingRestart = false;
      state.ended = false;

      const before: EngineResultLike = { message: '', gameOver: false };
      gameOverEffect(state, before, null);

      expect(before.gameOver).toBe(false);
      expect(state.awaitingRestart).toBe(false);
      expect(state.ended).toBe(false);

      state.turn.totalTurnsConsumed = 200;
      const atLimit: EngineResultLike = { message: '', gameOver: false };
      gameOverEffect(state, atLimit, null);

      expect(atLimit.gameOver).toBe(true);
      expect(atLimit.gameOverReason).toBe('TOO_LATE');
    });
  });
});
