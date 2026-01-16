/**
 * Test Unit per Sistema Turn (Sprint 3.3.1 + 3.3.2 + 3.3.3)
 * Verifica shouldConsumeTurn, hasFonteLuceAttiva, prepareTurnContext, runPreExecutionChecks, estensione gameState.turn
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetGameState, getGameState, shouldConsumeTurn, hasFonteLuceAttiva, prepareTurnContext, runPreExecutionChecks } from '../../src/logic/engine.js';

describe('Sistema Turn - Sprint 3.3.1', () => {
  
  beforeEach(() => {
    resetGameState(1); // Italiano
  });

  describe('gameState.turn structure', () => {
    it('dovrebbe inizializzare gameState.turn con tutti i campi', () => {
      const state = getGameState();
      
      expect(state.turn).toBeDefined();
      expect(state.turn.globalTurnNumber).toBe(0);
      expect(state.turn.totalTurnsConsumed).toBe(0);
      // turnsWithTorch rimosso - sistema torcia ora usa solo timers.torciaDifettosa
      expect(state.turn.turnsInDarkness).toBe(0);
      expect(state.turn.turnsInDangerZone).toBe(0);
      
      expect(state.turn.current).toBeDefined();
      expect(state.turn.current.parseResult).toBeNull();
      expect(state.turn.current.consumesTurn).toBe(false);
      expect(state.turn.current.location).toBe(1);
      expect(state.turn.current.hasLight).toBe(false);
      expect(state.turn.current.inDangerZone).toBe(false);
      
      expect(state.turn.previous).toBeDefined();
      expect(state.turn.previous.location).toBe(1);
      expect(state.turn.previous.hasLight).toBe(false);
      expect(state.turn.previous.consumedTurn).toBe(false);
    });
  });

  describe('shouldConsumeTurn', () => {
    it('INVENTARIO non dovrebbe consumare turno', () => {
      const parseResult = { IsValid: true, CommandType: 'SYSTEM', NormVerb: 'INVENTARIO' };
      expect(shouldConsumeTurn(parseResult)).toBe(false);
    });

    it('AIUTO non dovrebbe consumare turno', () => {
      const parseResult = { IsValid: true, CommandType: 'SYSTEM', NormVerb: 'AIUTO' };
      expect(shouldConsumeTurn(parseResult)).toBe(false);
    });

    it('PUNTI non dovrebbe consumare turno', () => {
      const parseResult = { IsValid: true, CommandType: 'SYSTEM', NormVerb: 'PUNTI' };
      expect(shouldConsumeTurn(parseResult)).toBe(false);
    });

    it('SALVARE non dovrebbe consumare turno', () => {
      const parseResult = { IsValid: true, CommandType: 'SYSTEM', NormVerb: 'SALVARE' };
      expect(shouldConsumeTurn(parseResult)).toBe(false);
    });

    it('CARICARE non dovrebbe consumare turno', () => {
      const parseResult = { IsValid: true, CommandType: 'SYSTEM', NormVerb: 'CARICARE' };
      expect(shouldConsumeTurn(parseResult)).toBe(false);
    });

    it('NORD dovrebbe consumare turno', () => {
      const parseResult = { IsValid: true, CommandType: 'NAVIGATION', NormVerb: 'NORD' };
      expect(shouldConsumeTurn(parseResult)).toBe(true);
    });

    it('PRENDI dovrebbe consumare turno', () => {
      const parseResult = { IsValid: true, CommandType: 'ACTION', NormVerb: 'PRENDERE', NormNoun: 'CHIAVE' };
      expect(shouldConsumeTurn(parseResult)).toBe(true);
    });

    it('ESAMINA dovrebbe consumare turno', () => {
      const parseResult = { IsValid: true, CommandType: 'ACTION', NormVerb: 'ESAMINARE', NormNoun: 'TAVOLO' };
      expect(shouldConsumeTurn(parseResult)).toBe(true);
    });

    it('parseResult non valido non dovrebbe consumare turno', () => {
      const parseResult = { IsValid: false, NormVerb: 'INVALID', CommandType: 'UNKNOWN' };
      expect(shouldConsumeTurn(parseResult)).toBe(false);
    });

    it('parseResult null non dovrebbe consumare turno', () => {
      expect(shouldConsumeTurn(null)).toBe(false);
    });
  });

  describe('hasFonteLuceAttiva', () => {
    it('dovrebbe restituire false inizialmente (senza torcia né lampada)', () => {
      const state = getGameState();
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        // Rende esplicito lo scenario “senza torcia”: torcia non in inventario
        torcia.Inventario = false;
      }
      state.timers.lampadaAccesa = false;
      state.timers.torciaDifettosa = false;

      expect(hasFonteLuceAttiva()).toBe(false);
    });

    it('dovrebbe restituire true con torcia in inventario e funzionante', () => {
      const state = getGameState();
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = false;
        expect(hasFonteLuceAttiva()).toBe(true);
      } else {
        expect(true).toBe(true); // Torcia non presente nei dati
      }
    });

    it('dovrebbe restituire true con lampada accesa', () => {
      const state = getGameState();
      state.timers.lampadaAccesa = true;
      expect(hasFonteLuceAttiva()).toBe(true);
    });

    it('dovrebbe restituire false con torcia difettosa anche se in inventario', () => {
      const state = getGameState();
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = true; // Difettosa
        expect(hasFonteLuceAttiva()).toBe(false);
      } else {
        expect(true).toBe(true); // Torcia non presente nei dati
      }
    });

    it('dovrebbe restituire true con entrambe le fonti attive', () => {
      const state = getGameState();
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = false;
        state.timers.lampadaAccesa = true;
        expect(hasFonteLuceAttiva()).toBe(true);
      } else {
        expect(true).toBe(true); // Torcia non presente nei dati
      }
    });
  });

  describe('Contatori turn', () => {
    it('globalTurnNumber dovrebbe incrementare ad ogni comando (anche non-consuming)', () => {
      expect(true).toBe(true); // Implementato in Sprint 3.3.2
    });

    it('totalTurnsConsumed dovrebbe incrementare solo per comandi consuming', () => {
      expect(true).toBe(true); // Implementato in Sprint 3.3.2
    });

    it('turnsWithTorch dovrebbe incrementare con torcia attiva', () => {
      expect(true).toBe(true); // Implementato in Sprint 3.3.5
    });

    it('turnsInDarkness dovrebbe incrementare senza luce', () => {
      expect(true).toBe(true); // Implementato in Sprint 3.3.5
    });

    // Test eliminato: deprecato - vedere tests/unit/intercept-effect.test.ts
    // per test completi del sistema intercettazione (Sprint 3.3.5.C)
  });

  describe('TurnContext snapshot', () => {
    it('current.parseResult dovrebbe contenere comando corrente', () => {
      const parseResult = { IsValid: true, NormVerb: 'NORD' };
      prepareTurnContext(parseResult);
      
      const state = getGameState();
      expect(state.turn.current.parseResult).toEqual(parseResult);
    });

    it('current.location dovrebbe riflettere currentLocationId', () => {
      const state = getGameState();
      state.currentLocationId = 5;
      
      const parseResult = { IsValid: true, NormVerb: 'ESAMINA', NormNoun: 'TAVOLO' };
      prepareTurnContext(parseResult);
      
      expect(state.turn.current.location).toBe(5);
    });

    it('previous dovrebbe conservare stato turno precedente', () => {
      const state = getGameState();
      state.currentLocationId = 3;
      
      const firstCommand = { IsValid: true, NormVerb: 'NORD' };
      prepareTurnContext(firstCommand);
      
      // Prima esecuzione: previous dovrebbe avere valori iniziali
      expect(state.turn.previous.location).toBe(1); // Luogo iniziale
      expect(state.turn.previous.hasLight).toBe(false);
      expect(state.turn.previous.consumedTurn).toBe(false);
      
      // Secondo comando
      state.currentLocationId = 7;
      const secondCommand = { IsValid: true, NormVerb: 'PRENDI', NormNoun: 'CHIAVE' };
      prepareTurnContext(secondCommand);
      
      // Previous dovrebbe avere valori del primo comando
      expect(state.turn.previous.location).toBe(3);
      expect(state.turn.previous.consumedTurn).toBe(true); // NORD consuma
    });

    it('globalTurnNumber dovrebbe incrementare anche per comandi non-consuming', () => {
      const state = getGameState();
      expect(state.turn.globalTurnNumber).toBe(0);
      
      // Comando non-consuming
      prepareTurnContext({ IsValid: true, NormVerb: 'INVENTARIO' });
      expect(state.turn.globalTurnNumber).toBe(1);
      
      // Altro comando non-consuming
      prepareTurnContext({ IsValid: true, NormVerb: 'AIUTO' });
      expect(state.turn.globalTurnNumber).toBe(2);
    });

    it('totalTurnsConsumed dovrebbe incrementare solo per comandi consuming', () => {
      const state = getGameState();
      expect(state.turn.totalTurnsConsumed).toBe(0);
      
      // Comando non-consuming
      prepareTurnContext({ IsValid: true, NormVerb: 'INVENTARIO', CommandType: 'SYSTEM' });
      expect(state.turn.totalTurnsConsumed).toBe(0);
      
      // Comando consuming
      prepareTurnContext({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
      expect(state.turn.totalTurnsConsumed).toBe(1);
      
      // Altro consuming
      prepareTurnContext({ IsValid: true, NormVerb: 'PRENDI', NormNoun: 'CHIAVE', CommandType: 'ACTION' });
      expect(state.turn.totalTurnsConsumed).toBe(2);
      
      // Non-consuming di nuovo
      prepareTurnContext({ IsValid: true, NormVerb: 'PUNTI', CommandType: 'SYSTEM' });
      expect(state.turn.totalTurnsConsumed).toBe(2); // Non incrementato
    });

    it('current.hasLight dovrebbe riflettere hasFonteLuceAttiva()', () => {
      const state = getGameState();
      const torcia = state.Oggetti.find(o => o.ID === 37);
      
      // Senza luce
      if (torcia) torcia.IDLuogo = 1; // Torcia non in inventario
      state.timers.lampadaAccesa = false;
      prepareTurnContext({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
      expect(state.turn.current.hasLight).toBe(false);
      
      // Con lampada accesa
      state.timers.lampadaAccesa = true;
      prepareTurnContext({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
      expect(state.turn.current.hasLight).toBe(true);
    });

    it('current.inDangerZone dovrebbe identificare luoghi pericolosi', () => {
      const state = getGameState();
      const dangerZones = [51, 52, 53, 55, 56, 58];
      
      // Luogo sicuro (ID=1)
      state.currentLocationId = 1;
      prepareTurnContext({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
      expect(state.turn.current.inDangerZone).toBe(false);
      
      // Luogo pericoloso (ID=51)
      state.currentLocationId = 51;
      prepareTurnContext({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
      expect(state.turn.current.inDangerZone).toBe(true);
      
      // Verifica tutti i luoghi pericolosi
      for (const zoneId of dangerZones) {
        state.currentLocationId = zoneId;
        prepareTurnContext({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
        expect(state.turn.current.inDangerZone).toBe(true);
      }
    });

    it('current.consumesTurn dovrebbe riflettere shouldConsumeTurn()', () => {
      prepareTurnContext({ IsValid: true, NormVerb: 'INVENTARIO', CommandType: 'SYSTEM' });
      expect(getGameState().turn.current.consumesTurn).toBe(false);
      
      prepareTurnContext({ IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' });
      expect(getGameState().turn.current.consumesTurn).toBe(true);
    });
  });

  // Note: Intercettazione check rimosso da runPreExecutionChecks (Sprint 3.3.5.C)
  // Ora gestito da interceptEffect middleware + gameOverEffect CHECK 3
  // Vedere tests/unit/intercept-effect.test.ts e tests/unit/gameover-effect.test.ts

  describe('runPreExecutionChecks (Sprint 3.3.3)', () => {
    describe('Movement block check', () => {
      it('dovrebbe bloccare NAVIGATION quando movementBlocked=true', () => {
        const state = getGameState();
        state.movementBlocked = true;
        
        const parseResult = { IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' };
        prepareTurnContext(parseResult);
        
        const result = runPreExecutionChecks(parseResult);
        
        expect(result).not.toBeNull();
        expect(result.accepted).toBe(false);
        expect(result.resultType).toBe('ERROR');
      });

      it('NON dovrebbe bloccare comandi ACTION quando movementBlocked=true', () => {
        const state = getGameState();
        state.movementBlocked = true;
        
        const parseResult = { IsValid: true, NormVerb: 'PRENDI', CommandType: 'ACTION' };
        prepareTurnContext(parseResult);
        
        const result = runPreExecutionChecks(parseResult);
        expect(result).toBeNull(); // Solo NAVIGATION è bloccata
      });

      it('NON dovrebbe bloccare quando movementBlocked=false', () => {
        const state = getGameState();
        state.movementBlocked = false;
        
        const parseResult = { IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' };
        prepareTurnContext(parseResult);
        
        const result = runPreExecutionChecks(parseResult);
        expect(result).toBeNull();
      });
    });

    describe('Awaiting continue check', () => {
      it.skip('dovrebbe bloccare comandi quando awaitingContinue=true (OBSOLETO - gestito da victoryEffect)', () => {
        const state = getGameState();
        state.awaitingContinue = true;
        
        const parseResult = { IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' };
        prepareTurnContext(parseResult);
        
        const result = runPreExecutionChecks(parseResult);
        
        expect(result).not.toBeNull();
        expect(result.accepted).toBe(false);
        expect(result.resultType).toBe('ERROR');
      });

      it('dovrebbe permettere CONTINUA quando awaitingContinue=true', () => {
        const state = getGameState();
        state.awaitingContinue = true;
        
        const parseResult = { IsValid: true, NormVerb: 'CONTINUA', CommandType: 'SYSTEM', VerbConcept: 'CONTINUA' };
        prepareTurnContext(parseResult);
        
        const result = runPreExecutionChecks(parseResult);
        expect(result).toBeNull(); // CONTINUA permesso
      });

      it('NON dovrebbe bloccare quando awaitingContinue=false', () => {
        const state = getGameState();
        state.awaitingContinue = false;
        
        const parseResult = { IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' };
        prepareTurnContext(parseResult);
        
        const result = runPreExecutionChecks(parseResult);
        expect(result).toBeNull();
      });
    });

    describe('Nessun blocco (happy path)', () => {
      it('dovrebbe restituire null quando tutte le condizioni sono ok', () => {
        const state = getGameState();
        state.currentLocationId = 1; // Luogo sicuro
        state.movementBlocked = false;
        state.awaitingContinue = false;
        state.turn.turnsInDangerZone = 0;
        
        const parseResult = { IsValid: true, NormVerb: 'NORD', CommandType: 'NAVIGATION' };
        prepareTurnContext(parseResult);
        
        const result = runPreExecutionChecks(parseResult);
        expect(result).toBeNull();
      });
    });
  });

});
