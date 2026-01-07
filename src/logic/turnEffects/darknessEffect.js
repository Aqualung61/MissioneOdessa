/**
 * Darkness Effect - Sistema contatore buio
 * 
 * Gestisce:
 * - Countdown turni senza luce (hasLight === false)
 * - Reset automatico quando si recupera fonte di luce
 * - Incremento contatore turnsInDarkness
 * 
 * NOTA: Il game over (morte dopo 3 turni) è gestito da gameOverEffect.js
 * che DEVE essere eseguito DOPO questo effect per valutare il contatore aggiornato.
 * 
 * Dipendenza: DEVE essere eseguito DOPO torchEffect perché usa hasLight
 * aggiornato dalla gestione illuminazione.
 * 
 * Sprint 3.3.5.B
 */

import { getSystemMessage } from '../systemMessages.js';

/**
 * Applica effetto darkness al turno corrente
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando da modificare
 * @param {Object} parseResult - Comando parsato
 */
export function darknessEffect(gameState, result, parseResult) {
  // Usa hasLight già calcolato da torchEffect/prepareTurnContext
  const hasLight = gameState.turn.current.hasLight;
  const hadLightBefore = gameState.turn.previous.hasLight;

  if (!hasLight) {
    // NON incrementare al PRIMO turno di buio (quando previous aveva luce)
    // Questo dà all'utente 3 turni pieni invece di 2:
    // Turno 6 (primo buio): counter=0
    // Turno 7: counter=1
    // Turno 8: counter=2
    // Turno 9: counter=3 → MORTE
    if (!hadLightBefore) {
      gameState.turn.turnsInDarkness++;
    }
    
    // Nessun warning durante i primi 2 turni (specifica: morte improvvisa)
    // Il game over al 3° turno sarà gestito da gameOverEffect
  } else {
    // Reset counter quando si recupera luce
    if (gameState.turn.turnsInDarkness > 0) {
      gameState.turn.turnsInDarkness = 0;
    }
  }
}
