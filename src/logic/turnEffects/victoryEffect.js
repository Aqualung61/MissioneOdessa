/**
 * Victory Effect - Sistema sequenza finale Ferenc e teleport
 * 
 * Verifica condizioni vittoria e avvia sequenza narrativa immediata:
 * - Incontro Ferenc all'atrio (mostra dialogo + viaggio)
 * - Teleport automatico istantaneo a luogo 59 (Barriera americana)
 * 
 * Prerequisiti per trigger (al luogo ID=1):
 * 1. hasLight = true (fonte di luce attiva)
 * 2. Fascicolo (ID=16) con IDLuogo=0 (in inventario)
 * 3. Lista di servizio (ID=6) con IDLuogo=0 (in inventario)
 * 4. Dossier (ID=34) con IDLuogo=0 (in inventario)
 * 
 * Sprint: Sistema Vittoria - Parte 1 (Ferenc + Teleport)
 */

import { getSystemMessage } from '../systemMessages.js';
import { CONFIG } from '../../game/odessa/config.js';

// Fascicolo, Lista di servizio, Dossier (TD Lotto 3, §3.2: oggetti.vittoria).
const [FASCICOLO_ID, LISTA_ID, DOSSIER_ID] = CONFIG.oggetti.vittoria;

/**
 * Verifica se il giocatore ha i prerequisiti per la vittoria
 * @param {Object} gameState - Stato del gioco
 * @returns {boolean} - True se tutti i prerequisiti sono soddisfatti
 */
function checkVictoryPrerequisites(gameState) {
  // Prerequisito 1: luogo iniziale (Atrio)
  if (gameState.currentLocationId !== CONFIG.luoghi.iniziale) {
    return false;
  }

  // Prerequisito 2: hasLight = true
  if (!gameState.turn.current.hasLight) {
    return false;
  }

  // Prerequisito 3: Fascicolo in inventario
  const fascicolo = gameState.Oggetti.find(o => o.ID === FASCICOLO_ID);
  if (!fascicolo || fascicolo.IDLuogo !== 0) {
    return false;
  }

  // Prerequisito 4: Lista di servizio in inventario
  const lista = gameState.Oggetti.find(o => o.ID === LISTA_ID);
  if (!lista || lista.IDLuogo !== 0) {
    return false;
  }

  // Prerequisito 5: Dossier in inventario
  const dossier = gameState.Oggetti.find(o => o.ID === DOSSIER_ID);
  if (!dossier || dossier.IDLuogo !== 0) {
    return false;
  }

  return true;
}

/**
 * Avvia la sequenza finale - Incontro Ferenc + Teleport immediato
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando da modificare
 */
function startEndingSequence(gameState, result) {
  // Assegna i punti per l'incontro con Ferenc
  gameState.punteggio.totale += CONFIG.punteggio.ferenc;

  // Ottieni testo Ferenc (dialogo + viaggio combinati)
  const ferencText = getSystemMessage('victory.phase1a', gameState.currentLingua);

  // Esegui teleport passando messaggio Ferenc da mostrare
  teleportToBarrier(gameState, result, ferencText);
}

/**
 * Teleporta il giocatore al luogo 59 e rimuove gli oggetti (R11, BAS 1030–1050):
 * spariscono tutti, tranne i Documenti (ID 35) se sono in inventario.
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando da modificare
 * @param {string} customMessage - Messaggio da mostrare (opzionale, default: suggerimento)
 */
function teleportToBarrier(gameState, result, customMessage) {
  for (const oggetto of gameState.Oggetti) {
    if (oggetto.ID === CONFIG.oggetti.documenti && oggetto.IDLuogo === 0) continue;
    oggetto.Attivo = 0;        // Invisibile e non interagibile
    oggetto.IDLuogo = -1;      // Rimosso dal gioco
    oggetto.Inventario = false; // Non in inventario
  }

  // La lampada non esiste più: la regola della lampada abbandonata non deve scattare
  gameState.timers.lampadaAccesa = false;

  // Ferenc ferma i timer (BAS 840); l'alba si ferma con narrativeState (dawnEffect)
  gameState.turn.darknessTimer = 0;
  gameState.turn.openAreaTimer = 0;

  // Timer della guardia: comandi liberi, poi arresto (R4)
  gameState.guardTimer = CONFIG.regole.timerGuardia;

  // Teleport alla barriera
  gameState.currentLocationId = CONFIG.luoghi.barriera;
  gameState.turn.current.location = CONFIG.luoghi.barriera;

  // Assegna il punto per l'arrivo alla barriera
  gameState.visitedPlaces.add(CONFIG.luoghi.barriera);
  gameState.punteggio.totale += CONFIG.punteggio.luogo;

  // Blocca TUTTI i movimenti (per la fase 2)
  gameState.movementBlocked = true;

  // Imposta stato narrativo
  gameState.narrativeState = 'ENDING_PHASE_2_WAIT';
  gameState.narrativePhase = 2;
  gameState.awaitingContinue = false; // Non in attesa, aspetta comandi

  // SOVRASCRIVE il result per comunicare teleport al client
  result.accepted = true;
  result.resultType = 'TELEPORT';
  result.message = customMessage || '💡 SUGGERIMENTO: Devi porgere i documenti alla guardia.';
  result.locationId = CONFIG.luoghi.barriera; // Client deve aggiornare location
  result.teleport = true;           // Flag per client
  result.narrativePhase = 'ENDING_PHASE_2_WAIT';
}

/**
 * Victory Effect - Middleware per sequenza finale Ferenc
 * 
 * Pattern middleware puro (come gameOverEffect):
 * - Controlla narrativeState per determinare fase corrente
 * - Sovrascrive result per comunicare con client
 * - Gestisce sequenza immediata: trigger → teleport diretto (senza input intermedio)
 * 
 * Ordine esecuzione:
 * 1. Verifica prerequisiti vittoria per primo trigger
 * 2. Se soddisfatti: +4 punti Ferenc, teleport immediato a luogo 59 (+1 punto)
 * 
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando da modificare
 */
export function victoryEffect(gameState, result) {
  // Guard: Non eseguire se già in game over o vittoria completa
  if (gameState.awaitingRestart || gameState.ended || gameState.victory) {
    return;
  }

  // === CHECK PREREQUISITI VITTORIA ===
  // Verifica condizioni ad ogni turno normale per trigger
  
  if (!gameState.narrativeState) {
    if (checkVictoryPrerequisites(gameState)) {
      startEndingSequence(gameState, result);
      // result modificato con TELEPORT, client mostrerà messaggio Ferenc e teleporterà a luogo 59
    }
  }
}
