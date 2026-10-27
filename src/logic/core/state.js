// Stato di gioco: iniziale, caricamento, snapshot e dati originali.
// Nessuna funzione conserva lo stato tra due chiamate: ricevono lo
// stato (o i dati) come parametro e restituiscono il risultato. Dettagli del gioco da `game`.

/**
 * Chiave su `globalThis` della copia condivisa dei dati originali (una sola copia
 * per processo, non una per sessione).
 * @type {string}
 */
export const ORIGINAL_OGGETTI_KEY = '__odessaOriginalOggetti';

/**
 * Dati originali degli oggetti (copia immutabile, salvata all'avvio, non modificata dal caricamento).
 * Se la copia condivisa esiste ed è piena la riusa; altrimenti la crea dai dati statici.
 * @param {Array} current - copia attualmente in possesso del chiamante (restituita se non c'è nulla da caricare)
 * @param {Object} data - dati statici di gioco (`getGameData()`)
 * @returns {Array} la copia da usare
 */
export function loadOriginalOggetti(current, data) {
  const cached = globalThis[ORIGINAL_OGGETTI_KEY];
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }
  if (data && data.Oggetti) {
    const copy = JSON.parse(JSON.stringify(data.Oggetti));
    globalThis[ORIGINAL_OGGETTI_KEY] = copy;
    console.log('Dati originali salvati: ' + copy.length + ' oggetti');
    return copy;
  }
  return current;
}

/**
 * Oggetti della lingua indicata (o senza lingua), come copia profonda dai dati originali.
 * @param {Array} originalOggetti - copia in possesso del motore (usata se la cache condivisa non è un array)
 * @param {number} idLingua
 * @returns {Array} copia profonda; vuota se nessun oggetto corrisponde
 */
export function oggettiPerLingua(originalOggetti, idLingua) {
  const baseOggetti = Array.isArray(globalThis[ORIGINAL_OGGETTI_KEY])
    ? globalThis[ORIGINAL_OGGETTI_KEY]
    : originalOggetti;

  const perLingua = baseOggetti.filter(
    (o) =>
      o?.IDLingua === idLingua ||
      o?.IDLingua === null ||
      o?.IDLingua === undefined
  );
  if (perLingua.length > 0) {
    return JSON.parse(JSON.stringify(perLingua)); // Deep copy dai dati originali
  }
  return [];
}

/**
 * Stato iniziale di una partita (stessa struttura per la costruzione del motore e per il reset).
 * Gli oggetti (`Oggetti`) sono caricati a parte dal chiamante.
 * @param {Object} game - definizione del gioco
 * @param {number} idLingua - lingua corrente
 * @returns {Object} nuovo stato
 */
export function createInitialState(game, idLingua) {
  return {
    openStates: game.rules.initialOpenStates(),
    awaitingEndConfirm: false,
    awaitingRestart: false,
    currentLocationId: game.config.luoghi.iniziale,
    ended: false,
    visitedPlaces: new Set([game.config.luoghi.iniziale]),
    Oggetti: [],
    interazioniEseguite: [], // ID delle interazioni già eseguite (non ripetibili)
    direzioniSbloccate: {}, // Direzioni sbloccate permanentemente
    direzioniToggle: {}, // Stato dei toggle (es. "44_Est": true/false)
    sequenze: {}, // Stato delle sequenze (es. cassaforte)
    flags: {}, // Flag di scenario (es. "bastoneLiberato", "cassaforteScoperta") (R7)
    currentLingua: idLingua, // Lingua corrente (default: italiano)

    // === SISTEMA PUNTEGGIO ===
    punteggio: {
      totale: game.config.punteggio.luogo, // Luogo iniziale (ID=1) già visitato
      interazioniPunteggio: new Set(), // ID interazioni completate
      misteriRisolti: new Set()        // ID misteri completati
      // NOTA: usa visitedPlaces esistente per punteggio luoghi (no duplicazione)
    },

    // === SISTEMA TEMPORIZZAZIONE ===
    timers: {
      movementCounter: 0,              // Contatore globale mosse (per Torcia)
      torciaDifettosa: false,          // False all'inizio (funzionante), True dopo 6 turni
      lampadaAccesa: false,            // Stato della lampada
      azioniInLuogoPericoloso: 0,      // Counter per Intercettazione
      ultimoLuogoPericoloso: null,     // ID per reset al cambio stanza
      matchesLeft: game.rules.initialMatches(), // Fiammiferi rimasti (R8)
      matchTimer: 0                    // Turni di luce residui del fiammifero acceso (R8)
    },

    // === SISTEMA TURN (v3.0) ===
    turn: {
      globalTurnNumber: 0,        // Contatore globale di tutti i turni (consumati o no)
      totalTurnsConsumed: 0,       // Contatore turni che consumano tempo
      turnsInDarkness: 0,          // Solo compatibilità salvataggi (non decide più la morte)
      turnsInDangerZone: 0,        // Solo compatibilità salvataggi (non decide più la morte)
      darknessTimer: 0,            // Timer del buio (R1), 0 = non attivo
      openAreaTimer: 0,            // Timer della zona aperta (R2), 0 = non attivo
      movedThisTurn: false,        // Se l'ultimo comando ha cambiato luogo
      current: {
        parseResult: null,         // Comando corrente
        consumesTurn: false,       // Se questo comando consuma turno
        location: game.config.luoghi.iniziale, // Luogo attuale
        hasLight: false,           // Se ha fonte di luce attiva
        inDangerZone: false        // Se in zona pericolosa
      },
      previous: {
        location: game.config.luoghi.iniziale, // Luogo precedente
        hasLight: false,           // Se aveva luce
        consumedTurn: false,       // Se turno precedente fu consumato
        inDangerZone: false        // Se era in zona pericolosa
      }
    },

    // === SISTEMA VITTORIA ===
    narrativeState: null,              // Enum: fasi della sequenza finale
    narrativePhase: 0,                 // Progressivo numerico (opzionale)
    victory: false,                    // Flag vittoria finale
    movementBlocked: false,            // Blocca NAVIGATION (per luogo 59)
    guardTimer: 0,                     // Timer della guardia al luogo 59 (R4)
    awaitingContinue: false,           // Se true, engine aspetta solo BARRA SPAZIO
    continueCallback: null             // Funzione da eseguire alla pressione di BARRA
  };
}

