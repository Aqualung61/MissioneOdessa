// Regole di Odessa (TD Lotto 4a, §3.4): funzioni che il motore chiama tramite
// `game.rules`, così `engine.js` e `core/` non conoscono i dettagli del gioco.
import { rankKeyFor } from '../../logic/core/gameConfig.js';
import { CONFIG } from './config.js';

/**
 * Verifica se c'è una fonte di luce attiva
 * (spostata alla lettera da `hasFonteLuceAttiva` di `turnEffects/torchEffect.js`).
 * @param {Object} gameState - Stato del gioco
 * @returns {boolean} true se ha luce (torcia funzionante, lampada accesa dove si trova,
 *   fiammifero acceso o luogo 59)
 */
export function hasActiveLight(gameState) {
  // Alla barriera la luce è garantita (BAS 1030–1050; luogo 59 in Odessa)
  if (gameState.currentLocationId === CONFIG.luoghi.barriera) return true;

  // Torcia: in inventario E funzionante
  const torcia = gameState.Oggetti.find(o => o.ID === CONFIG.oggetti.torcia);
  const hasTorcia = torcia &&
                    torcia.IDLuogo === 0 &&
                    !gameState.timers.torciaDifettosa;

  // Lampada accesa: fa luce solo dove si trova, in inventario o nel luogo corrente (R8, §4.3)
  const lampada = gameState.Oggetti.find(o => o.ID === CONFIG.oggetti.lampada);
  const hasLampada = gameState.timers.lampadaAccesa &&
                      !!lampada &&
                      (lampada.IDLuogo === 0 || lampada.IDLuogo === gameState.currentLocationId);

  // Fiammifero acceso (R8): luce per il comando successivo a quello che lo accende
  const hasMatch = gameState.timers.matchTimer > 0;

  return hasTorcia || hasLampada || hasMatch;
}

// Dati di Odessa usati da `deriveLoadedFlags` (dentro `game/odessa/` sono ammessi, TD 0 §4.4).
const BASTONE_ID = 1;
const INTERAZIONE_SPOSTA_QUADRO = 'sposta_quadro_24';

/**
 * Flag di scenario (R7) di uno stato caricato: default per i salvataggi che non li
 * contengono (es. v1.4.1 pre-#96). Spostata alla lettera dall'IIFE `flags` di
 * `setGameState` (TD Lotto 4a, §3.4).
 * - cassaforteScoperta: dedotto da interazioniEseguite (sposta_quadro_24 già eseguita).
 * - bastoneLiberato: dedotto da Oggetti (nei salvataggi v1.4.0 il bastone era prendibile,
 *   Attivo >= 3; se è già in inventario o altrove con Attivo >= 3 le macerie erano assenti).
 * - passaggioCrollato: dedotto da visitedPlaces (salvataggi senza il flag, #117).
 * @param {Object} newState - stato serializzato da caricare
 * @returns {Object} i flag completi
 */
export function deriveLoadedFlags(newState) {
  const flags = { ...(newState.flags || {}) };
  if (typeof flags.cassaforteScoperta !== 'boolean') {
    flags.cassaforteScoperta = (newState.interazioniEseguite || []).includes(INTERAZIONE_SPOSTA_QUADRO);
  }
  if (typeof flags.bastoneLiberato !== 'boolean') {
    const bastone = (newState.Oggetti || []).find((o) => o.ID === BASTONE_ID);
    flags.bastoneLiberato = !!bastone && bastone.Attivo >= 3;
  }
  // passaggioCrollato: dedotto da visitedPlaces (salvataggi senza il flag, #117).
  if (typeof flags.passaggioCrollato !== 'boolean') {
    flags.passaggioCrollato = (newState.visitedPlaces || []).includes(CONFIG.luoghi.passaggioCrollato.destinazione);
  }
  return flags;
}

/**
 * Chiave del rango per un punteggio (TD Lotto 3, §3.4).
 * @param {number} score
 * @returns {string|null}
 */
export function rankKey(score) {
  return rankKeyFor(score, CONFIG.punteggio.ranghi);
}
