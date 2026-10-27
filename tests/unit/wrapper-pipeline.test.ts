/**
 * Test per verificare il wrapper executeCommand con pipeline commentata (Sprint 3.3.4)
 * Verifica che il wrapper chiami correttamente executeCommandLegacy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetGameState, executeCommand, initializeOriginalData } from '../../src/logic/engine.js';

describe('executeCommand — validazione del parseResult', () => {
  
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
      // Non deve leakare testo tecnico, ma restituire un messaggio user-facing.
      expect(result.message).toBe('Input non valido.');
    });

    it('dovrebbe mappare INVALID_INPUT (details) in messaggio utente', () => {
      const result = executeCommand({ IsValid: false, Error: 'INVALID_INPUT', Details: 'EMPTY_INPUT' });

      expect(result.accepted).toBe(false);
      expect(result.resultType).toBe('ERROR');
      expect(result.message).toBe('Inserisci un comando.');
    });
  });
});
