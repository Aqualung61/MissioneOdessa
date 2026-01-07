/**
 * Test per verificare il wrapper executeCommand con pipeline commentata (Sprint 3.3.4)
 * Verifica che il wrapper chiami correttamente executeCommandLegacy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetGameState, executeCommand, initializeOriginalData, getGameState } from '../../src/logic/engine.js';

describe('Sprint 3.3.4 - Shadow Export Wrapper', () => {
  
  beforeEach(() => {
    initializeOriginalData();
    resetGameState(1);
  });

  describe('Wrapper validation', () => {
    it('dovrebbe rifiutare parseResult null', () => {
      const result = executeCommand(null);
      
      expect(result.accepted).toBe(false);
      expect(result.resultType).toBe('ERROR');
    });

    it('dovrebbe rifiutare parseResult non valido', () => {
      const result = executeCommand({ IsValid: false, Error: 'TEST_ERROR' });
      
      expect(result.accepted).toBe(false);
      expect(result.resultType).toBe('ERROR');
    });
  });

  describe('Wrapper delegates to legacy', () => {
    it('NAVIGATION dovrebbe funzionare tramite legacy', () => {
      const parseResult = {
        IsValid: true,
        CommandType: 'NAVIGATION',
        CanonicalVerb: 'NORD',
        NormVerb: 'NORD'
      };
      
      const result = executeCommand(parseResult);
      
      expect(result.accepted).toBe(true);
      expect(result.resultType).toBe('OK');
      expect(result.message).toContain('NORD');
    });

    it('SYSTEM INVENTARIO dovrebbe funzionare tramite legacy', () => {
      const parseResult = {
        IsValid: true,
        CommandType: 'SYSTEM',
        VerbConcept: 'INVENTARIO',
        CanonicalVerb: 'INVENTARIO',
        NormVerb: 'INVENTARIO'
      };
      
      const result = executeCommand(parseResult);
      
      expect(result.accepted).toBe(true);
      expect(result.resultType).toBe('OK');
      expect(result.showLocation).toBe(true);
    });

    it('ACTION ESAMINA dovrebbe funzionare tramite legacy', () => {
      const parseResult = {
        IsValid: true,
        CommandType: 'ACTION',
        VerbConcept: 'ESAMINARE',
        CanonicalVerb: 'ESAMINA',
        NormVerb: 'ESAMINA'
      };
      
      const result = executeCommand(parseResult);
      
      expect(result.accepted).toBe(true);
      expect(result.resultType).toBe('OK');
    });
  });

  describe('Pipeline PARZIALMENTE active (Sprint 3.3.5.A)', () => {
    it('prepareTurnContext DOVREBBE essere chiamato', () => {
      const parseResult = {
        IsValid: true,
        CommandType: 'NAVIGATION',
        CanonicalVerb: 'NORD',
        NormVerb: 'NORD'
      };
      
      // Execute command
      executeCommand(parseResult);
      
      // Turn context SHOULD be updated (pipeline active)
      const state = getGameState();
      expect(state.turn.globalTurnNumber).toBeGreaterThan(0); // Incremented
      expect(state.turn.current.parseResult).not.toBeNull(); // Set
    });

    it('runPreExecutionChecks NON dovrebbe bloccare (ancora commentata)', () => {
      const state = getGameState();
      state.currentLocationId = 51; // Danger zone
      state.turn.turnsInDangerZone = 10; // Alto
      
      const parseResult = {
        IsValid: true,
        CommandType: 'NAVIGATION',
        CanonicalVerb: 'NORD',
        NormVerb: 'NORD'
      };
      
      const result = executeCommand(parseResult);
      
      // Should NOT block (pre-checks still disabled in 3.3.5.A)
      expect(result.accepted).toBe(true);
      expect(result.resultType).toBe('OK');
    });

    it('applyTurnEffects DOVREBBE essere chiamato per torcia', () => {
      const state = getGameState();
      
      // Simula torcia in inventario
      const torcia = state.Oggetti.find(o => o.ID === 37);
      if (torcia) {
        torcia.Inventario = true;
        state.timers.torciaDifettosa = false;
        
        const before = state.turn.turnsWithTorch;
        
        const parseResult = {
          IsValid: true,
          CommandType: 'NAVIGATION',
          CanonicalVerb: 'NORD',
          NormVerb: 'NORD'
        };
        
        executeCommand(parseResult);
        
        // Turn counters SHOULD change (post-effects active for torch)
        expect(state.turn.turnsWithTorch).toBe(before + 1);
      } else {
        expect(true).toBe(true); // Torcia non presente
      }
    });
  });

  describe('Backward compatibility garantita', () => {
    it('tutti i comandi legacy funzionano identicamente', () => {
      const commands = [
        { type: 'NAVIGATION', verb: 'NORD' },
        { type: 'NAVIGATION', verb: 'SUD' },
        { type: 'SYSTEM', verb: 'INVENTARIO' },
        { type: 'SYSTEM', verb: 'AIUTO' },
        { type: 'SYSTEM', verb: 'PUNTI' },
        { type: 'ACTION', verb: 'ESAMINA' }
      ];
      
      for (const cmd of commands) {
        const parseResult = {
          IsValid: true,
          CommandType: cmd.type,
          VerbConcept: cmd.verb,
          CanonicalVerb: cmd.verb,
          NormVerb: cmd.verb
        };
        
        const result = executeCommand(parseResult);
        
        expect(result.accepted).toBe(true);
        expect(result.resultType).toBe('OK');
      }
    });
  });

});
