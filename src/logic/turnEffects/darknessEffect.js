/**
 * Darkness Effect - Timer del buio (R1, regola originale BAS 360, 780, 1230–1280)
 *
 * Gestisce:
 * - `turn.darknessTimer`: senza luce parte a 3 e scende di 1 a ogni turno consumato;
 * - allo scadere si muore solo se il comando del turno era un movimento (riuscito o no);
 *   altrimenti, se si è ancora al buio, il timer riparte da 3;
 * - ritrovata la luce il timer si azzera (deviazione minima e dichiarata dall'originale);
 * - avviso "È pericoloso muoversi senza luce." a ogni turno che termina senza luce.
 *
 * La morte è decisa da gameOverEffect tramite `turn.current.darknessExpired`.
 * `turn.turnsInDarkness` resta nello stato solo per compatibilità dei salvataggi.
 *
 * Dipendenza: DEVE essere eseguito DOPO torchEffect perché usa hasLight aggiornato.
 */

import { getSystemMessage } from '../systemMessages.js';
import { appendTurnMessage } from './appendMessage.js';
import { CONFIG } from '../../game/odessa/config.js';

/**
 * Applica effetto darkness al turno corrente
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando (riceve l'avviso)
 * @param {Object} parseResult - Comando parsato (tipo di comando)
 */
export function darknessEffect(gameState, result, parseResult) {
  const turn = gameState.turn;
  const hasLight = turn.current.hasLight;
  if (typeof turn.darknessTimer !== 'number') {
    turn.darknessTimer = 0;
  }

  if (turn.darknessTimer > 0) {
    turn.darknessTimer -= 1;
    if (turn.darknessTimer === 0 && parseResult?.CommandType === 'NAVIGATION') {
      turn.current.darknessExpired = true;
      return;
    }
  }

  if (!hasLight) {
    if (turn.darknessTimer === 0) {
      turn.darknessTimer = CONFIG.regole.timerBuio;
    }
    // L'avviso di torcia guasta contiene già l'avviso di pericolo
    if (gameState.currentLocationId !== CONFIG.luoghi.barriera && !turn.current.torchDefectiveWarning) {
      appendTurnMessage(result, getSystemMessage('timer.darkness.warning', gameState.currentLingua));
    }
  } else {
    turn.darknessTimer = 0;
  }
}
