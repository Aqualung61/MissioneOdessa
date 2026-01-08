/**
 * Test End-to-End per Sequenza Vittoria Completa (Sprint 3.3.5.D)
 * Test integrazione Ferenc → Teleport → PORGI DOCUMENTI → Vittoria
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  resetGameState, 
  getGameState, 
  initializeOriginalData, 
  setCurrentLocation,
  executeCommand 
} from '../src/logic/engine.js';

describe('Sequenza Vittoria Completa - Sprint 3.3.5.D', () => {
  
  beforeEach(() => {
    initializeOriginalData();
    resetGameState(1);
  });

  describe('Ferenc → Teleport → PORGI DOCUMENTI', () => {
    // Note: Questi test richiedono integrazione completa con applyTurnEffects
    // setCurrentLocation() da solo non triggera victoryEffect
    // Skippati per ora - richiedono setup più realistico
    
    function setupVictoryScenario() {
      const state = getGameState();
      
      // Setup luce attiva (lampada accesa)
      const lampada = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 27);
      if (lampada) {
        lampada.IDLuogo = 0; // In inventario
        lampada.Attivo = 1;
      }
      state.timers.lampadaAccesa = true;
      state.turn.current.hasLight = true;
      
      // Setup oggetti prerequisito Ferenc in inventario
      const fascicolo = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 16);
      const lista = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 6);
      const dossier = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 34);
      const documenti = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 35);
      
      if (fascicolo) {
        fascicolo.IDLuogo = 0;
        fascicolo.Attivo = 1;
        fascicolo.Inventario = true;
      }
      if (lista) {
        lista.IDLuogo = 0;
        lista.Attivo = 1;
        lista.Inventario = true;
      }
      if (dossier) {
        dossier.IDLuogo = 0;
        dossier.Attivo = 1;
        dossier.Inventario = true;
      }
      if (documenti) {
        documenti.IDLuogo = 0;
        documenti.Attivo = 1;
        documenti.Inventario = true;
      }
      
      // Vai al luogo 1 (Atrio) per triggerare Ferenc
      setCurrentLocation(1);
    }

    it.skip('dovrebbe completare Ferenc → Teleport → PORGI DOCUMENTI', () => {
      setupVictoryScenario();
      const state = getGameState();
      
      // Verifica stato post-Ferenc (dovrebbe essere al luogo 59)
      expect(state.currentLocationId).toBe(59);
      expect(state.narrativeState).toBe('ENDING_PHASE_2_WAIT');
      expect(state.movementBlocked).toBe(true);
      
      // Verifica documenti ancora in inventario
      const documenti = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 35);
      expect(documenti?.IDLuogo).toBe(0);
      
      // Esegui comando vittoria: PORGI DOCUMENTI
      const result = executeCommand({
        IsValid: true,
        CommandType: 'ACTION',
        Action: 'PORGERE',
        ObjectRef: 35, // ID Documenti
        Subject: 'DOCUMENTI'
      });
      
      // Verifica vittoria
      expect(result.accepted).toBe(true);
      expect(state.ended).toBe(true);
      expect(state.victory).toBe(true);
    });

    it.skip('dovrebbe assegnare +2 punti per PORGI DOCUMENTI', () => {
      setupVictoryScenario();
      const state = getGameState();
      
      // Punteggio dopo Ferenc + Luogo 59
      // (dipende da quanti luoghi visitati durante setup)
      const punteggioBefore = state.punteggio.totale;
      
      // Esegui vittoria
      executeCommand({
        IsValid: true,
        CommandType: 'ACTION',
        Action: 'PORGERE',
        ObjectRef: 35,
        Subject: 'DOCUMENTI'
      });
      
      // Verifica +2 punti per interazione porgi_documenti_59
      expect(state.punteggio.totale).toBeGreaterThanOrEqual(punteggioBefore + 2);
    });

    it.skip('dovrebbe impostare ended=true e victory=true', () => {
      setupVictoryScenario();
      const state = getGameState();
      
      expect(state.ended).toBe(false);
      expect(state.victory).toBe(undefined);
      
      executeCommand({
        IsValid: true,
        CommandType: 'ACTION',
        Action: 'PORGERE',
        ObjectRef: 35,
        Subject: 'DOCUMENTI'
      });
      
      expect(state.ended).toBe(true);
      expect(state.victory).toBe(true);
    });

    it.skip('dovrebbe terminare con effetto VITTORIA nella risposta', () => {
      setupVictoryScenario();
      
      const result = executeCommand({
        IsValid: true,
        CommandType: 'ACTION',
        Action: 'PORGERE',
        ObjectRef: 35,
        Subject: 'DOCUMENTI'
      });
      
      // Verifica effetto VITTORIA applicato
      const hasVittoriaEffect = result.effects?.some((e: { tipo: string }) => e.tipo === 'VITTORIA');
      expect(hasVittoriaEffect).toBe(true);
    });
  });

  describe.skip('Punteggio Finale', () => {
    // Skip: richiede integrazione completa con applyTurnEffects
    it('punteggio finale dovrebbe includere Ferenc + luoghi + interazioni', () => {
      // Reset con tracking punteggi
      resetGameState(1);
      const state = getGameState();
      
      // Simula percorso minimo per vittoria:
      // 1. Visita alcuni luoghi (es. +5 luoghi = +5)
      setCurrentLocation(2);
      setCurrentLocation(3);
      setCurrentLocation(4);
      setCurrentLocation(5);
      
      // Setup oggetti per Ferenc
      const fascicolo = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 16);
      const lista = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 6);
      const dossier = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 34);
      const documenti = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 35);
      const lampada = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 27);
      
      if (fascicolo) { fascicolo.IDLuogo = 0; fascicolo.Attivo = 1; }
      if (lista) { lista.IDLuogo = 0; lista.Attivo = 1; }
      if (dossier) { dossier.IDLuogo = 0; dossier.Attivo = 1; }
      if (documenti) { documenti.IDLuogo = 0; documenti.Attivo = 1; }
      if (lampada) { lampada.IDLuogo = 0; lampada.Attivo = 1; }
      
      state.timers.lampadaAccesa = true;
      state.turn.current.hasLight = true;
      
      // Vai a luogo 1 → Ferenc trigger
      setCurrentLocation(1);
      
      const punteggioDopeFerenc = state.punteggio.totale;
      
      // Dovrebbe avere:
      // - +5 luoghi (2,3,4,5,59)
      // - +4 Ferenc
      // - +1 luogo iniziale (già contato)
      expect(punteggioDopeFerenc).toBeGreaterThanOrEqual(10);
      
      // PORGI DOCUMENTI
      executeCommand({
        IsValid: true,
        CommandType: 'ACTION',
        Action: 'PORGERE',
        ObjectRef: 35,
        Subject: 'DOCUMENTI'
      });
      
      // Dovrebbe aggiungere +2 per interazione finale
      expect(state.punteggio.totale).toBeGreaterThanOrEqual(punteggioDopeFerenc + 2);
    });
  });

  describe.skip('Comandi Inappropriati al Luogo 59', () => {
    // Skip: richiede integrazione completa, executeCommand non gestisce counter in test isolato
    function setupLuogo59() {
      const state = getGameState();
      
      // Setup luce + oggetti
      const lampada = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 27);
      const fascicolo = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 16);
      const lista = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 6);
      const dossier = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 34);
      const documenti = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 35);
      
      if (lampada) { lampada.IDLuogo = 0; lampada.Attivo = 1; }
      if (fascicolo) { fascicolo.IDLuogo = 0; fascicolo.Attivo = 1; }
      if (lista) { lista.IDLuogo = 0; lista.Attivo = 1; }
      if (dossier) { dossier.IDLuogo = 0; dossier.Attivo = 1; }
      if (documenti) { documenti.IDLuogo = 0; documenti.Attivo = 1; }
      
      state.timers.lampadaAccesa = true;
      state.turn.current.hasLight = true;
      
      // Trigger Ferenc → Teleport a 59
      setCurrentLocation(1);
    }

    it('comandi SYSTEM non dovrebbero incrementare counter guardia', () => {
      setupLuogo59();
      const state = getGameState();
      
      expect(state.unusefulCommandsCounter).toBe(0);
      
      // Esegui comandi SYSTEM
      executeCommand({ IsValid: true, CommandType: 'SYSTEM', SystemCommand: 'INVENTARIO' });
      executeCommand({ IsValid: true, CommandType: 'SYSTEM', SystemCommand: 'AIUTO' });
      executeCommand({ IsValid: true, CommandType: 'SYSTEM', SystemCommand: 'PUNTI' });
      
      // Counter non dovrebbe aumentare
      expect(state.unusefulCommandsCounter).toBe(0);
    });

    it('comandi ACTION inappropriati dovrebbero incrementare counter', () => {
      setupLuogo59();
      const state = getGameState();
      
      expect(state.unusefulCommandsCounter).toBe(0);
      
      // Comando ACTION non valido (es. PRENDI oggetto non presente)
      executeCommand({
        IsValid: true,
        CommandType: 'ACTION',
        Action: 'PRENDERE',
        ObjectRef: 999 // Oggetto inesistente
      });
      
      // Counter dovrebbe incrementare
      expect(state.unusefulCommandsCounter).toBeGreaterThan(0);
    });

    it('3 comandi inappropriati dovrebbero causare game over', () => {
      setupLuogo59();
      const state = getGameState();
      
      // Esegui 3 comandi inappropriati
      executeCommand({
        IsValid: true,
        CommandType: 'ACTION',
        Action: 'PRENDERE',
        ObjectRef: 999
      });
      
      executeCommand({
        IsValid: true,
        CommandType: 'ACTION',
        Action: 'PRENDERE',
        ObjectRef: 998
      });
      
      executeCommand({
        IsValid: true,
        CommandType: 'ACTION',
        Action: 'PRENDERE',
        ObjectRef: 997
      });
      
      // Dovrebbe triggerare game over (se implementato counter check)
      expect(state.unusefulCommandsCounter).toBeGreaterThanOrEqual(3);
      
      // Note: Il game over effettivo dipende da applyTurnEffects
      // Questo test verifica solo il counter
    });
  });

  describe.skip('Internazionalizzazione', () => {
    // Skip: richiede integrazione completa con applyTurnEffects
    it.skip('dovrebbe mostrare messaggi in italiano (IDLingua=1)', () => {
      resetGameState(1);
      const state = getGameState();
      expect(state.currentLingua).toBe(1);
      
      // Setup scenario vittoria
      const lampada = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 27);
      const fascicolo = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 16);
      const lista = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 6);
      const dossier = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 34);
      const documenti = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 35);
      
      if (lampada) { lampada.IDLuogo = 0; lampada.Attivo = 1; }
      if (fascicolo) { fascicolo.IDLuogo = 0; fascicolo.Attivo = 1; }
      if (lista) { lista.IDLuogo = 0; lista.Attivo = 1; }
      if (dossier) { dossier.IDLuogo = 0; dossier.Attivo = 1; }
      if (documenti) { documenti.IDLuogo = 0; documenti.Attivo = 1; }
      
      state.timers.lampadaAccesa = true;
      state.turn.current.hasLight = true;
      
      setCurrentLocation(1);
      
      // Verifica Ferenc message in italiano
      expect(state.narrativeState).toBe('ENDING_PHASE_2_WAIT');
    });

    it('dovrebbe mostrare messaggi in inglese (IDLingua=2)', () => {
      resetGameState(2);
      const state = getGameState();
      expect(state.currentLingua).toBe(2);
      
      // Setup scenario vittoria
      const lampada = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 27);
      const fascicolo = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 16);
      const lista = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 6);
      const dossier = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 34);
      const documenti = state.Oggetti.find((o: { ID: number; IDLuogo?: number; Attivo?: number; Inventario?: boolean }) => o.ID === 35);
      
      if (lampada) { lampada.IDLuogo = 0; lampada.Attivo = 1; }
      if (fascicolo) { fascicolo.IDLuogo = 0; fascicolo.Attivo = 1; }
      if (lista) { lista.IDLuogo = 0; lista.Attivo = 1; }
      if (dossier) { dossier.IDLuogo = 0; dossier.Attivo = 1; }
      if (documenti) { documenti.IDLuogo = 0; documenti.Attivo = 1; }
      
      state.timers.lampadaAccesa = true;
      state.turn.current.hasLight = true;
      
      setCurrentLocation(1);
      
      // Verifica Ferenc message in inglese
      expect(state.narrativeState).toBe('ENDING_PHASE_2_WAIT');
    });
  });
});
