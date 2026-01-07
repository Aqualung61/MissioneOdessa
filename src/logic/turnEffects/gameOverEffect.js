/**
 * Game Over Effect - Sistema unificato condizioni morte/game over
 * 
 * Centralizza TUTTE le verifiche di game over post-turno:
 * - Darkness death (3 turni senza luce)
 * - Luogo terminale (Terminale === -1)
 * - Intercettazione (3 turni in zona pericolosa)
 * - Guardia insospettita (futuro Sprint 3.4)
 * 
 * Questo effect DEVE essere l'ultimo nel registry TURN_EFFECTS perché
 * valuta i contatori già aggiornati dagli altri effects.
 * 
 * Sprint 3.3.5.B (refactoring unificazione game over)
 */

import { getSystemMessage } from '../systemMessages.js';

/**
 * Verifica tutte le condizioni di game over post-turno.
 * Se una condizione è soddisfatta, imposta awaitingRestart e ritorna game over.
 * 
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando da modificare
 * @param {Object} parseResult - Comando parsato
 */
export function gameOverEffect(gameState, result, parseResult) {
  // Guard: Se già in game over, non verificare altre condizioni
  if (gameState.awaitingRestart || gameState.ended) {
    return;
  }

  // === CHECK 1: DARKNESS DEATH ===
  // 3 turni consecutivi senza luce
  if (gameState.turn.turnsInDarkness >= 3) {
    const deathMsg = getSystemMessage('timer.darkness.death', gameState.currentLingua);
    
    result.accepted = false;
    result.resultType = 'GAME_OVER';
    result.message = deathMsg;
    result.gameOver = true;
    result.gameOverReason = 'DARKNESS';
    
    gameState.awaitingRestart = true;
    return; // Game over triggato, non verificare altre condizioni
  }

  // === CHECK 2: LUOGO TERMINALE ===
  // Luoghi con Terminale === -1 (es. ID 8, 40, 54)
  const currentLuogo = global.odessaData.Luoghi.find(
    l => l.ID === gameState.currentLocationId && l.IDLingua === gameState.currentLingua
  );
  
  console.log(`[gameOverEffect] Check luogo terminale: ID=${gameState.currentLocationId}, Terminale=${currentLuogo?.Terminale}`);
  
  if (currentLuogo && currentLuogo.Terminale === -1) {
    console.log('[gameOverEffect] LUOGO TERMINALE RILEVATO - triggering game over');
    
    // Messaggio i18n (senza domanda riavvio, la aggiunge il client)
    const terminalMsg = getSystemMessage('game.terminal.location', gameState.currentLingua) || 'Hai raggiunto un luogo terminale.';
    
    console.log('[gameOverEffect] Setting result fields:', {
      accepted: false,
      resultType: 'GAME_OVER',
      gameOver: true,
      gameOverReason: 'TERMINAL_LOCATION',
      messageLength: terminalMsg.length
    });
    
    result.accepted = false;
    result.resultType = 'GAME_OVER';
    result.message = terminalMsg;
    result.gameOver = true;
    result.gameOverReason = 'TERMINAL_LOCATION';
    
    gameState.awaitingRestart = true;
    console.log('[gameOverEffect] awaitingRestart set to:', gameState.awaitingRestart);
    console.log('[gameOverEffect] Returning from effect - result.gameOver:', result.gameOver);
    return;
  }

  // === CHECK 3: INTERCETTAZIONE ===
  // 3 turni in danger zone (luoghi 51,52,53,55,56,58)
  // TODO Sprint 3.3.5.C - attualmente gestito in runPreExecutionChecks
  // Considerare spostamento qui per coerenza architetturale
  
  // === CHECK 4: GUARDIA INSOSPETTITA ===
  // Troppi comandi inutili al luogo 59
  // TODO Sprint 3.4.B
  /*
  if (gameState.currentLocationId === 59 && 
      gameState.unusefulCommandsCounter >= LIMITE_COMANDI_INUTILI) {
    const guardMsg = getSystemMessage('narrative.guard.gameover', gameState.currentLingua);
    result.accepted = false;
    result.resultType = 'GAME_OVER';
    result.message = guardMsg;
    result.gameOver = true;
    result.gameOverReason = 'GUARD_SUSPICIOUS';
    gameState.awaitingRestart = true;
    return;
  }
  */
}
