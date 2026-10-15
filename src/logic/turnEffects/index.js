/**
 * Turn Effects Registry
 *
 * Sistema middleware per gestire effetti temporali post-esecuzione comando.
 * Ogni effetto è un modulo separato che modifica gameState e result in base
 * alle conseguenze temporali del turno (timer, contatori, game over).
 *
 * L'ordine nell'array TURN_EFFECTS definisce la priorità di esecuzione:
 * 1. Torch effect (luce)
 * 2. Darkness effect (timer del buio)
 * 3. Intercept effect (timer della zona aperta)
 * 4. Dawn effect (timer dell'alba)
 * 5. Guard effect (timer della guardia alla barriera)
 * 6. Game over effect (controllo condizioni di fine partita)
 * 7. Victory effect (sequenza finale Ferenc + teleport)
 *
 * Nota: i “misteri” sono gestiti dal sistema punteggio in engine (non come turnEffect).
 */

import { torchEffect } from './torchEffect.js';
import { darknessEffect } from './darknessEffect.js';
import { interceptEffect } from './interceptEffect.js';
import { dawnEffect } from './dawnEffect.js';
import { guardEffect } from './guardEffect.js';
import { gameOverEffect } from './gameOverEffect.js';
import { victoryEffect } from './victoryEffect.js';

/**
 * Registry di tutti gli effetti temporali applicati al turno.
 * L'ordine definisce la priorità di esecuzione.
 *
 * IMPORTANTE:
 * - darkness DEVE essere dopo torch perché dipende da hasLight aggiornato
 * - i timer (buio, zona aperta, alba, guardia) si aggiornano PRIMA di gameOverEffect,
 *   che valuta le condizioni di fine partita sui timer aggiornati
 * - victoryEffect controlla vittoria DOPO tutti i check game over
 */
export const TURN_EFFECTS = [
  torchEffect,       // Priorità 1: Sistema illuminazione torcia (aggiorna hasLight)
  darknessEffect,    // Priorità 2: Timer del buio (R1)
  interceptEffect,   // Priorità 3: Timer della zona aperta (R2)
  dawnEffect,        // Priorità 4: Timer dell'alba (R3)
  guardEffect,       // Priorità 5: Timer della guardia alla barriera (R4)
  gameOverEffect,    // Priorità 6: Verifica condizioni di fine partita
  victoryEffect,     // Priorità 7: Sequenza finale Ferenc + teleport (trigger vittoria)
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
