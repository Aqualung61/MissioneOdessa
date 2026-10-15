/**
 * Dawn Effect - Timer dell'alba (R3, regola originale BAS 1360–1520, 2170)
 *
 * Limite: 200 turni consumati. `GAME_MAX_TURNS_CONSUMED` (intero positivo) lo sostituisce,
 * solo per test e prove manuali.
 * Avvisi quando restano 30, 15 e 5 turni; il timer si ferma all'incontro con Ferenc
 * (`narrativeState` non nullo). La morte è decisa da gameOverEffect.
 */

import { getSystemMessage } from '../systemMessages.js';
import { appendTurnMessage } from './appendMessage.js';

export const DAWN_TURN_LIMIT = 200;

const DAWN_WARNINGS = {
  30: 'timer.dawn.warning30',
  15: 'timer.dawn.warning15',
  5: 'timer.dawn.warning5',
};

/**
 * Limite dell'alba in turni consumati.
 * @returns {number}
 */
export function getDawnTurnLimit() {
  const raw = process.env.GAME_MAX_TURNS_CONSUMED;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return DAWN_TURN_LIMIT;
  }

  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DAWN_TURN_LIMIT;
  }

  return parsed;
}

/**
 * Applica effetto alba al turno corrente
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando (riceve l'avviso)
 */
export function dawnEffect(gameState, result) {
  if (gameState.narrativeState) {
    return;
  }

  const remaining = getDawnTurnLimit() - gameState.turn.totalTurnsConsumed;
  const key = DAWN_WARNINGS[remaining];
  if (key) {
    appendTurnMessage(result, getSystemMessage(key, gameState.currentLingua));
  }
}
