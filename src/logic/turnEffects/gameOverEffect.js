/**
 * Game Over Effect - Sistema unificato condizioni morte/game over
 *
 * Centralizza TUTTE le verifiche di game over post-turno, in quest'ordine:
 * - Lampada abbandonata
 * - Buio (timer scaduto con un movimento, R1)
 * - Luogo terminale (Terminale === -1)
 * - Zona aperta (secondo comando consecutivo senza spostamento, R2)
 * - Guardia alla barriera (arresto al 5° comando, R4)
 * - Alba (limite di turni consumati, R3)
 *
 * Questo effect DEVE seguire gli effetti dei timer nel registry TURN_EFFECTS perché
 * valuta i timer già aggiornati.
 *
 * Struttura: `GAME_OVER_CHECKS` è un elenco ordinato di controlli; ognuno
 * restituisce `{ messageKey, reason }` oppure `null`. Il primo controllo non nullo chiama
 * `setGameOver` e interrompe la valutazione degli altri.
 */

import { getSystemMessage } from '../systemMessages.js';
import { OPEN_AREA_LOCATIONS } from './interceptEffect.js';
import { getDawnTurnLimit } from './dawnEffect.js';
import { CONFIG } from '../../game/odessa/config.js';
import { getGameData } from '../core/gameData.js';

function setGameOver(gameState, result, messageKey, reason) {
  result.accepted = false;
  result.resultType = 'GAME_OVER';
  result.message = getSystemMessage(messageKey, gameState.currentLingua);
  result.gameOver = true;
  result.gameOverReason = reason;
  gameState.awaitingRestart = true;
}

// Il giocatore si è spostato dal luogo in cui la lampada accesa è stata lasciata.
function movedAwayFromLampRoom(gameState, lampada) {
  const previousLocationId = gameState.turn?.previous?.location;
  const currentLocationId = gameState.currentLocationId;
  return (
    typeof previousLocationId === 'number' &&
    previousLocationId === lampada.IDLuogo &&
    currentLocationId !== lampada.IDLuogo
  );
}

// Opzione di design (scelta): morte immediata solo se la lampada era l'unica luce.
function lampWasOnlyLight(gameState) {
  const torcia = (gameState.Oggetti || []).find((o) => o.ID === CONFIG.oggetti.torcia);
  const hasWorkingTorchInInventory =
    !!torcia && torcia.IDLuogo === 0 && gameState.timers.torciaDifettosa !== true;

  // Un fiammifero acceso all'inizio del turno copre lo spostamento (R8, §4.5):
  // il giocatore resta illuminato per il comando in corso, non muore subito.
  const hadMatchLitAtStart = gameState.turn.current?.matchLitAtStart === true;

  return !hasWorkingTorchInInventory && !hadMatchLitAtStart;
}

// === CHECK 0: LAMPADA ABBANDONATA (design) ===
// Se il giocatore lascia la lampada accesa a terra e si sposta in un altro luogo,
// e non ha altre fonti di luce (torcia in inventario e funzionante), game over immediato.
function lampAbandoned(gameState, parseResult) {
  if (parseResult?.CommandType !== 'NAVIGATION' || gameState.timers.lampadaAccesa !== true)
    return null;

  const lampada = (gameState.Oggetti || []).find((o) => o.ID === CONFIG.oggetti.lampada);

  // La regola si applica solo se la lampada è accesa ma NON è in inventario.
  if (!lampada || lampada.IDLuogo === 0) return null;
  if (!movedAwayFromLampRoom(gameState, lampada)) return null;
  if (!lampWasOnlyLight(gameState)) return null;

  return { messageKey: 'timer.lamp.abandoned.death', reason: 'LAMP_ABANDONED' };
}

// === CHECK 1: DARKNESS DEATH (R1) ===
// Timer del buio scaduto con un comando di movimento (riuscito o no)
function darkness(gameState) {
  if (gameState.turn.current?.darknessExpired !== true) return null;
  return { messageKey: 'timer.darkness.death', reason: 'DARKNESS' };
}

// === CHECK 2: LUOGO TERMINALE ===
// Luoghi con Terminale === -1 (es. ID 8, 40, 54)
// Messaggio i18n (senza domanda riavvio, la aggiunge il client)
function terminalLocation(gameState) {
  const currentLuogo = getGameData().Luoghi.find(
    (l) => l.ID === gameState.currentLocationId && l.IDLingua === gameState.currentLingua
  );
  if (!currentLuogo || currentLuogo.Terminale !== -1) return null;
  return { messageKey: 'game.terminal.location', reason: 'TERMINAL_LOCATION' };
}

// === CHECK 3: ZONA APERTA (R2) ===
// Secondo comando consecutivo senza spostamento nella zona aperta
function openArea(gameState) {
  if (gameState.turn.current?.openAreaExpired !== true) return null;
  return { messageKey: 'game.intercept.death', reason: 'INTERCEPT' };
}

// === CHECK 4: GUARDIA ALLA BARRIERA (R4) ===
// Timer della guardia scaduto senza aver porto i documenti
function guardArrest(gameState) {
  const expired =
    gameState.narrativeState === 'ENDING_PHASE_2_WAIT' &&
    gameState.currentLocationId === CONFIG.luoghi.barriera &&
    typeof gameState.guardTimer === 'number' &&
    gameState.guardTimer <= 0;
  return expired ? { messageKey: 'timer.guard.arrest', reason: 'GUARD_ARREST' } : null;
}

// === CHECK 5: ALBA (R3) ===
// Limite di turni consumati (comandi SYSTEM esclusi); fermo dopo l'incontro con Ferenc.
function dawn(gameState) {
  if (gameState.narrativeState || !(gameState.turn.totalTurnsConsumed >= getDawnTurnLimit()))
    return null;
  const messageKey = OPEN_AREA_LOCATIONS.includes(gameState.currentLocationId)
    ? 'timer.dawn.death.outdoor'
    : 'timer.dawn.death.house';
  return { messageKey, reason: 'TOO_LATE' };
}

// Ordine vincolante: il primo controllo che scatta ferma gli altri.
export const GAME_OVER_CHECKS = [
  lampAbandoned,
  darkness,
  terminalLocation,
  openArea,
  guardArrest,
  dawn,
];

/**
 * Verifica tutte le condizioni di game over post-turno.
 * Se una condizione è soddisfatta, imposta awaitingRestart e ritorna game over.
 *
 * @param {Object} gameState - Stato del gioco
 * @param {Object} result - Risultato del comando da modificare
 * @param {Object} _parseResult - Comando parsato (non usato)
 */
export function gameOverEffect(gameState, result, parseResult) {
  // Guard: Se già in game over, non verificare altre condizioni
  if (gameState.awaitingRestart || gameState.ended) {
    return;
  }

  for (const check of GAME_OVER_CHECKS) {
    const outcome = check(gameState, parseResult);
    if (outcome) {
      setGameOver(gameState, result, outcome.messageKey, outcome.reason);
      return; // Game over triggato, non verificare altre condizioni
    }
  }
}
