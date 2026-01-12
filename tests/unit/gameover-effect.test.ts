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
    it('dovrebbe triggerare game over esattamente a turnsInDarkness === 3', () => {
      const state = getGameState();
      state.turn.turnsInDarkness = 3;
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

    it('dovrebbe usare messaggio i18n corretto (lingua IT)', () => {
      const state = getGameState();
      state.currentLingua = 1;
      state.turn.turnsInDarkness = 3;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOverReason).toBe('DARKNESS');
      expect(result.message).toContain('💀');
      expect(result.message).toContain('BUIO');
    });

    it('dovrebbe usare messaggio i18n corretto (lingua EN)', () => {
      const state = getGameState();
      state.currentLingua = 2;
      state.turn.turnsInDarkness = 3;
      
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

    it('darkness death dovrebbe avere priorità su terminal location', () => {
      const state = getGameState();
      state.turn.turnsInDarkness = 3;
      state.currentLocationId = 8;
      state.currentLingua = 1;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOverReason).toBe('DARKNESS');
      expect(result.message).toContain('BUIO');
    });
  });

  describe('State mutations', () => {
    it('dovrebbe impostare awaitingRestart = true al game over', () => {
      const state = getGameState();
      state.turn.turnsInDarkness = 3;
      state.awaitingRestart = false;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(state.awaitingRestart).toBe(true);
    });

    it('dovrebbe popolare result.gameOver e result.gameOverReason', () => {
      const state = getGameState();
      state.turn.turnsInDarkness = 3;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe('DARKNESS');
      expect(typeof result.gameOverReason).toBe('string');
    });

    it('dovrebbe sovrascrivere result.message con game over message', () => {
      const state = getGameState();
      state.turn.turnsInDarkness = 3;
      
      const result = { message: 'Original command result', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.message).not.toBe('Original command result');
      expect(result.message).toContain('💀');
      expect(result.gameOverReason).toBe('DARKNESS');
    });
  });

  describe('CHECK 3: Intercettazione (Sprint 3.3.5.C)', () => {
    it('dovrebbe triggare game over con turnsInDangerZone >= 4', () => {
      const state = getGameState();
      state.turn.turnsInDangerZone = 4;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe('INTERCEPT');
      expect(result.resultType).toBe('GAME_OVER');
      expect(state.awaitingRestart).toBe(true);
      expect(result.message).toContain('INTERCETTATO'); // Verifica messaggio IT
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
    it('dovrebbe triggerare game over con 3 comandi inappropriati al luogo 59', () => {
      const state = getGameState();
      state.currentLocationId = 59;
      state.narrativeState = 'ENDING_PHASE_2_WAIT';
      state.unusefulCommandsCounter = 3;
      state.awaitingRestart = false;
      state.ended = false;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe('GUARD_SUSPICIOUS');
      expect(result.message).toBeTruthy();
      expect(state.awaitingRestart).toBe(true);
    });

    it('NON dovrebbe triggerare con unusefulCommandsCounter = 2', () => {
      const state = getGameState();
      state.currentLocationId = 59;
      state.narrativeState = 'ENDING_PHASE_2_WAIT';
      state.unusefulCommandsCounter = 2;
      
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

    it('dovrebbe usare messaggio i18n corretto (lingua IT)', () => {
      const state = getGameState();
      state.currentLingua = 1;
      state.currentLocationId = 59;
      state.narrativeState = 'ENDING_PHASE_2_WAIT';
      state.unusefulCommandsCounter = 3;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOverReason).toBe('GUARD_SUSPICIOUS');
      expect(result.message).toContain('*** GAME OVER ***');
      expect(result.message).toContain('documenti'); // Verifica testo italiano
    });

    it('dovrebbe usare messaggio i18n corretto (lingua EN)', () => {
      const state = getGameState();
      state.currentLingua = 2;
      state.currentLocationId = 59;
      state.narrativeState = 'ENDING_PHASE_2_WAIT';
      state.unusefulCommandsCounter = 3;
      
      const result = { message: '', gameOver: false };
      gameOverEffect(state, result, null);
      
      expect(result.gameOverReason).toBe('GUARD_SUSPICIOUS');
      expect(result.message).toContain('*** GAME OVER ***');
      expect(result.message).toContain('documents'); // Verifica testo inglese
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
      expect(result.message).toContain('Hai impiegato troppo tempo');
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

    it('dovrebbe essere DISABILITATO se env non impostata', () => {
      delete process.env[ENV_KEY];

      const state = getGameState();
      state.turn.totalTurnsConsumed = 10_000;
      state.awaitingRestart = false;
      state.ended = false;

      const result: EngineResultLike = { message: '', gameOver: false };
      gameOverEffect(state, result, null);

      expect(result.gameOver).toBe(false);
      expect(state.awaitingRestart).toBe(false);
      expect(state.ended).toBe(false);
    });
  });
});
