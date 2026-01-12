/**
 * Intercept Effect - Sistema intercettazione pattuglie sovietiche
 * 
 * Gestisce:
 * - Contatore turni in danger zone (luoghi 51, 52, 53, 55, 56, 58)
 * - Incremento immediato dal primo arrivo in zona pericolosa
 * - Reset automatico quando si esce dalla danger zone
 * - Esclusione automatica comandi SYSTEM (non consumano turno)
 * 
 * NOTA: Il game over (morte dopo 4 turni) è gestito da gameOverEffect.js
 * che DEVE essere eseguito DOPO questo effect per valutare il contatore aggiornato.
 * 
 * Dipendenza: DEVE essere eseguito DOPO gameOverEffect perché gameOverEffect
 * controlla il contatore PRIMA dell'incremento (pre-execution check).
 * 
 * Sprint 3.3.5.C
 */

/**
 * Applica effetto intercettazione al turno corrente
 * @param {Object} gameState - Stato del gioco
 * @param {Object} _result - Risultato del comando (non usato)
 * @param {Object} _parseResult - Comando parsato (non usato)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function interceptEffect(gameState, _result, _parseResult) {
  const { current, previous } = gameState.turn;

  // === RESET CONTATORE ===
  // Reset: uscita da danger zone (vai in luogo sicuro)
  // Questo include anche l'arrivo al rifugio sicuro (luogo 57)
  if (!current.inDangerZone && previous.inDangerZone) {
    gameState.turn.turnsInDangerZone = 0;
  }

  // === INCREMENTO CONTATORE ===
  // Incremento: SEMPRE quando sei in danger zone con consuming command
  // (dal primo arrivo, senza skip del primo turno come darkness)
  if (current.consumesTurn && current.inDangerZone) {
    gameState.turn.turnsInDangerZone++;
  }
}
