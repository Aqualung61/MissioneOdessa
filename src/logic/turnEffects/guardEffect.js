/**
 * Guard Effect - Timer della guardia alla barriera (R4, regola originale BAS 1530–1650)
 *
 * All'arrivo alla barriera (luogo 59) `guardTimer` vale 5 (impostato da victoryEffect).
 * A ogni turno consumato nel luogo 59, compreso il movimento bloccato, scende di 1:
 * a 3, 2 e 1 gli avvisi della guardia; a 0 l'arresto, deciso da gameOverEffect.
 * Porgere i documenti porta alla vittoria (`ended`), che ha precedenza sull'arresto.
 */

import { getSystemMessage } from '../systemMessages.js';
import { appendTurnMessage } from './appendMessage.js';
import { CONFIG } from '../../game/odessa/config.js';

const GUARD_WARNINGS = CONFIG.regole.avvisiGuardia;

/**
 * Applica effetto guardia al turno corrente
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando (riceve l'avviso)
 */
export function guardEffect(gameState, result) {
  if (gameState.ended || gameState.awaitingRestart) {
    return;
  }
  if (gameState.narrativeState !== 'ENDING_PHASE_2_WAIT' || gameState.currentLocationId !== CONFIG.luoghi.barriera) {
    return;
  }

  if (typeof gameState.guardTimer !== 'number') {
    gameState.guardTimer = CONFIG.regole.timerGuardia;
  }
  gameState.guardTimer -= 1;
  const key = GUARD_WARNINGS[gameState.guardTimer];
  if (key) {
    appendTurnMessage(result, getSystemMessage(key, gameState.currentLingua));
  }
}