// === CARICAMENTO ===
// Operatori `||`/`=== true` invariati rispetto al formato dei salvataggi.

// Deserializzazione Set del punteggio
function loadPunteggio(punteggio) {
  return punteggio ? {
    totale: punteggio.totale || 0,
    interazioniPunteggio: new Set(punteggio.interazioniPunteggio || []),
    misteriRisolti: new Set(punteggio.misteriRisolti || [])
  } : {
    totale: 0,
    interazioniPunteggio: new Set(),
    misteriRisolti: new Set()
  };
}

function loadTurnCounters(turn) {
  return {
    globalTurnNumber: turn.globalTurnNumber || 0,
    totalTurnsConsumed: turn.totalTurnsConsumed || 0,
    turnsInDarkness: turn.turnsInDarkness || 0,
    turnsInDangerZone: turn.turnsInDangerZone || 0,
    darknessTimer: turn.darknessTimer || 0,
    openAreaTimer: turn.openAreaTimer || 0,
    movedThisTurn: turn.movedThisTurn === true,
  };
}

function loadTurnCurrent(current, newState, game) {
  return current ? {
    parseResult: current.parseResult || null,
    consumesTurn: current.consumesTurn || false,
    location: current.location || newState.currentLocationId || game.config.luoghi.iniziale,
    hasLight: current.hasLight || false,
    inDangerZone: current.inDangerZone || false
  } : {
    parseResult: null,
    consumesTurn: false,
    location: newState.currentLocationId || game.config.luoghi.iniziale,
    hasLight: false,
    inDangerZone: false
  };
}

function loadTurnPrevious(previous, game) {
  return previous ? {
    location: previous.location || game.config.luoghi.iniziale,
    hasLight: previous.hasLight || false,
    consumedTurn: previous.consumedTurn || false,
    inDangerZone: previous.inDangerZone || false
  } : {
    location: game.config.luoghi.iniziale,
    hasLight: false,
    consumedTurn: false,
    inDangerZone: false
  };
}

// Salvataggio senza `turn`: `previous` SENZA `inDangerZone`. Non va uniformato.
function loadMissingTurn(newState, game) {
  return {
    globalTurnNumber: 0,
    totalTurnsConsumed: 0,
    turnsInDarkness: 0,
    turnsInDangerZone: 0,
    darknessTimer: 0,
    openAreaTimer: 0,
    movedThisTurn: false,
    current: {
      parseResult: null,
      consumesTurn: false,
      location: newState.currentLocationId || game.config.luoghi.iniziale,
      hasLight: false,
      inDangerZone: false
    },
    previous: {
      location: game.config.luoghi.iniziale,
      hasLight: false,
      consumedTurn: false
    }
  };
}

// BUGFIX: Assicura struttura turn completa dopo caricamento
function loadTurn(newState, game) {
  if (!newState.turn) return loadMissingTurn(newState, game);
  return {
    ...loadTurnCounters(newState.turn),
    current: loadTurnCurrent(newState.turn.current, newState, game),
    previous: loadTurnPrevious(newState.turn.previous, game)
  };
}

// Le quattro collezioni mancanti (`undefined` o `null`) si caricano
// con il valore vuoto; un valore presente, anche di tipo errato, non si tocca. Un salvataggio
// senza la collezione dava altrimenti errore 500 alla prima interazione che la usava.
function loadCollectionDefaults(newState) {
  return {
    interazioniEseguite: newState.interazioniEseguite ?? [],
    direzioniSbloccate: newState.direzioniSbloccate ?? {},
    direzioniToggle: newState.direzioniToggle ?? {},
    sequenze: newState.sequenze ?? {},
  };
}

/**
 * Stato caricato da un salvataggio (accetta stati parziali o di formato precedente).
 * @param {Object} newState - stato serializzato (non modificato)
 * @param {Object} game - definizione del gioco (config e regole per i default)
 * @returns {Object} il nuovo stato di gioco
 */
