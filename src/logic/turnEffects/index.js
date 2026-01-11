/**
 * Turn Effects Registry
 * 
 * Sistema middleware per gestire effetti temporali post-esecuzione comando.
 * Ogni effetto è un modulo separato che modifica gameState e result in base
 * alle conseguenze temporali del turno (timer, contatori, game over).
 * 
 * L'ordine nell'array TURN_EFFECTS definisce la priorità di esecuzione:
 * 1. Torch effect (luce)
 * 2. Darkness effect (morte per buio)
 * 3. Game over effect (controllo condizioni morte)
 * 4. Intercept effect (intercettazione)
 * 5. Victory effect (sequenza finale Ferenc + teleport)
 * 
 * Nota: i “misteri” sono gestiti dal sistema punteggio in engine (non come turnEffect).
 */

import { torchEffect } from './torchEffect.js';
import { darknessEffect } from './darknessEffect.js';
import { gameOverEffect } from './gameOverEffect.js';
import { interceptEffect } from './interceptEffect.js';
import { victoryEffect } from './victoryEffect.js';

/**
 * Registry di tutti gli effetti temporali applicati al turno.
 * L'ordine definisce la priorità di esecuzione.
 * 
 * IMPORTANTE: 
 * - darkness DEVE essere dopo torch perché dipende da hasLight aggiornato
 * - gameOverEffect controlla contatori PRIMA dell'incremento (pre-execution check)
 * - interceptEffect incrementa contatori DOPO gameOverEffect
 * - victoryEffect controlla vittoria DOPO tutti i check game over
 */
export const TURN_EFFECTS = [
  torchEffect,       // Priorità 1: Sistema illuminazione torcia (aggiorna hasLight)
  darknessEffect,    // Priorità 2: Contatore turni al buio (incrementa turnsInDarkness)
  gameOverEffect,    // Priorità 3: Verifica condizioni game over (darkness, terminale, intercept)
  interceptEffect,   // Priorità 4: Intercettazione in zone pericolose (incrementa turnsInDangerZone)
  victoryEffect,     // Priorità 5: Sequenza finale Ferenc + teleport (trigger vittoria)
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
