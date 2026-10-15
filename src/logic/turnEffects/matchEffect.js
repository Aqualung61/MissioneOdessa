/**
 * Match Effect - Timer del fiammifero acceso (R8, regola originale BAS 360, 500, 1210–1220)
 *
 * `timers.matchTimer` vale 2 appena acceso (impostato da `accendi fiammifero` nel motore o
 * dall'effetto CONSUMA_FIAMMIFERO) e scende di 1 a ogni turno consumato: il comando che accende
 * il fiammifero ha già luce a fine turno (2 → 1); il comando successivo si esegue con luce e,
 * a fine turno, il fiammifero si spegne (1 → 0, "Il fiammifero si spegne.").
 *
 * Salva `turn.current.matchLitAtStart` (valore prima della discesa) per la regola della lampada
 * lasciata accesa (§4.5, gameOverEffect). Deve essere il PRIMO effetto del registro: ricalcola
 * `turn.current.hasLight` prima che gli altri effetti (buio compreso) la usino.
 */

import { getSystemMessage } from '../systemMessages.js';
import { hasFonteLuceAttiva } from './torchEffect.js';
import { appendTurnMessage } from './appendMessage.js';

/**
 * Applica l'effetto del fiammifero acceso al turno corrente
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando (riceve l'avviso di spegnimento)
 */
export function matchEffect(gameState, result) {
  const timers = gameState.timers;
  if (typeof timers.matchTimer !== 'number') {
    timers.matchTimer = 0;
  }

  gameState.turn.current.matchLitAtStart = timers.matchTimer > 0;

  if (timers.matchTimer > 0) {
    timers.matchTimer -= 1;
    if (timers.matchTimer === 0) {
      appendTurnMessage(result, getSystemMessage('engine.matches.out', gameState.currentLingua));
    }
  }

  gameState.turn.current.hasLight = hasFonteLuceAttiva(gameState);
}
