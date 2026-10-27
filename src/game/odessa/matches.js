// Fiammiferi di Odessa (R8): la scorta, il
// consumo e il comando `accendi fiammifero` sono regole del gioco, non del motore.
// Ricevono lo stato corrente e la configurazione del gioco; non conservano nulla tra due chiamate.
import { getSystemMessage } from '../../logic/systemMessages.js';

/**
 * Consuma un fiammifero (R8, §4.2): usata da `accendi fiammifero` e dall'effetto
 * CONSUMA_FIAMMIFERO (interazione `accendi_lampada`). Se la scorta si esaurisce,
 * i Fiammiferi (ID 36) spariscono dal gioco.
 * @param {Object} gameState - stato corrente
 * @param {Object} config - configurazione del gioco (`game.config`)
 * @returns {boolean} true se i fiammiferi sono appena finiti
 */
export function consumaFiammifero(gameState, config) {
  if (typeof gameState.timers.matchesLeft !== 'number') {
    gameState.timers.matchesLeft = config.regole.fiammiferiIniziali;
  }
  gameState.timers.matchesLeft = Math.max(0, gameState.timers.matchesLeft - 1);
  if (gameState.timers.matchesLeft === 0) {
    const fiammiferi = gameState.Oggetti.find((o) => o.ID === config.oggetti.fiammiferi);
    if (fiammiferi) {
      fiammiferi.IDLuogo = -1;
      fiammiferi.Attivo = 0;
      fiammiferi.Inventario = false;
    }
    return true;
  }
  return false;
}

/**
 * Gestisce `accendi fiammifero` (R8, §4.3): non è un'interazione di Interazioni.json
 * (nessun punteggio). Ammesso se i Fiammiferi sono in inventario o nel luogo corrente.
 * @param {Object} gameState - stato corrente
 * @param {Object} config - configurazione del gioco (`game.config`)
 */
export function accendiFiammifero(gameState, config) {
  const fiammiferi = gameState.Oggetti.find(
    (o) =>
      o.ID === config.oggetti.fiammiferi &&
      (o.IDLuogo === 0 || o.IDLuogo === gameState.currentLocationId) &&
      o.Attivo >= 1
  );
  if (!fiammiferi || !(gameState.timers.matchesLeft > 0)) {
    return {
      accepted: true,
      resultType: 'OK',
      message: getSystemMessage('engine.matches.none', gameState.currentLingua),
      effects: [],
    };
  }

  const finished = consumaFiammifero(gameState, config);
  gameState.timers.matchTimer = config.regole.turniLuceFiammifero;
  let message = getSystemMessage('engine.matches.lit', gameState.currentLingua);
  if (finished) {
    message += '\n\n' + getSystemMessage('engine.matches.finished', gameState.currentLingua);
  }
  return { accepted: true, resultType: 'OK', message, effects: [] };
}
