/**
 * Game Over Effect - Sistema unificato condizioni morte/game over
 * 
 * Centralizza TUTTE le verifiche di game over post-turno, in quest'ordine:
 * - Lampada abbandonata
 * - Buio (timer scaduto con un movimento, R1)
 * - Luogo terminale (Terminale === -1)
 * - Zona aperta (secondo comando consecutivo senza spostamento, R2)
 * - Guardia alla barriera (arresto al 5° comando, R4)
 * - Alba (limite di turni consumati, R3)
 *
 * Questo effect DEVE seguire gli effetti dei timer nel registry TURN_EFFECTS perché
 * valuta i timer già aggiornati.
 *
 * Sprint 3.3.5.B (refactoring unificazione game over)
 */

import { getSystemMessage } from '../systemMessages.js';
import { OPEN_AREA_LOCATIONS } from './interceptEffect.js';
import { getDawnTurnLimit } from './dawnEffect.js';

function setGameOver(gameState, result, messageKey, reason) {
  result.accepted = false;
  result.resultType = 'GAME_OVER';
  result.message = getSystemMessage(messageKey, gameState.currentLingua);
  result.gameOver = true;
  result.gameOverReason = reason;
  gameState.awaitingRestart = true;
}

/**
 * Verifica tutte le condizioni di game over post-turno.
 * Se una condizione è soddisfatta, imposta awaitingRestart e ritorna game over.
 * 
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando da modificare
 * @param {Object} _parseResult - Comando parsato (non usato)
 */
export function gameOverEffect(gameState, result, parseResult) {
  // Guard: Se già in game over, non verificare altre condizioni
  if (gameState.awaitingRestart || gameState.ended) {
    return;
  }

  // === CHECK 0: LAMPADA ABBANDONATA (design) ===
  // Se il giocatore lascia la lampada accesa a terra e si sposta in un altro luogo,
  // e non ha altre fonti di luce (torcia in inventario e funzionante), game over immediato.
  if (parseResult?.CommandType === 'NAVIGATION' && gameState.timers.lampadaAccesa === true) {
    const lampada = (gameState.Oggetti || []).find((o) => o.ID === 27);

    // La regola si applica solo se la lampada è accesa ma NON è in inventario.
    if (lampada && lampada.IDLuogo !== 0) {
      const previousLocationId = gameState.turn?.previous?.location;
      const currentLocationId = gameState.currentLocationId;
      const movedAwayFromLampRoom =
        typeof previousLocationId === 'number' &&
        previousLocationId === lampada.IDLuogo &&
        currentLocationId !== lampada.IDLuogo;

      if (movedAwayFromLampRoom) {
        const torcia = (gameState.Oggetti || []).find((o) => o.ID === 37);
        const hasWorkingTorchInInventory =
          !!torcia &&
          torcia.IDLuogo === 0 &&
          gameState.timers.torciaDifettosa !== true;

        // Opzione di design (scelta): morte immediata solo se la lampada era l'unica luce.
        if (!hasWorkingTorchInInventory) {
          const lampAbandonedMsg = getSystemMessage('timer.lamp.abandoned.death', gameState.currentLingua);

          result.accepted = false;
          result.resultType = 'GAME_OVER';
          result.message = lampAbandonedMsg;
          result.gameOver = true;
          result.gameOverReason = 'LAMP_ABANDONED';
          gameState.awaitingRestart = true;
          return;
        }
      }
    }
  }

  // === CHECK 1: DARKNESS DEATH (R1) ===
  // Timer del buio scaduto con un comando di movimento (riuscito o no)
  if (gameState.turn.current?.darknessExpired === true) {
    setGameOver(gameState, result, 'timer.darkness.death', 'DARKNESS');
    return; // Game over triggato, non verificare altre condizioni
  }

  // === CHECK 2: LUOGO TERMINALE ===
  // Luoghi con Terminale === -1 (es. ID 8, 40, 54)
  const currentLuogo = global.odessaData.Luoghi.find(
    l => l.ID === gameState.currentLocationId && l.IDLingua === gameState.currentLingua
  );
  
  if (currentLuogo && currentLuogo.Terminale === -1) {
    // Messaggio i18n (senza domanda riavvio, la aggiunge il client)
    const terminalMsg = getSystemMessage('game.terminal.location', gameState.currentLingua) || 'Hai raggiunto un luogo terminale.';
    
    result.accepted = false;
    result.resultType = 'GAME_OVER';
    result.message = terminalMsg;
    result.gameOver = true;
    result.gameOverReason = 'TERMINAL_LOCATION';
    
    gameState.awaitingRestart = true;
    return;
  }

  // === CHECK 3: ZONA APERTA (R2) ===
  // Secondo comando consecutivo senza spostamento nella zona aperta
  if (gameState.turn.current?.openAreaExpired === true) {
    setGameOver(gameState, result, 'game.intercept.death', 'INTERCEPT');
    return;
  }

  // === CHECK 4: GUARDIA ALLA BARRIERA (R4) ===
  // Timer della guardia scaduto senza aver porto i documenti
  if (gameState.narrativeState === 'ENDING_PHASE_2_WAIT' &&
      gameState.currentLocationId === 59 &&
      typeof gameState.guardTimer === 'number' &&
      gameState.guardTimer <= 0) {
    setGameOver(gameState, result, 'timer.guard.arrest', 'GUARD_ARREST');
    return;
  }

  // === CHECK 5: ALBA (R3) ===
  // Limite di turni consumati (comandi SYSTEM esclusi); fermo dopo l'incontro con Ferenc.
  if (!gameState.narrativeState && gameState.turn.totalTurnsConsumed >= getDawnTurnLimit()) {
    const messageKey = OPEN_AREA_LOCATIONS.includes(gameState.currentLocationId)
      ? 'timer.dawn.death.outdoor'
      : 'timer.dawn.death.house';
    setGameOver(gameState, result, messageKey, 'TOO_LATE');
  }
}
