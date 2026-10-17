/**
 * Torch Effect - Sistema illuminazione torcia
 * 
 * Gestisce:
 * - Usura torcia dopo 6 turni consuming (totalTurnsConsumed >= 6)
 * - Penalità immediata se torcia posata (IDLuogo != 0)
 * - Aggiornamento hasLight in base a disponibilità fonti luce
 * 
 * Sprint 3.3.5.A
 */

import { getSystemMessage } from '../systemMessages.js';

/**
 * Verifica se c'è una fonte di luce attiva
 * @param {Object} gameState - Stato del gioco
 * @returns {boolean} true se ha luce (torcia funzionante, lampada accesa dove si trova,
 *   fiammifero acceso o luogo 59)
 */
export function hasFonteLuceAttiva(gameState) {
  // Alla barriera (luogo 59) la luce è garantita (BAS 1030–1050)
  if (gameState.currentLocationId === 59) return true;

  // Torcia: ID=37 in inventario E funzionante
  const torcia = gameState.Oggetti.find(o => o.ID === 37);
  const hasTorcia = torcia &&
                    torcia.IDLuogo === 0 &&
                    !gameState.timers.torciaDifettosa;

  // Lampada accesa: fa luce solo dove si trova, in inventario o nel luogo corrente (R8, §4.3)
  const lampada = gameState.Oggetti.find(o => o.ID === 27);
  const hasLampada = gameState.timers.lampadaAccesa &&
                      !!lampada &&
                      (lampada.IDLuogo === 0 || lampada.IDLuogo === gameState.currentLocationId);

  // Fiammifero acceso (R8): luce per il comando successivo a quello che lo accende
  const hasMatch = gameState.timers.matchTimer > 0;

  return hasTorcia || hasLampada || hasMatch;
}

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
    const torcia = gameState.Oggetti.find(o => o.ID === 37);
    
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
    else if (gameState.turn.totalTurnsConsumed >= 6) {
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
