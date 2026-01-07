/**
 * Turn Effects Registry
 * 
 * Sistema middleware per gestire effetti temporali post-esecuzione comando.
 * Ogni effetto è un modulo separato che modifica gameState e result in base
 * alle conseguenze temporali del turno (timer, contatori, game over).
 * 
 * L'ordine nell'array TURN_EFFECTS definisce la priorità di esecuzione:
 * 1. Torch effect (luce)
 * 2. Darkness effect (morte per buio) - TODO Sprint 3.3.5.B
 * 3. Intercept effect (intercettazione) - TODO Sprint 3.3.5.C
 * 4. Mystery effect (assegnazione misteri) - TODO Sprint 3.3.5.D
 */

import { torchEffect } from './torchEffect.js';
import { darknessEffect } from './darknessEffect.js';
import { gameOverEffect } from './gameOverEffect.js';
// import { interceptEffect } from './interceptEffect.js'; // TODO Sprint 3.3.5.C
// import { mysteryEffect } from './mysteryEffect.js';     // TODO Sprint 3.3.5.D

/**
 * Registry di tutti gli effetti temporali applicati al turno.
 * L'ordine definisce la priorità di esecuzione.
 * 
 * IMPORTANTE: 
 * - darkness DEVE essere dopo torch perché dipende da hasLight aggiornato
 * - gameOverEffect DEVE essere ULTIMO perché valuta contatori già aggiornati
 */
export const TURN_EFFECTS = [
  torchEffect,       // Priorità 1: Sistema illuminazione torcia (aggiorna hasLight)
  darknessEffect,    // Priorità 2: Contatore turni al buio (incrementa turnsInDarkness)
  gameOverEffect,    // Priorità 3: Verifica condizioni game over (darkness, terminale, ecc.)
  // interceptEffect,// Priorità 4: Intercettazione in zone pericolose (TODO)
  // mysteryEffect   // Priorità 5: Assegnazione automatica misteri (TODO)
];

/**
 * Applica tutti gli effetti temporali registrati al turno corrente.
 * Viene chiamata da applyTurnEffects() in engine.js dopo l'esecuzione del comando.
 * 
 * @param {Object} gameState - Stato del gioco (modificato direttamente)
 * @param {Object} result - Risultato comando (può essere modificato dagli effetti)
 * @param {Object} parseResult - Comando parsato (read-only per gli effetti)
 */
export function applyAllTurnEffects(gameState, result, parseResult) {
  for (const effect of TURN_EFFECTS) {
    effect(gameState, result, parseResult);
  }
}
