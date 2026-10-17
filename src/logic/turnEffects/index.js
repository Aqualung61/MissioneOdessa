/**
 * Turn Effects Registry
 *
 * Sistema middleware per gestire effetti temporali post-esecuzione comando.
 * Ogni effetto è un modulo separato che modifica gameState e result in base
 * alle conseguenze temporali del turno (timer, contatori, game over).
 *
 * L'ordine nell'array TURN_EFFECTS definisce la priorità di esecuzione:
 * 1. Match effect (timer del fiammifero acceso)
 * 2. Torch effect (luce)
 * 3. Darkness effect (timer del buio)
 * 4. Intercept effect (timer della zona aperta)
 * 5. Dawn effect (timer dell'alba)
 * 6. Guard effect (timer della guardia alla barriera)
 * 7. Game over effect (controllo condizioni di fine partita)
 * 8. Victory effect (sequenza finale Ferenc + teleport)
 *
 * Nota: i “misteri” sono gestiti dal sistema punteggio in engine (non come turnEffect).
 */

import { matchEffect } from './matchEffect.js';
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
 * - match DEVE essere prima di torch: ricalcola hasLight (fiammifero) prima che torch la
 *   sovrascriva nei suoi due casi (torcia posata, torcia esaurita) e la salvi per gli altri effetti
 * - darkness DEVE essere dopo torch perché dipende da hasLight aggiornato
 * - i timer (buio, zona aperta, alba, guardia) si aggiornano PRIMA di gameOverEffect,
 *   che valuta le condizioni di fine partita sui timer aggiornati
 * - victoryEffect controlla vittoria DOPO tutti i check game over
 */
export const TURN_EFFECTS = [
  matchEffect,       // Priorità 1: Timer del fiammifero acceso (R8)
  torchEffect,       // Priorità 2: Sistema illuminazione torcia (aggiorna hasLight)
  darknessEffect,    // Priorità 3: Timer del buio (R1)
  interceptEffect,   // Priorità 4: Timer della zona aperta (R2)
  dawnEffect,        // Priorità 5: Timer dell'alba (R3)
  guardEffect,       // Priorità 6: Timer della guardia alla barriera (R4)
  gameOverEffect,    // Priorità 7: Verifica condizioni di fine partita
  victoryEffect,     // Priorità 8: Sequenza finale Ferenc + teleport (trigger vittoria)
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
