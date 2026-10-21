// Regole di Odessa (TD Lotto 4a, §3.4): funzioni che il motore chiama tramite
// `game.rules`, così `engine.js` e `core/` non conoscono i dettagli del gioco.
import { rankKeyFor } from '../../logic/core/gameConfig.js';
import { CONFIG } from './config.js';

// Punteggio dei misteri (TD Lotto 4b, §3.3): riesportato come regola del gioco.
export { awardMystery } from './scoring.js';

// Verbi delle interazioni che rispondono con il testo di apertura/chiusura del toggle
// (`risposta_apri` / `risposta_chiudi`) invece di `risposta` (TD Lotto 4b, §3.4 passo 5;
// D-4b-3: regola esplicita di Odessa, non generica). Il test dei registri verifica che ogni
// interazione dei dati con un effetto TOGGLE_DIREZIONE abbia il verbo in questo insieme.
export const toggleResponseVerbs = new Set(['PREMERE', 'RUOTARE']);

// Regole della sequenza (cassaforte) usate dal meccanismo generico di `core/interactions.js`
// (TD Lotto 4b, §3.4.1).
export const sequence = {
  // Sequenza già completata: "la cassaforte è già aperta".
  alreadyCompletedMessageKey: 'engine.safeAlreadyOpen',

  // § 3.2.3 Task 5: Award +2 points for cassaforte sequence completion
  // Anomalia nota (TD Lotto 3 Configurazione di gioco, E-6, v1.1; TD Lotto 4b D-4b-4): punteggio di
  // interazione (+2), ma deduplicato in misteriRisolti invece di interazioniPunteggio, con
  // chiave fissa (non `seqKey`). Comportamento invariato, trascritto alla lettera.
  onCompleted(seqKey, ctx) {
    if (!ctx.state.punteggio.misteriRisolti.has('sequenza_cassaforte')) {
      ctx.state.punteggio.misteriRisolti.add('sequenza_cassaforte');
      ctx.state.punteggio.totale += ctx.game.config.punteggio.interazione;
    }
  },
};

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

/**
 * Il giocatore è in una zona aperta (zona di intercettazione: 51, 52, 53, 55, 56, 58).
 * Spostata dalla lettura diretta di `luoghi.zoneAperte` in `engine.js` (TD Lotto 5, §3.2).
 * @param {Object} state - stato del gioco
 * @returns {boolean}
 */
export function isDangerZone(state) {
  return CONFIG.luoghi.zoneAperte.includes(state.currentLocationId);
}

/**
 * Fiammiferi disponibili a inizio partita (R8). Regola del gioco, così `core/state.js` non
 * cita dati di Odessa (TD Lotto 5, §5.2 punto 8 e AC-6).
 * @returns {number}
 */
export function initialMatches() {
  return CONFIG.regole.fiammiferiIniziali;
}

/**
 * Stato iniziale delle aperture (oggetto nuovo a ogni chiamata).
 * @returns {Object}
 */
export function initialOpenStates() {
  return { BOTOLA: false };
}

/**
 * Timer della guardia (R4) di uno stato caricato: default 5 se il salvataggio è già alla barriera
 * (spostata alla lettera da `setGameState`, TD Lotto 5, §3.2).
 * @param {Object} newState - stato serializzato da caricare
 * @returns {number}
 */
export function deriveLoadedGuardTimer(newState) {
  return typeof newState.guardTimer === 'number'
    ? newState.guardTimer
    : (newState.narrativeState === 'ENDING_PHASE_2_WAIT' ? CONFIG.regole.timerGuardia : 0);
}

/**
 * Fiammiferi (R8) di uno stato caricato: default per i salvataggi che non li contengono
 * (spostata alla lettera dall'IIFE `timers` di `setGameState`, TD Lotto 5, §3.2).
 * @param {Object} newState - stato serializzato da caricare
 * @returns {Object} i timer completi
 */
export function deriveLoadedTimers(newState) {
  const timers = { ...(newState.timers || {}) };
  if (typeof timers.matchesLeft !== 'number') {
    const fiammiferi = (newState.Oggetti || []).find((o) => o.ID === CONFIG.oggetti.fiammiferi);
    timers.matchesLeft = fiammiferi && fiammiferi.IDLuogo !== -1 ? CONFIG.regole.fiammiferiIniziali : 0;
  }
  if (typeof timers.matchTimer !== 'number') {
    timers.matchTimer = 0;
  }
  return timers;
}
