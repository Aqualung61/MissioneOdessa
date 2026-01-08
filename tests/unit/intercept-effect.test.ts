/**
 * Test Unit per interceptEffect.js (Sprint 3.3.5.C)
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
    it('dovrebbe incrementare turnsInDangerZone in danger zone con consuming command', () => {
      const state = getGameState();
      state.turn.current.consumesTurn = true;
      state.turn.current.inDangerZone = true;
      state.turn.turnsInDangerZone = 0;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(1);
    });

    it('dovrebbe incrementare dal primo arrivo (senza skip)', () => {
      const state = getGameState();
      state.turn.previous.inDangerZone = false; // Arrivo da luogo sicuro
      state.turn.current.inDangerZone = true;
      state.turn.current.consumesTurn = true;
      state.turn.turnsInDangerZone = 0;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(1);
    });

    it('dovrebbe incrementare progressivamente in danger zone', () => {
      const state = getGameState();
      state.turn.current.consumesTurn = true;
      state.turn.current.inDangerZone = true;

      // Turno 1
      state.turn.turnsInDangerZone = 0;
      interceptEffect(state, {}, {});
      expect(state.turn.turnsInDangerZone).toBe(1);

      // Turno 2
      interceptEffect(state, {}, {});
      expect(state.turn.turnsInDangerZone).toBe(2);

      // Turno 3
      interceptEffect(state, {}, {});
      expect(state.turn.turnsInDangerZone).toBe(3);
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
    it('dovrebbe resettare uscendo da danger zone', () => {
      const state = getGameState();
      state.turn.previous.inDangerZone = true; // Ero in danger zone
      state.turn.current.inDangerZone = false; // Ora sono fuori
      state.turn.current.consumesTurn = true;
      state.turn.turnsInDangerZone = 2;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(0); // Resettato
    });

    it('dovrebbe resettare anche con counter alto', () => {
      const state = getGameState();
      state.turn.previous.inDangerZone = true;
      state.turn.current.inDangerZone = false;
      state.turn.current.consumesTurn = true;
      state.turn.turnsInDangerZone = 5; // Counter alto

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(0);
    });

    it('NON dovrebbe resettare se si rimane in danger zone', () => {
      const state = getGameState();
      state.turn.previous.inDangerZone = true;
      state.turn.current.inDangerZone = true; // Ancora in danger
      state.turn.current.consumesTurn = true;
      state.turn.turnsInDangerZone = 2;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(3); // Incrementato, non resettato
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
    it('Movimento tra danger zones: NO reset, solo incremento', () => {
      const state = getGameState();
      state.turn.previous.inDangerZone = true; // Da danger zone
      state.turn.current.inDangerZone = true;  // A danger zone
      state.turn.current.consumesTurn = true;
      state.turn.turnsInDangerZone = 1;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(2); // Solo incremento
    });

    it('Arrivo in rifugio sicuro (luogo 57): reset', () => {
      const state = getGameState();
      state.turn.previous.inDangerZone = true;
      state.turn.current.inDangerZone = false; // Luogo 57 non è danger
      state.turn.current.consumesTurn = true;
      state.turn.turnsInDangerZone = 2;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(0); // Salvezza!
    });

    it('Comando SYSTEM in danger zone: NO incremento', () => {
      const state = getGameState();
      state.turn.current.consumesTurn = false; // INVENTARIO, AIUTO, ecc.
      state.turn.current.inDangerZone = true;
      state.turn.turnsInDangerZone = 1;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(1);
    });

    it('Contatore a 3 non viene incrementato se esce', () => {
      const state = getGameState();
      state.turn.previous.inDangerZone = true;
      state.turn.current.inDangerZone = false; // Esce prima del 4°
      state.turn.current.consumesTurn = true;
      state.turn.turnsInDangerZone = 3;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(0); // Reset, salvato!
    });
  });

  describe('Integrazione con gameState.turn', () => {
    it('dovrebbe rispettare la struttura turn.current', () => {
      const state = getGameState();
      state.turn.current = {
        parseResult: null,
        consumesTurn: true,
        location: 51,
        hasLight: true,
        inDangerZone: true
      };
      state.turn.turnsInDangerZone = 0;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(1);
    });

    it('dovrebbe rispettare la struttura turn.previous', () => {
      const state = getGameState();
      state.turn.previous = {
        location: 51,
        hasLight: true,
        consumedTurn: true,
        inDangerZone: true
      };
      state.turn.current = {
        parseResult: null,
        consumesTurn: true,
        location: 5,
        hasLight: true,
        inDangerZone: false
      };
      state.turn.turnsInDangerZone = 2;

      interceptEffect(state, {}, {});

      expect(state.turn.turnsInDangerZone).toBe(0); // Reset corretto
    });
  });
});

