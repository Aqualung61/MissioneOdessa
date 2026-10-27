/**
 * Torch Effect - Sistema illuminazione torcia
 *
 * Gestisce:
 * - Usura torcia dopo 6 turni consuming (totalTurnsConsumed >= 6)
 * - Penalità immediata se torcia posata (IDLuogo != 0)
 * - Aggiornamento hasLight in base a disponibilità fonti luce
 */

import { getSystemMessage } from '../systemMessages.js';
import { CONFIG } from '../../game/odessa/config.js';
import { hasActiveLight as hasFonteLuceAttiva } from '../../game/odessa/rules.js';

// La verifica della fonte di luce vive in `game/odessa/rules.js`;
// qui resta riesportata con il nome storico.
export { hasFonteLuceAttiva };

/**
 * Applica effetto torcia al turno corrente
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando da modificare
 * @param {Object} _parseResult - Comando parsato (non usato)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function torchEffect(gameState, result, _parseResult) {
  // Guard clause: controlla torcia solo se non ancora difettosa (check una-tantum)
  if (!gameState.timers.torciaDifettosa) {
    const torcia = gameState.Oggetti.find((o) => o.ID === CONFIG.oggetti.torcia);

    // PENALITÀ: Torcia posata → diventa immediatamente difettosa
    if (torcia && torcia.IDLuogo !== 0) {
      gameState.timers.torciaDifettosa = true;

      // Messaggio differenziato in base a disponibilità lampada
      if (!gameState.timers.lampadaAccesa) {
        // Nessuna lampada: messaggio con warning
        const fullMsg = getSystemMessage('timer.torch.defective.warning', gameState.currentLingua);
        result.message += '\n\n' + fullMsg;
        gameState.turn.current.torchDefectiveWarning = true;
      } else {
        // Ha la lampada: solo messaggio base
        const baseMsg = getSystemMessage('timer.torch.defective', gameState.currentLingua);
        result.message += '\n\n' + baseMsg;
      }

      // Ricalcola hasLight immediatamente (se non c'è lampada, diventa false)
      gameState.turn.current.hasLight = hasFonteLuceAttiva(gameState);
    }
    // USURA: Dopo 6 turni consuming, la torcia si esaurisce
    else if (gameState.turn.totalTurnsConsumed >= CONFIG.regole.turniTorciaFunzionante) {
      gameState.timers.torciaDifettosa = true;

      // Messaggio differenziato in base a disponibilità lampada
      if (!gameState.timers.lampadaAccesa) {
        // Nessuna lampada: messaggio con warning
        const fullMsg = getSystemMessage('timer.torch.defective.warning', gameState.currentLingua);
        result.message += '\n\n' + fullMsg;
        gameState.turn.current.torchDefectiveWarning = true;
      } else {
        // Ha la lampada: solo messaggio base
        const baseMsg = getSystemMessage('timer.torch.defective', gameState.currentLingua);
        result.message += '\n\n' + baseMsg;
      }

      // Ricalcola hasLight immediatamente (se non c'è lampada, diventa false)
      gameState.turn.current.hasLight = hasFonteLuceAttiva(gameState);
    }
  }
}
