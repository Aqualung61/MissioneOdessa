// Sistema Turn (v3.0): funzioni generiche del turno.
// Nessuna funzione conserva lo stato tra due chiamate: lo stato è sempre un parametro,
// letto al momento della chiamata. I dettagli del gioco passano da `game.rules` e `game.turnEffects`.
import { getSystemMessage } from '../systemMessages.js';

/**
 * Determina se un comando consuma un turno temporale.
 * Solo i comandi SYSTEM (informativi) non consumano turno.
 * NAVIGATION e ACTION consumano turno.
 * @param {Object} parseResult - Risultato del parsing del comando
 * @returns {boolean} - true se il comando consuma turno
 */
export function shouldConsumeTurn(parseResult) {
  if (!parseResult || !parseResult.IsValid) {
    return false;
  }

  // Solo i comandi SYSTEM non consumano turno
  if (parseResult.CommandType === 'SYSTEM') {
    return false;
  }

  // NAVIGATION e ACTION consumano turno
  return true;
}

/**
 * Crea uno snapshot immutabile del mondo per il turno corrente.
 * Salva lo stato precedente e aggiorna i contatori globali.
 * @param {Object} gameState - Stato del gioco (modificato)
 * @param {Object} game - Definizione del gioco (regole)
 * @param {Object} parseResult - Risultato del parsing del comando
 */
export function prepareTurnContext(gameState, game, parseResult) {
  // Salva stato precedente (shallow copy di current, con fallback per prima esecuzione)
  const prev = gameState.turn.current || {};
  gameState.turn.previous = {
    location: prev.location || gameState.currentLocationId,
    hasLight: prev.hasLight || false,
    consumedTurn: prev.consumesTurn || false,
    inDangerZone: prev.inDangerZone || false
  };

  // Determina proprietà turno corrente
  const consumesTurn = shouldConsumeTurn(parseResult);
  const hasLight = game.rules.hasActiveLight(gameState);
  const inDangerZone = game.rules.isDangerZone(gameState);

  // Aggiorna stato corrente
  gameState.turn.current = {
    parseResult: parseResult,
    consumesTurn: consumesTurn,
    location: gameState.currentLocationId,
    hasLight: hasLight,
    inDangerZone: inDangerZone
  };

  // Incrementa contatore globale (sempre, anche per comandi non-consuming)
  gameState.turn.globalTurnNumber += 1;

  // Incrementa contatore turni consumati (solo se shouldConsumeTurn)
  if (consumesTurn) {
    gameState.turn.totalTurnsConsumed += 1;
  }
}

/**
 * Valida condizioni pre-esecuzione su snapshot statico.
 * Verifica movement block.
 *
 * NOTA:
 * - awaitingRestart NON è verificato qui perché gestito direttamente
 *   in engineRoutes.js che bypassa il parser quando awaitingRestart = true
 * - Intercettazione NON è più qui: gestita da gameOverEffect
 * - awaitingContinue NON è più qui: gestito da victoryEffect middleware
 *
 * @param {Object} gameState - Stato del gioco
 * @param {Object} parseResult - Risultato del parsing del comando
 * @returns {Object|null} - Oggetto risultato se bloccato, null se ok
 */
export function runPreExecutionChecks(gameState, parseResult) {
  // Check movement block: guardia blocca movimento
  if (gameState.movementBlocked && parseResult.CommandType === 'NAVIGATION') {
    return {
      accepted: false,
      resultType: 'ERROR',
      message: getSystemMessage('narrative.movement.blocked', gameState.currentLingua),
      effects: []
    };
  }

  return null; // Nessun blocco, esecuzione può procedere
}

/**
 * Applica effetti temporali dopo l'esecuzione del comando.
 * Gli effetti sono quelli registrati dal gioco (`game.turnEffects`), nell'ordine dell'array.
 *
 * @param {Object} gameState - Stato del gioco (modificato)
 * @param {Object} game - Definizione del gioco (regole ed effetti di turno)
 * @param {Object} result - Risultato comando dei gestori di verbo (dispatch)
 * @param {Object} parseResult - Comando parsato originale
 * @returns {Object} - Risultato modificato con eventuali effetti
 */
export function applyTurnEffects(gameState, game, result, parseResult) {
  // === RICALCOLO hasLight dopo esecuzione comando ===
  // Se il comando ha modificato lo stato dell'illuminazione (es. ACCENDI LAMPADA),
  // dobbiamo ricalcolare hasLight PRIMA di applicare gli effetti
  gameState.turn.current.hasLight = game.rules.hasActiveLight(gameState);

  // === RICALCOLO inDangerZone dopo esecuzione comando ===
  // Se il comando ha cambiato location (NAVIGATION),
  // dobbiamo ricalcolare inDangerZone con la nuova location
  gameState.turn.current.inDangerZone = game.rules.isDangerZone(gameState);

  // Movimento riuscito: luogo cambiato rispetto all'inizio del turno (R1, R2)
  gameState.turn.movedThisTurn = gameState.currentLocationId !== gameState.turn.current.location;

  // === APPLICA EFFETTI TEMPORALI DEL GIOCO ===
  // Ogni effetto modifica gameState e result, nell'ordine di `game.turnEffects`
  for (const effect of game.turnEffects) {
    effect(gameState, result, parseResult);
  }

  // Logica incremento:
  // - globalTurnNumber: incrementato SEMPRE (anche per comandi SYSTEM)
  // - totalTurnsConsumed: incrementato SOLO per comandi consuming (NAVIGATION, ACTION)
  // I misteri sono gestiti dal “Sistema Punteggio Misteri”, non come effetti di turno.

  return result;
}
