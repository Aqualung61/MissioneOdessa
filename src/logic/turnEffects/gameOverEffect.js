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

function getMaxTurnsConsumed() {
  const raw = process.env.GAME_MAX_TURNS_CONSUMED;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return null; // Disabilitato se non impostato
  }

  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
    return null; // Valore non valido => disabilitato
  }

  return parsed;
}

/**
 * Verifica tutte le condizioni di game over post-turno.
 * Se una condizione è soddisfatta, imposta awaitingRestart e ritorna game over.
 * 
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando da modificare
 * @param {Object} _parseResult - Comando parsato (non usato)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function gameOverEffect(gameState, result, _parseResult) {
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

  // === CHECK 3: INTERCETTAZIONE ===
  // N turni consuming in danger zone (luoghi 51,52,53,55,56,58)
  // Sprint 3.3.5.C: Sistema intercettazione pattuglie
  const INTERCEPT_TURNS_TO_DIE = 4;
  if (gameState.turn.turnsInDangerZone >= INTERCEPT_TURNS_TO_DIE) {
    const interceptMsg = getSystemMessage('game.intercept.death', gameState.currentLingua);
    result.accepted = false;
    result.resultType = 'GAME_OVER';
    result.message = interceptMsg;
    result.gameOver = true;
    result.gameOverReason = 'INTERCEPT';
    gameState.awaitingRestart = true;
    return;
  }
  
  // === CHECK 4: GUARDIA INSOSPETTITA ===
  // Troppi comandi inutili al luogo 59 (Sprint 3.3.5.D)
  if (gameState.narrativeState === 'ENDING_PHASE_2_WAIT' && 
      gameState.unusefulCommandsCounter >= 3) {
    const guardMsg = getSystemMessage('game.over.guardia_sospetta', gameState.currentLingua);
    result.accepted = false;
    result.resultType = 'GAME_OVER';
    result.message = guardMsg;
    result.gameOver = true;
    result.gameOverReason = 'GUARD_SUSPICIOUS';
    gameState.awaitingRestart = true;
    return;
  }

  // === CHECK 5: LIMITE TURNI CONSUMATI (ALBA) ===
  // Se si supera un limite previsto di turni che consumano tempo (escludendo i comandi SYSTEM), game over.
  const maxTurnsConsumed = getMaxTurnsConsumed();
  if (maxTurnsConsumed !== null && gameState.turn.totalTurnsConsumed >= maxTurnsConsumed) {
    const tooLateMsg = getSystemMessage('game.over.tooLate', gameState.currentLingua);
    result.accepted = false;
    result.resultType = 'GAME_OVER';
    result.message = tooLateMsg;
    result.gameOver = true;
    result.gameOverReason = 'TOO_LATE';
    gameState.awaitingRestart = true;
  }
}
