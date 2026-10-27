/**
 * Test Unit per interceptEffect.js
 * 
 * Sistema intercettazione pattuglie sovietiche in danger zones.
 * Testa incremento/reset contatore turnsInDangerZone.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { interceptEffect } from '../../src/logic/turnEffects/interceptEffect.js';
import { getGameState, resetGameState } from '../../src/logic/engine.js';

describe('interceptEffect - Sprint 3.3.5.C', () => {
  beforeEach(() => {
    resetGameState(1);
  });

  describe('Incremento contatore', () => {
    // Aggiornato per decisione R2 (#107)
    it('dovrebbe far scendere openAreaTimer in danger zone con un comando senza spostamento', () => {
      const state = getGameState();
      state.currentLocationId = 51;
      state.turn.movedThisTurn = false;
      state.turn.openAreaTimer = 2;
      const result: { message?: string } = {};

      interceptEffect(state, result, {});

      expect(state.turn.openAreaTimer).toBe(1);
      expect(state.turn.current.openAreaExpired).toBeUndefined();
      expect(result.message).toBe("Restare a lungo fermi in un posto all'aperto può essere pericoloso.");
    });

    // Aggiornato per decisione R2 (#107)
    it('dovrebbe attivare il timer dal primo arrivo (senza skip), con avviso', () => {
      const state = getGameState();
      state.currentLocationId = 51; // Arrivo da luogo sicuro
      state.turn.movedThisTurn = true;
      state.turn.openAreaTimer = 0;
      const result: { message?: string } = {};

      interceptEffect(state, result, {});

      expect(state.turn.openAreaTimer).toBe(2);
      expect(result.message).toBe("Restare a lungo fermi in un posto all'aperto può essere pericoloso.");
    });

    // Aggiornato per decisione R2 (#107)
    it('dovrebbe scendere progressivamente in danger zone fino alla scadenza', () => {
      const state = getGameState();
      state.currentLocationId = 51;

      // Turno 1: arrivo
      state.turn.movedThisTurn = true;
      interceptEffect(state, {}, {});
      expect(state.turn.openAreaTimer).toBe(2);

      // Turno 2: primo comando fermo
      state.turn.movedThisTurn = false;
      interceptEffect(state, {}, {});
      expect(state.turn.openAreaTimer).toBe(1);
      expect(state.turn.current.openAreaExpired).toBeUndefined();

      // Turno 3: secondo comando fermo → scaduto (morte gestita da gameOverEffect)
      interceptEffect(state, {}, {});
      expect(state.turn.openAreaTimer).toBe(0);
      expect(state.turn.current.openAreaExpired).toBe(true);
    });

    it('NON dovrebbe incrementare con comandi SYSTEM (non consuming)', () => {
      const state = getGameState();
      state.turn.current.consumesTurn = false; // SYSTEM command
      state.turn.current.inDangerZone = true;
      state.turn.turnsInDangerZone = 1;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(1); // Non incrementato
    });

    it('NON dovrebbe incrementare fuori danger zone', () => {
      const state = getGameState();
      state.turn.current.consumesTurn = true;
      state.turn.current.inDangerZone = false; // Fuori danger zone
      state.turn.turnsInDangerZone = 1;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(1); // Non incrementato
    });
  });

  describe('Reset contatore', () => {
    // Aggiornato per decisione R2 (#107)
    it('dovrebbe azzerare openAreaTimer uscendo da danger zone', () => {
      const state = getGameState();
      state.currentLocationId = 47; // Ora sono fuori
      state.turn.movedThisTurn = true;
      state.turn.openAreaTimer = 2;

      interceptEffect(state, {}, {});

      expect(state.turn.openAreaTimer).toBe(0); // Azzerato
    });

    // Aggiornato per decisione R2 (#107)
    it('dovrebbe azzerare anche con valore alto (stato caricato)', () => {
      const state = getGameState();
      state.currentLocationId = 47;
      state.turn.movedThisTurn = true;
      state.turn.openAreaTimer = 5; // Valore alto

      interceptEffect(state, {}, {});

      expect(state.turn.openAreaTimer).toBe(0);
    });

    // Aggiornato per decisione R2 (#107)
    it('NON dovrebbe azzerare se si rimane in danger zone', () => {
      const state = getGameState();
      state.currentLocationId = 51; // Ancora in danger
      state.turn.movedThisTurn = false;
      state.turn.openAreaTimer = 2;

      interceptEffect(state, {}, {});

      expect(state.turn.openAreaTimer).toBe(1); // Sceso, non azzerato
    });

    it('NON dovrebbe resettare se non eri in danger zone prima', () => {
      const state = getGameState();
      state.turn.previous.inDangerZone = false; // Non eri in danger
      state.turn.current.inDangerZone = false;
      state.turn.current.consumesTurn = true;
      state.turn.turnsInDangerZone = 2;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(2); // Invariato
    });
  });

  describe('Edge cases', () => {
    // Aggiornato per decisione R2 (#107)
    it('Movimento tra danger zones: NO reset, timer di nuovo a 2 con avviso', () => {
      const state = getGameState();
      state.currentLocationId = 52; // Da 51 a 52, sempre in zona
      state.turn.movedThisTurn = true;
      state.turn.openAreaTimer = 1;
      const result: { message?: string } = {};

      interceptEffect(state, result, {});

      expect(state.turn.openAreaTimer).toBe(2);
      expect(state.turn.current.openAreaExpired).toBeUndefined();
      expect(result.message).toBe("Restare a lungo fermi in un posto all'aperto può essere pericoloso.");
    });

    // Aggiornato per decisione R2 (#107)
    it('Arrivo in rifugio sicuro (luogo 57): reset', () => {
      const state = getGameState();
      state.currentLocationId = 57; // Luogo 57 non è danger
      state.turn.movedThisTurn = true;
      state.turn.openAreaTimer = 2;

      interceptEffect(state, {}, {});

      expect(state.turn.openAreaTimer).toBe(0); // Salvezza!
    });

    it('Comando SYSTEM in danger zone: NO incremento', () => {
      const state = getGameState();
      state.turn.current.consumesTurn = false; // INVENTARIO, AIUTO, ecc.
      state.turn.current.inDangerZone = true;
      state.turn.turnsInDangerZone = 1;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(1);
    });

    // Aggiornato per decisione R2 (#107)
    it('Timer a 1 (un comando dalla scadenza) non scade se esce', () => {
      const state = getGameState();
      state.currentLocationId = 47; // Esce prima della scadenza
      state.turn.movedThisTurn = true;
      state.turn.openAreaTimer = 1;

      interceptEffect(state, {}, {});

      expect(state.turn.openAreaTimer).toBe(0); // Reset, salvato!
      expect(state.turn.current.openAreaExpired).toBeUndefined();
    });
  });

  describe('Integrazione con gameState.turn', () => {
    // Aggiornato per decisione R2 (#107)
    it('dovrebbe rispettare la struttura turn.current', () => {
      const state = getGameState();
      state.currentLocationId = 51;
      state.turn.current = {
        parseResult: null,
        consumesTurn: true,
        location: 51,
        hasLight: true,
        inDangerZone: true
      };
      state.turn.movedThisTurn = false;
      state.turn.openAreaTimer = 2;

      interceptEffect(state, {}, {});

      expect(state.turn.openAreaTimer).toBe(1);
      expect(state.turn.current.openAreaExpired).toBeUndefined();
    });

    // Aggiornato per decisione R2 (#107)
    it('dovrebbe rispettare la struttura turn.previous', () => {
      const state = getGameState();
      state.currentLocationId = 5;
      state.turn.previous = {
        location: 51,
        hasLight: true,
        consumedTurn: true,
        inDangerZone: true
      };
      state.turn.current = {
        parseResult: null,
        consumesTurn: true,
        location: 51,
        hasLight: true,
        inDangerZone: false
      };
      state.turn.movedThisTurn = true;
      state.turn.openAreaTimer = 2;

      interceptEffect(state, {}, {});

      expect(state.turn.openAreaTimer).toBe(0); // Reset corretto
    });
  });
});

