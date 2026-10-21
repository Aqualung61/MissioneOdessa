// Facciata del motore (TD Lotto 5, §3.1 e §3.4): `createEngine` compone le funzioni di `core/` e di
// `game/odessa/` attorno a un contenitore unico `eng = { game, state, originalOggetti }`.
// R1: nessuna funzione estratta conserva lo stato tra due chiamate; `eng.state` si legge a ogni
// accesso (`resetGameState` e `setGameState` lo riassegnano).

// Sistema Turn (TD Lotto 5, §3.4.2): funzioni generiche del turno; gli effetti li fornisce il gioco
import {
  shouldConsumeTurn as shouldConsume,
  prepareTurnContext as prepareTurn,
  runPreExecutionChecks as runPreChecks,
  applyTurnEffects as applyEffects,
} from './core/turn.js';

// Stato di gioco (TD Lotto 5, §3.3): iniziale, caricamento, snapshot, dati originali
import { createInitialState, loadState, snapshotState, loadOriginalOggetti, oggettiPerLingua } from './core/state.js';

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

// Stub: entra in luogo terminale (da implementare secondo logica app)
async function enterLocationOf(eng, locationId) {
  // Logica: entra in luogo terminale, imposta stato di riavvio
  eng.state.awaitingRestart = true;
  eng.state.currentLocationId = locationId;
  return { accepted: true, resultType: 'TERMINAL', locationId };
}

// Funzione per inizializzare i dati originali (chiamata una volta all'avvio)
// Copia immutabile dei dati originali (salvata all'avvio, non modificata dal caricamento);
// Sprint #59.1: copia condivisa su globalThis per evitare duplicazioni per-session.
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
    console.log('Caricamento Oggetti in gameState: Sì, numero di record: ' + eng.state.Oggetti.length);
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

// Funzioni del motore esposte ai gestori di verbo (TD Lotto 4a, §3.2; 11 chiavi, ordine invariato);
// leggono sempre l'`eng.state` corrente.
function buildHelpers(eng) {
  const helpers = {
    normalize: normalizeForComparison,
    // Ricerca di "PRIORITÀ 2": oggetto nel luogo corrente o in inventario (stessa condizione)
    findObjectHereOrInventory: (noun) => (eng.state.Oggetti || []).find(obj =>
      normalizeForComparison(obj.Oggetto) === normalizeForComparison(noun) &&
      (obj.IDLuogo === eng.state.currentLocationId || obj.IDLuogo === 0) &&
      obj.Attivo >= 1
    ),
    getNestedProperty,
    setNestedProperty,
    consumaFiammifero: () => consumaFiammifero(eng.state, eng.game.config),
    // Interazioni (TD Lotto 4b, §3.1): il contesto si crea a ogni chiamata sullo stato corrente.
    cercaEseguiInterazione: (verb, noun) => cercaEseguiInterazione(verb, noun, createContext(eng.state, eng.game, helpers)),
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
    // Stub: esecuzione comando asincrona (da implementare secondo logica app)
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
    applyTurnEffects: (result, parseResult) => applyEffects(eng.state, eng.game, result, parseResult),
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

// Factory: ogni sessione ottiene un motore con stato proprio (contenitore `eng`), senza istanze di modulo.
export function createEngine(game = odessaGame) {
  // Stato di gioco (singleton in memoria per motore)
  const eng = { game, state: null, originalOggetti: [] };
  eng.state = createInitialState(game, 1);
  return buildEngineApi(eng, buildHelpers(eng));
}

// Istanza di default: API di modulo invariata per server.js e test.
const defaultEngine = createEngine();
export const enterLocation = (...args) => defaultEngine.enterLocation(...args);
export const executeCommandAsync = (...args) => defaultEngine.executeCommandAsync(...args);
export const confirmEnd = (...args) => defaultEngine.confirmEnd(...args);
export const confirmRestart = (...args) => defaultEngine.confirmRestart(...args);
export const initializeOriginalData = (...args) => defaultEngine.initializeOriginalData(...args);
export const getGameState = (...args) => defaultEngine.getGameState(...args);
export const resetGameState = (...args) => defaultEngine.resetGameState(...args);
export const shouldConsumeTurn = (...args) => defaultEngine.shouldConsumeTurn(...args);
export const hasFonteLuceAttiva = (...args) => defaultEngine.hasFonteLuceAttiva(...args);
export const prepareTurnContext = (...args) => defaultEngine.prepareTurnContext(...args);
export const runPreExecutionChecks = (...args) => defaultEngine.runPreExecutionChecks(...args);
export const applyTurnEffects = (...args) => defaultEngine.applyTurnEffects(...args);
export const generateHelpMessage = (...args) => defaultEngine.generateHelpMessage(...args);
export const generaDescrizioneLuogoConOggetti = (...args) => defaultEngine.generaDescrizioneLuogoConOggetti(...args);
export const getOggetti = (...args) => defaultEngine.getOggetti(...args);
export const getDirezioniLuogo = (...args) => defaultEngine.getDirezioniLuogo(...args);
export const setGameState = (...args) => defaultEngine.setGameState(...args);
export const setCurrentLocation = (...args) => defaultEngine.setCurrentLocation(...args);
export const getGameStateSnapshot = (...args) => defaultEngine.getGameStateSnapshot(...args);
export const toCommandDTO = (...args) => defaultEngine.toCommandDTO(...args);
export const executeCommand = (...args) => defaultEngine.executeCommand(...args);