export function loadState(newState, game) {
  const state = {
    ...newState,
    ...loadCollectionDefaults(newState),
    awaitingEndConfirm: newState.awaitingEndConfirm === true,
    visitedPlaces: new Set(newState.visitedPlaces || []),
    Oggetti: newState.Oggetti ? JSON.parse(JSON.stringify(newState.Oggetti)) : [],
    // Flag di scenario (R7): default per i salvataggi che non li contengono (regole del gioco).
    flags: game.rules.deriveLoadedFlags(newState),
    punteggio: loadPunteggio(newState.punteggio),
    // Timer della guardia (R4): default 5 se il salvataggio è già alla barriera
    guardTimer: game.rules.deriveLoadedGuardTimer(newState),
    // Fiammiferi (R8): default per i salvataggi che non li contengono (§4.1)
    timers: game.rules.deriveLoadedTimers(newState),
    turn: loadTurn(newState, game)
  };
  // Campo della v1.4.0 non più usato (R4): ignorato se presente nel salvataggio
  delete state.unusefulCommandsCounter;
  return state;
}

// === SNAPSHOT ===

// Serializzazione nuove strutture
function snapshotPunteggio(punteggio) {
  return {
    totale: punteggio.totale,
    interazioniPunteggio: Array.from(punteggio.interazioniPunteggio),
    misteriRisolti: Array.from(punteggio.misteriRisolti)
  };
}

// Turn System v3.0
function snapshotTurn(turn) {
  return {
    globalTurnNumber: turn.globalTurnNumber,
    totalTurnsConsumed: turn.totalTurnsConsumed,
    turnsInDarkness: turn.turnsInDarkness,
    turnsInDangerZone: turn.turnsInDangerZone,
    darknessTimer: turn.darknessTimer,
    openAreaTimer: turn.openAreaTimer,
    movedThisTurn: turn.movedThisTurn,
    current: {
      parseResult: null, // Non serializzabile/non necessario
      consumesTurn: turn.current.consumesTurn,
      location: turn.current.location,
      hasLight: turn.current.hasLight,
      inDangerZone: turn.current.inDangerZone
    },
    previous: {
      location: turn.previous.location,
      hasLight: turn.previous.hasLight,
      consumedTurn: turn.previous.consumedTurn,
      inDangerZone: turn.previous.inDangerZone
    }
  };
}

/**
 * Snapshot serializzabile dello stato (formato di salvataggio e delle risposte HTTP).
 * @param {Object} gameState - stato corrente
 * @param {Object} data - dati statici di gioco (`getGameData()`), per il nome del luogo
 * @param {string} version - versione dell'applicazione
 * @returns {Object}
 */
export function snapshotState(gameState, data, version) {
  const currentLocation = data.Luoghi.find(l => l.ID === gameState.currentLocationId && l.IDLingua === gameState.currentLingua);
  return {
    openStates: { ...gameState.openStates },
    awaitingEndConfirm: gameState.awaitingEndConfirm,
    awaitingRestart: gameState.awaitingRestart,
    currentLocationId: gameState.currentLocationId,
    ended: gameState.ended,
    visitedPlaces: Array.from(gameState.visitedPlaces || []),
    Oggetti: JSON.parse(JSON.stringify(gameState.Oggetti || [])),
    interazioniEseguite: [...(gameState.interazioniEseguite || [])],
    direzioniSbloccate: { ...gameState.direzioniSbloccate },
    direzioniToggle: { ...gameState.direzioniToggle },
    sequenze: { ...gameState.sequenze },
    flags: { ...gameState.flags },
    currentLingua: gameState.currentLingua,
    punteggio: snapshotPunteggio(gameState.punteggio),
    timers: { ...gameState.timers },
    narrativeState: gameState.narrativeState,
    narrativePhase: gameState.narrativePhase,
    victory: gameState.victory,
    movementBlocked: gameState.movementBlocked,
    guardTimer: gameState.guardTimer,
    awaitingContinue: gameState.awaitingContinue,
    turn: snapshotTurn(gameState.turn),
    // Metadata per chiarezza
    currentLocationName: currentLocation ? currentLocation.Nome : 'Sconosciuto',
    timestamp: new Date().toISOString(),
    version,
  };
}

// === DEBUG ===

/**
 * Sintesi dello stato per gli eventi di debug del motore (traccia `ENGINE_DEBUG`).
 * @param {Object} gameState - stato corrente
 * @returns {Object}
 */
export function debugStateSnapshot(gameState) {
  return {
    awaitingRestart: !!gameState.awaitingRestart,
    ended: !!gameState.ended,
    currentLocationId: gameState.currentLocationId,
    score: gameState?.punteggio?.totale ?? null,
    totalTurnsConsumed: gameState?.turn?.totalTurnsConsumed ?? null,
    turnsInDangerZone: gameState?.turn?.turnsInDangerZone ?? null,
    globalTurnNumber: gameState?.turn?.globalTurnNumber ?? null,
  };
}
