/**
 * Intercept Effect - Timer della zona aperta (R2, regola originale BAS 1290–1350, 2190)
 *
 * Luoghi della zona: 51, 52, 53, 55, 56, 58 (luoghi 26–31 dell'originale).
 * - fuori dalla zona: `turn.openAreaTimer = 0`;
 * - entrando (movimento riuscito nella zona): timer a 2 e avviso;
 * - comando senza spostamento nella zona: il timer scende; a 0 la ronda arresta il giocatore,
 *   altrimenti avviso. Un movimento fallito non è uno spostamento.
 * In pratica si muore al secondo comando consecutivo senza spostamento nella zona.
 *
 * La morte è decisa da gameOverEffect tramite `turn.current.openAreaExpired`.
 * `turn.turnsInDangerZone` resta nello stato solo per compatibilità dei salvataggi.
 */

import { getSystemMessage } from '../systemMessages.js';
import { appendTurnMessage } from './appendMessage.js';
import { CONFIG } from '../../game/odessa/config.js';

export const OPEN_AREA_LOCATIONS = CONFIG.luoghi.zoneAperte;

/**
 * Applica effetto zona aperta al turno corrente
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando (riceve l'avviso)
 */
export function interceptEffect(gameState, result) {
  const turn = gameState.turn;

  if (!OPEN_AREA_LOCATIONS.includes(gameState.currentLocationId)) {
    turn.openAreaTimer = 0;
    return;
  }

  const warning = getSystemMessage('timer.openArea.warning', gameState.currentLingua);

  if (turn.movedThisTurn) {
    turn.openAreaTimer = CONFIG.regole.timerZonaAperta;
    appendTurnMessage(result, warning);
    return;
  }

  // Stato caricato o inconsistente: nella zona il timer deve essere attivo
  if (!(turn.openAreaTimer > 0)) {
    turn.openAreaTimer = CONFIG.regole.timerZonaAperta;
  }
  turn.openAreaTimer -= 1;

  if (turn.openAreaTimer === 0) {
    turn.current.openAreaExpired = true;
    return;
  }
  appendTurnMessage(result, warning);
}
