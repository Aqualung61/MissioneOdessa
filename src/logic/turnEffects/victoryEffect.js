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

/**
 * Verifica se il giocatore ha i prerequisiti per la vittoria
 * @param {Object} gameState - Stato del gioco
 * @returns {boolean} - True se tutti i prerequisiti sono soddisfatti
 */
function checkVictoryPrerequisites(gameState) {
  // Prerequisito 1: Luogo ID=1 (Atrio)
  if (gameState.currentLocationId !== 1) {
    return false;
  }

  // Prerequisito 2: hasLight = true
  if (!gameState.turn.current.hasLight) {
    return false;
  }

  // Prerequisito 3: Fascicolo (ID=16) in inventario
  const fascicolo = gameState.Oggetti.find(o => o.ID === 16);
  if (!fascicolo || fascicolo.IDLuogo !== 0) {
    return false;
  }

  // Prerequisito 4: Lista di servizio (ID=6) in inventario
  const lista = gameState.Oggetti.find(o => o.ID === 6);
  if (!lista || lista.IDLuogo !== 0) {
    return false;
  }

  // Prerequisito 5: Dossier (ID=34) in inventario
  const dossier = gameState.Oggetti.find(o => o.ID === 34);
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
  // Assegna +4 punti per l'incontro con Ferenc
  gameState.punteggio.totale += 4;

  // Ottieni testo Ferenc (dialogo + viaggio combinati)
  const ferencText = getSystemMessage('victory.phase1a', gameState.currentLingua);

  // Esegui teleport passando messaggio Ferenc da mostrare
  teleportToBarrier(gameState, result, ferencText);
}

/**
 * Teleporta il giocatore al luogo 59 e rimuove gli oggetti presi da Ferenc
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando da modificare
 * @param {string} customMessage - Messaggio da mostrare (opzionale, default: suggerimento)
 */
function teleportToBarrier(gameState, result, customMessage) {
  // Ferenc prende i 3 oggetti prerequisito
  const fascicolo = gameState.Oggetti.find(o => o.ID === 16);
  const lista = gameState.Oggetti.find(o => o.ID === 6);
  const dossier = gameState.Oggetti.find(o => o.ID === 34);

  if (fascicolo) {
    fascicolo.Attivo = 0;        // Invisibile e non interagibile
    fascicolo.IDLuogo = -1;      // Rimosso dal gioco
    fascicolo.Inventario = false; // Non in inventario
  }

  if (lista) {
    lista.Attivo = 0;
    lista.IDLuogo = -1;
    lista.Inventario = false;
  }

  if (dossier) {
    dossier.Attivo = 0;
    dossier.IDLuogo = -1;
    dossier.Inventario = false;
  }

  // Teleport al luogo 59
  gameState.currentLocationId = 59;
  gameState.turn.current.location = 59;

  // Assegna +1 punto per arrivo al luogo 59
  gameState.visitedPlaces.add(59);
  gameState.punteggio.totale += 1;

  // Blocca TUTTI i movimenti (per la fase 2)
  gameState.movementBlocked = true;

  // Reset counter comandi inappropriati (per fase 2)
  gameState.unusefulCommandsCounter = 0;

  // Imposta stato narrativo
  gameState.narrativeState = 'ENDING_PHASE_2_WAIT';
  gameState.narrativePhase = 2;
  gameState.awaitingContinue = false; // Non in attesa, aspetta comandi

  // SOVRASCRIVE il result per comunicare teleport al client
  result.accepted = true;
  result.resultType = 'TELEPORT';
  result.message = customMessage || '💡 SUGGERIMENTO: Devi porgere i documenti alla guardia.';
  result.locationId = 59;          // Client deve aggiornare location
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
