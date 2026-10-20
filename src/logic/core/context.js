// Contesto di esecuzione di un comando (TD Lotto 4a, §3.2). Si crea a ogni chiamata di
// `executeCommand`, mai in cache: `gameState` viene riassegnato da `resetGameState` e
// `setGameState`, e il contesto deve leggere lo stato corrente.
import { getSystemMessage } from '../systemMessages.js';

/**
 * @param {Object} state - lo stesso oggetto `gameState` corrente (nessuna copia)
 * @param {Object} game - definizione del gioco (es. `odessaGame`)
 * @param {Object} helpers - funzioni del motore esposte ai gestori
 */
export function createContext(state, game, helpers) {
  return {
    state,
    game,
    // La lingua è letta a ogni chiamata; `params` assente equivale a `[]` (systemMessages.js)
    msg: (key, params) => getSystemMessage(key, state.currentLingua, params),
    helpers,
  };
}
