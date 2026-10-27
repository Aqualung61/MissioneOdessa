// Facciata del motore: `createEngine` compone le funzioni di `core/` e di
// `game/odessa/` attorno a un contenitore unico `eng = { game, state, originalOggetti }`.
// Nessuna funzione estratta conserva lo stato tra due chiamate; `eng.state` si legge a ogni
// accesso (`resetGameState` e `setGameState` lo riassegnano).

// Sistema Turn: funzioni generiche del turno; gli effetti li fornisce il gioco
import {
  shouldConsumeTurn as shouldConsume,
  prepareTurnContext as prepareTurn,
  runPreExecutionChecks as runPreChecks,
  applyTurnEffects as applyEffects,
} from './core/turn.js';

// Stato di gioco: iniziale, caricamento, snapshot, dati originali
import {
  createInitialState,
  loadState,
  snapshotState,
  loadOriginalOggetti,
  oggettiPerLingua,
} from './core/state.js';

import { resetEngineDebugTrace } from './engineDebug.js';

import { appVersion } from '../version.js';
import { odessaGame } from '../game/odessa/index.js';
import { consumaFiammifero, accendiFiammifero } from '../game/odessa/matches.js';
import { getGameData } from './core/gameData.js';
import { createContext } from './core/context.js';
import { cercaEseguiInterazione } from './core/interactions.js';
import { confirmEnd as confirmEndOf, confirmRestart as confirmRestartOf } from './core/confirm.js';
import { generateHelpMessage as helpMessage } from './core/help.js';
import {
  generaDescrizioneLuogoConOggetti as describeLocation,
  getDirezioniLuogo as directionsOf,
  setCurrentLocation as setLocation,
} from './core/location.js';
import { executeCommand as runCommand } from './core/execute.js';

// Funzione helper per normalizzare nomi (spazi -> underscore)
function normalizeForComparison(str) {
  return str.toUpperCase().replace(/\s+/g, '_');
}

/**
 * Imposta una proprietà nested in un oggetto usando un percorso (es. "timers.lampadaAccesa").
 * @param {Object} obj - Oggetto target (es. gameState)
 * @param {string} path - Percorso separato da punti (es. "turn.turnsInDarkness")
 * @param {*} value - Valore da impostare
 */
function setNestedProperty(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      return;
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
}

/**
 * Legge una proprietà annidata con notazione a punti (speculare a setNestedProperty).
 * Percorso inesistente -> undefined.
 * @param {Object} obj - Oggetto sorgente
 * @param {string} path - Percorso separato da punti (es. "timers.lampadaAccesa")
 * @returns {*} - Valore al percorso, oppure undefined
 */
