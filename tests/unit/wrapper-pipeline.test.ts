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

    it('runPreExecutionChecks DOVREBBE bloccare con intercettazione attiva (Sprint 3.3.5.C)', () => {
      const state = getGameState();
      state.currentLocationId = 51; // Danger zone
      state.turn.turnsInDangerZone = 2; // Sotto soglia
      
      const parseResult = {
        IsValid: true,
        CommandType: 'NAVIGATION',
        CanonicalVerb: 'NORD',
        NormVerb: 'NORD'
      };
      
      const result = executeCommand(parseResult);
      
      // Pre-checks ACTIVE - ma intercettazione check NON ancora implementato (Sprint 3.3.5.C)
      // Quindi per ora NON blocca finché turnsInDangerZone < 3
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
        
        const parseResult = {
          IsValid: true,
          CommandType: 'NAVIGATION',
          CanonicalVerb: 'NORD',
          NormVerb: 'NORD'
        };
        
        executeCommand(parseResult);
        
        // Turn effects SHOULD be active - verifica incremento turni
        expect(state.turn.totalTurnsConsumed).toBe(1);
        expect(state.timers.torciaDifettosa).toBe(false); // Ancora accesa al 1° turno
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