function getNestedProperty(obj, path) {
  let current = obj;
  for (const key of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

// Entra in un luogo terminale: imposta il luogo corrente e l'attesa di riavvio (usata dai test dei luoghi terminali).
async function enterLocationOf(eng, locationId) {
  // Logica: entra in luogo terminale, imposta stato di riavvio
  eng.state.awaitingRestart = true;
  eng.state.currentLocationId = locationId;
  return { accepted: true, resultType: 'TERMINAL', locationId };
}

// Funzione per inizializzare i dati originali (chiamata una volta all'avvio)
// Copia immutabile dei dati originali (salvata all'avvio, non modificata dal caricamento);
// Copia condivisa su globalThis per evitare duplicazioni per-session.
function initOriginalData(eng) {
  eng.originalOggetti = loadOriginalOggetti(eng.originalOggetti, getGameData());
}

// Funzione per resettare lo stato di gioco
function resetState(eng, idLingua = 1) {
  console.log('Inizializzazione gameState con lingua:', idLingua);
  resetEngineDebugTrace();
  if (!Array.isArray(eng.originalOggetti) || eng.originalOggetti.length === 0) {
    initOriginalData(eng);
  }
  eng.state = createInitialState(eng.game, idLingua);
  // Aggiungi Oggetti a gameState dai dati originali
  eng.state.Oggetti = oggettiPerLingua(eng.originalOggetti, idLingua);
  if (eng.state.Oggetti.length > 0) {
    console.log(
      'Caricamento Oggetti in gameState: Sì, numero di record: ' + eng.state.Oggetti.length
    );
  }
}

function commandDTO(parseResult) {
  if (!parseResult || parseResult.IsValid !== true) return null;
  const dto = {
    original: parseResult.OriginalInput,
    normalized: parseResult.NormalizedInput,
    type: parseResult.CommandType,
    verb: parseResult.CanonicalVerb
      ? {
          canonical: parseResult.CanonicalVerb,
          termId: parseResult.VerbTermId ?? null,
          concept: parseResult.VerbConcept ?? null,
        }
      : null,
    noun: parseResult.CanonicalNoun
      ? {
          canonical: parseResult.CanonicalNoun,
          termId: parseResult.NounTermId ?? null,
          concept: parseResult.NounConcept ?? null,
          index: parseResult.NounIndex ?? null,
        }
      : null,
  };
  return dto;
}

// Funzioni del motore esposte ai gestori di verbo (11 chiavi, ordine invariato);
// leggono sempre l'`eng.state` corrente.
function buildHelpers(eng) {
  const helpers = {
    normalize: normalizeForComparison,
    // Ricerca di "PRIORITÀ 2": oggetto nel luogo corrente o in inventario (stessa condizione)
    findObjectHereOrInventory: (noun) =>
      (eng.state.Oggetti || []).find(
        (obj) =>
          normalizeForComparison(obj.Oggetto) === normalizeForComparison(noun) &&
          (obj.IDLuogo === eng.state.currentLocationId || obj.IDLuogo === 0) &&
          obj.Attivo >= 1
      ),
    getNestedProperty,
    setNestedProperty,
    consumaFiammifero: () => consumaFiammifero(eng.state, eng.game.config),
    // Interazioni: il contesto si crea a ogni chiamata sullo stato corrente.
    cercaEseguiInterazione: (verb, noun) =>
      cercaEseguiInterazione(verb, noun, createContext(eng.state, eng.game, helpers)),
    accendiFiammifero: () => accendiFiammifero(eng.state, eng.game.config),
    setCurrentLocation: (locationId) => setLocation(eng, locationId),
    getDirezioniLuogo: (idLuogo) => directionsOf(eng, idLuogo),
    generateHelpMessage: (idLingua) => helpMessage(eng, idLingua),
    generaDescrizioneLuogoConOggetti: (idLuogo) => describeLocation(eng, idLuogo),
  };
  return helpers;
}

// API del motore (21 funzioni, stesso ordine e stessa semantica di prima).
function buildEngineApi(eng, helpers) {
  const reset = (idLingua) => resetState(eng, idLingua);
  const execute = (parseResult) => runCommand(eng, helpers, parseResult);
  return {
    enterLocation: (locationId) => enterLocationOf(eng, locationId),
    // Involucro asincrono di executeCommand, usato da POST /api/engine/execute.
    executeCommandAsync: async (parseResult) => execute(parseResult),
    confirmEnd: (risposta) => confirmEndOf(eng, risposta),
    confirmRestart: (risposta) => confirmRestartOf(eng, risposta, reset),
    initializeOriginalData: () => initOriginalData(eng),
    // Riferimento allo stato di gioco (per test)
    getGameState: () => eng.state,
    resetGameState: reset,
    shouldConsumeTurn: shouldConsume,
    // Verifica se il giocatore ha una fonte di luce attiva (torcia o lampada)
    hasFonteLuceAttiva: () => eng.game.rules.hasActiveLight(eng.state),
    prepareTurnContext: (parseResult) => prepareTurn(eng.state, eng.game, parseResult),
    runPreExecutionChecks: (parseResult) => runPreChecks(eng.state, parseResult),
    applyTurnEffects: (result, parseResult) =>
      applyEffects(eng.state, eng.game, result, parseResult),
    generateHelpMessage: helpers.generateHelpMessage,
    generaDescrizioneLuogoConOggetti: helpers.generaDescrizioneLuogoConOggetti,
    getOggetti: () => eng.state.Oggetti || [],
    getDirezioniLuogo: helpers.getDirezioniLuogo,
    setGameState: (newState) => {
      eng.state = loadState(newState, eng.game);
    },
    setCurrentLocation: helpers.setCurrentLocation,
    getGameStateSnapshot: () => snapshotState(eng.state, getGameData(), appVersion),
    toCommandDTO: commandDTO,
    executeCommand: execute,
  };
}

/**
 * Crea un motore con stato proprio (un motore per sessione). Le funzioni restituite
 * condividono il contenitore interno `{ game, state, originalOggetti }`; `state` si
 * rilegge a ogni chiamata perché `resetGameState` e `setGameState` lo riassegnano.
 * @param {OdessaGame} [game=odessaGame] - definizione del gioco (vedi `src/game/odessa/index.js`)
 * @returns {Object} le 21 funzioni dell'API: `enterLocation`, `executeCommandAsync`, `confirmEnd`,
 *   `confirmRestart`, `initializeOriginalData`, `getGameState`, `resetGameState`, `shouldConsumeTurn`,
 *   `hasFonteLuceAttiva`, `prepareTurnContext`, `runPreExecutionChecks`, `applyTurnEffects`,
 *   `generateHelpMessage`, `generaDescrizioneLuogoConOggetti`, `getOggetti`, `getDirezioniLuogo`,
 *   `setGameState`, `setCurrentLocation`, `getGameStateSnapshot`, `toCommandDTO`, `executeCommand`
 */
export function createEngine(game = odessaGame) {
  // Stato di gioco (singleton in memoria per motore)
  const eng = { game, state: null, originalOggetti: [] };
  eng.state = createInitialState(game, 1);
  return buildEngineApi(eng, buildHelpers(eng));
}

// Istanza di default: API di modulo invariata per server.js e test.
const defaultEngine = createEngine();
/**
 * Entra in un luogo terminale: imposta `awaitingRestart` e il luogo corrente. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {number} locationId - ID del luogo
 * @returns {Promise<{accepted: boolean, resultType: string, locationId: number}>} `resultType` vale `'TERMINAL'`
 */
export const enterLocation = (...args) => defaultEngine.enterLocation(...args);
/**
 * Versione asincrona di `executeCommand`, usata da `POST /api/engine/execute`. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {Object} parseResult - ParseResult prodotto da `parseInput`/`parseCommand`
 * @returns {Promise<Object>} risultato del comando
 */
export const executeCommandAsync = (...args) => defaultEngine.executeCommandAsync(...args);
/**
 * Conferma o annulla la fine della partita (risposta SI/NO). Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * Con SI imposta `awaitingRestart` e risponde `GAME_OVER` con `gameOver: true`; con NO risponde `OK`;
 * una risposta non riconosciuta dà `{ accepted: false, resultType: 'ERROR' }` e lascia lo stato invariato.
 * @param {string} risposta - testo digitato (S, SI, SÌ, Y, YES / N, NO)
 * @returns {Object} risultato con `accepted`, `resultType` e, se presente, `message`
 */
export const confirmEnd = (...args) => defaultEngine.confirmEnd(...args);
/**
 * Conferma o rifiuta il riavvio dopo la fine della partita (risposta SI/NO). Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * Con SI azzera lo stato nella lingua corrente (`resultType` `OK`); con NO imposta `ended` (`resultType` `ENDED`);
 * una risposta non riconosciuta dà `{ accepted: false, resultType: 'ERROR' }`.
 * @param {string} risposta - testo digitato (S, SI, SÌ, Y, YES / N, NO)
 * @returns {Object} risultato con `accepted` e `resultType`
 */
export const confirmRestart = (...args) => defaultEngine.confirmRestart(...args);
/**
 * Carica la copia immutabile dei dati originali degli oggetti, condivisa nel processo, da cui
 * `resetGameState` costruisce gli oggetti della partita. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @returns {void}
 */
export const initializeOriginalData = (...args) => defaultEngine.initializeOriginalData(...args);
/**
 * Riferimento allo stato di gioco corrente (non una copia). Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @returns {Object} stato di gioco
 */
export const getGameState = (...args) => defaultEngine.getGameState(...args);
/**
 * Ricrea lo stato iniziale nella lingua indicata e azzera la traccia di debug. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {number} [idLingua=1] - ID della lingua (1 = IT, 2 = EN)
 * @returns {void}
 */
export const resetGameState = (...args) => defaultEngine.resetGameState(...args);
/**
 * Indica se il comando consuma un turno: lo consumano NAVIGATION e ACTION, non i comandi SYSTEM
 * né un ParseResult assente o non valido. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {Object} parseResult - ParseResult del comando
 * @returns {boolean}
 */
export const shouldConsumeTurn = (...args) => defaultEngine.shouldConsumeTurn(...args);
/**
 * Indica se il giocatore ha una fonte di luce attiva, secondo la regola `hasActiveLight` del gioco. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @returns {boolean}
 */
export const hasFonteLuceAttiva = (...args) => defaultEngine.hasFonteLuceAttiva(...args);
/**
 * Salva lo stato del turno precedente in `turn.previous`, calcola `turn.current` e incrementa i contatori dei turni. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {Object} parseResult - ParseResult del comando
 * @returns {void}
 */
export const prepareTurnContext = (...args) => defaultEngine.prepareTurnContext(...args);
/**
 * Controlli prima dell'esecuzione: blocca i comandi NAVIGATION quando `movementBlocked` è attivo. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {Object} parseResult - ParseResult del comando
 * @returns {Object|null} risultato di errore se il comando è bloccato, `null` altrimenti
 */
export const runPreExecutionChecks = (...args) => defaultEngine.runPreExecutionChecks(...args);
/**
 * Applica gli effetti di turno del gioco (`game.turnEffects`) dopo l'esecuzione del comando. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {Object} result - risultato dei gestori di verbo (modificato dagli effetti)
 * @param {Object} parseResult - ParseResult del comando
 * @returns {Object} il risultato, eventualmente modificato
 */
export const applyTurnEffects = (...args) => defaultEngine.applyTurnEffects(...args);
/**
 * Messaggio di aiuto con i comandi disponibili nella lingua indicata. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {number} [idLingua] - ID della lingua (1 = IT, 2 = EN); se omesso, la lingua corrente
 * @returns {string}
 */
export const generateHelpMessage = (...args) => defaultEngine.generateHelpMessage(...args);
/**
 * Descrizione (HTML) del luogo con l'elenco degli oggetti presenti, nella lingua corrente. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {number} idLuogo - ID del luogo
 * @returns {string} testo, vuoto se il luogo non esiste nella lingua corrente
 */
export const generaDescrizioneLuogoConOggetti = (...args) =>
  defaultEngine.generaDescrizioneLuogoConOggetti(...args);
/**
 * Oggetti dello stato di gioco corrente. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @returns {Array<Object>}
 */
export const getOggetti = (...args) => defaultEngine.getOggetti(...args);
/**
 * Direzioni di un luogo (`Nord`, `Est`, `Sud`, `Ovest`, `Su`, `Giu`) con sblocchi e toggle applicati. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {number} idLuogo - ID del luogo
 * @returns {Object} direzione → valore dei dati del luogo; oggetto vuoto se il luogo non esiste nella lingua corrente
 */
export const getDirezioniLuogo = (...args) => defaultEngine.getDirezioniLuogo(...args);
/**
 * Sostituisce lo stato corrente con uno stato serializzato (salvataggio o snapshot), applicando i
 * valori di default ai campi mancanti dei salvataggi di formato precedente. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {Object} newState - stato serializzato
 * @returns {void}
 */
export const setGameState = (...args) => defaultEngine.setGameState(...args);
/**
 * Imposta il luogo corrente. Alla prima visita lo registra in `visitedPlaces` e assegna il punto-luogo
 * (non per i luoghi terminali). Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {number} locationId - ID del luogo
 * @returns {void}
 */
export const setCurrentLocation = (...args) => defaultEngine.setCurrentLocation(...args);
/**
 * Snapshot serializzabile dello stato (i `Set` diventano array), con i metadati `timestamp` e `version`. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @returns {Object}
 */
export const getGameStateSnapshot = (...args) => defaultEngine.getGameStateSnapshot(...args);
/**
 * Riduce un ParseResult valido a un oggetto con `original`, `normalized`, `type`, `verb` e `noun`. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {Object} parseResult - ParseResult del parser
 * @returns {Object|null} `null` se il ParseResult manca o non è valido
 */
export const toCommandDTO = (...args) => defaultEngine.toCommandDTO(...args);
/**
 * Esegue un comando già parsato: contesto del turno, controlli preliminari, gestori di verbo ed effetti di turno. Come l'omonima funzione di `createEngine()`, sul motore di default del modulo.
 * @param {Object} parseResult - ParseResult prodotto da `parseInput`/`parseCommand`
 * @returns {Object} risultato con `accepted`, `resultType`, `message` e gli altri campi dei gestori
 */
export const executeCommand = (...args) => defaultEngine.executeCommand(...args);
