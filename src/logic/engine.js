// Sprint 1: i18n - importa helper per messaggi di sistema
import { getSystemMessage } from './systemMessages.js';

// Sprint 4.1.x: messaggi utente per errori parser/invalid input
import { mapParseErrorToUserMessage } from './messages.js';

// Sprint 3.3.5: Sistema Turn Effects (middleware per effetti temporali)
import { applyAllTurnEffects } from './turnEffects/index.js';

import { isEngineDebugEnabled, pushEngineDebugEvent, resetEngineDebugTrace } from './engineDebug.js';

import { appVersion } from '../version.js';
import { EFFECT_TYPES, PREREQUISITE_TYPES } from './interactionSchema.js';

// Avvisi per tipi sconosciuti nei dati delle interazioni: una sola volta per tipo e processo.
const warnedUnknownTypes = new Set();
function warnUnknownTypeOnce(kind, tipo) {
  const key = `${kind}:${tipo}`;
  if (warnedUnknownTypes.has(key)) return;
  warnedUnknownTypes.add(key);
  console.warn(`[engine] ${kind} di tipo sconosciuto in Interazioni.json: ${tipo}`);
}

// Verbi (concetti) che al buio non si eseguono: "È troppo buio per farlo." (R1, BAS 240–250).
// Restano eseguibili: movimento, POSARE, LASCIARE, ACCENDERE, DORMIRE e i comandi di sistema.
const DARK_BLOCKED_VERBS = new Set([
  'PRENDERE', 'ESAMINARE', 'GUARDARE', 'LEGGERE', 'SPOSTARE', 'RUOTARE', 'INFILARE',
  'METTERE', 'SCAVARE', 'PREMERE', 'PORGERE', 'APRIRE', 'CHIUDERE',
]);

// Factory: ogni sessione ottiene un motore con stato proprio (closure), senza istanze di modulo.
export function createEngine() {

  // Stub: entra in luogo terminale (da implementare secondo logica app)
  async function enterLocation(locationId) {
    // Logica: entra in luogo terminale, imposta stato di riavvio
    gameState.awaitingRestart = true;
    gameState.currentLocationId = locationId;
    return { accepted: true, resultType: 'TERMINAL', locationId };
  }
  // Stub: esecuzione comando asincrona (da implementare secondo logica app)
  async function executeCommandAsync(parseResult) {
    // Puoi aggiungere logica custom async qui se serve
    return executeCommand(parseResult);
  }

  // Conferma fine gioco (SI/NO) quando lo stato è in attesa di conferma.
  function confirmEnd(risposta) {
    const r = (risposta || '').trim().toUpperCase();

    const isYes = r === 'S' || r === 'SI' || r === 'SÌ' || r === 'Y' || r === 'YES';
    const isNo = r === 'N' || r === 'NO';

    if (isYes) {
      gameState.awaitingEndConfirm = false;
      gameState.awaitingRestart = true;
      return {
        accepted: false,
        resultType: 'GAME_OVER',
        message: getSystemMessage('engine.end.ended', gameState.currentLingua),
        gameOver: true,
      };
    }

    if (isNo) {
      gameState.awaitingEndConfirm = false;
      return {
        accepted: true,
        resultType: 'OK',
        message: getSystemMessage('engine.end.continued', gameState.currentLingua),
      };
    }

    // Risposta non riconosciuta: rimane in attesa
    return { accepted: false, resultType: 'ERROR' };
  }

  // Stub: conferma riavvio (da implementare secondo logica app)
  function confirmRestart(risposta) {
    // Normalizza risposta
    const r = (risposta || '').trim().toUpperCase();
    if (r === 'S' || r === 'SI' || r === 'SÌ' || r === 'Y' || r === 'YES') {
      // Riavvia: reset completo stato (source of truth), mantenendo lingua corrente
      // Nota: `resetGameState` ricrea visitedPlaces/punteggio/turn/timers ecc.
      const lingua = typeof gameState?.currentLingua === 'number' ? gameState.currentLingua : 1;
      resetGameState(lingua);
      return { accepted: true, resultType: 'OK' };
    }
    if (r === 'N' || r === 'NO') {
      // Termina partita
      gameState.awaitingRestart = false;
      gameState.ended = true;
      return { accepted: true, resultType: 'ENDED' };
    }
    // Risposta non riconosciuta: rimane in attesa
    return { accepted: false, resultType: 'ERROR' };
  }
  // Engine: mapping ParseResult -> Command DTO ed esecuzione (stub con stato minimale)

  // Stato di gioco (singleton in memoria)
  let gameState = {
    openStates: { BOTOLA: false },
    awaitingEndConfirm: false,
    awaitingRestart: false,
    currentLocationId: 1,
    ended: false,
    visitedPlaces: new Set([1]),
    Oggetti: [],
    interazioniEseguite: [], // ID delle interazioni già eseguite (non ripetibili)
    direzioniSbloccate: {}, // Direzioni sbloccate permanentemente
    direzioniToggle: {}, // Stato dei toggle (es. "44_Est": true/false)
    sequenze: {}, // Stato delle sequenze (es. cassaforte)
    currentLingua: 1, // Lingua corrente (default: italiano)
    
    // === SISTEMA PUNTEGGIO ===
    punteggio: {
      totale: 1, // Luogo iniziale (ID=1) già visitato
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
      matchesLeft: 6,                  // Fiammiferi rimasti (R8)
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
        location: 1,               // Luogo attuale
        hasLight: false,           // Se ha fonte di luce attiva
        inDangerZone: false        // Se in zona pericolosa
      },
      previous: {
        location: 1,               // Luogo precedente
        hasLight: false,           // Se aveva luce
        consumedTurn: false,       // Se turno precedente fu consumato
        inDangerZone: false        // Se era in zona pericolosa
      }
    },

    // === SISTEMA VITTORIA ===
    narrativeState: null,              // Enum: ENDING_PHASE_1A, etc.
    narrativePhase: 0,                 // Progressivo numerico (opzionale)
    victory: false,                    // Flag vittoria finale
    movementBlocked: false,            // Blocca NAVIGATION (per luogo 59)
    guardTimer: 0,                     // Timer della guardia al luogo 59 (R4)
    awaitingContinue: false,           // Se true, engine aspetta solo BARRA SPAZIO
    continueCallback: null             // Funzione da eseguire alla pressione di BARRA
  };

  function getDebugStateSnapshot() {
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

  function summarizeParseResult(parseResult) {
    if (!parseResult || typeof parseResult !== 'object') return null;
    return {
      commandType: parseResult.CommandType ?? null,
      canonicalVerb: parseResult.CanonicalVerb ?? null,
      verbConcept: parseResult.VerbConcept ?? null,
      canonicalNoun: parseResult.CanonicalNoun ?? null,
      nounConcept: parseResult.NounConcept ?? null,
    };
  }

  // Copia immutabile dei dati originali (salvata all'avvio, non modificata dal caricamento)
  // Sprint #59.1: usiamo una copia condivisa su globalThis per evitare duplicazioni per-session.
  const ORIGINAL_OGGETTI_KEY = '__odessaOriginalOggetti';
  let originalOggetti = [];

  // Funzione per inizializzare i dati originali (chiamata una volta all'avvio)
  function initializeOriginalData() {
    const cached = globalThis[ORIGINAL_OGGETTI_KEY];
    if (Array.isArray(cached) && cached.length > 0) {
      originalOggetti = cached;
      return;
    }
    if (global.odessaData && global.odessaData.Oggetti) {
      const copy = JSON.parse(JSON.stringify(global.odessaData.Oggetti));
      globalThis[ORIGINAL_OGGETTI_KEY] = copy;
      originalOggetti = copy;
      console.log('Dati originali salvati: ' + originalOggetti.length + ' oggetti');
    }
  }

  // Funzione per ottenere riferimento allo stato di gioco (per test)
  function getGameState() {
    return gameState;
  }

  // Funzione per resettare lo stato di gioco
  function resetGameState(idLingua = 1) {
    console.log('Inizializzazione gameState con lingua:', idLingua);
    resetEngineDebugTrace();
    if (!Array.isArray(originalOggetti) || originalOggetti.length === 0) {
      initializeOriginalData();
    }
    gameState = {
      openStates: { BOTOLA: false },
      awaitingEndConfirm: false,
      awaitingRestart: false,
      currentLocationId: 1,
      ended: false,
      visitedPlaces: new Set([1]),
      Oggetti: [],
      interazioniEseguite: [],
      direzioniSbloccate: {},
      direzioniToggle: {},
      sequenze: {},
      currentLingua: idLingua,
      
      // === SISTEMA PUNTEGGIO ===
      punteggio: {
        totale: 1, // Luogo iniziale (ID=1) già visitato
        interazioniPunteggio: new Set(),
        misteriRisolti: new Set()
      },
      
      // === SISTEMA TEMPORIZZAZIONE ===
      timers: {
        movementCounter: 0,
        torciaDifettosa: false,
        lampadaAccesa: false,
        azioniInLuogoPericoloso: 0,
        ultimoLuogoPericoloso: null,
        matchesLeft: 6,
        matchTimer: 0
      },

      // === SISTEMA TURN (v3.0) ===
      turn: {
        globalTurnNumber: 0,        // Contatore globale di tutti i turni (consumati o no)
        totalTurnsConsumed: 0,       // Contatore turni che consumano tempo
        turnsInDarkness: 0,          // Solo compatibilità salvataggi
        turnsInDangerZone: 0,        // Solo compatibilità salvataggi
        darknessTimer: 0,            // Timer del buio (R1)
        openAreaTimer: 0,            // Timer della zona aperta (R2)
        movedThisTurn: false,        // Se l'ultimo comando ha cambiato luogo
        current: {
          parseResult: null,         // Comando corrente
          consumesTurn: false,       // Se questo comando consuma turno
          location: 1,               // Luogo attuale
          hasLight: false,           // Se ha fonte di luce attiva
          inDangerZone: false        // Se in zona pericolosa
        },
        previous: {
          location: 1,               // Luogo precedente
          hasLight: false,           // Se aveva luce
          consumedTurn: false,       // Se turno precedente fu consumato
          inDangerZone: false        // Se era in zona pericolosa
        }
      },
      
      // === SISTEMA VITTORIA ===
      narrativeState: null,
      narrativePhase: 0,
      victory: false,
      movementBlocked: false,
      guardTimer: 0,
      awaitingContinue: false,
      continueCallback: null
    };
    // Aggiungi Oggetti a gameState dai dati originali
    const baseOggetti = Array.isArray(globalThis[ORIGINAL_OGGETTI_KEY])
      ? globalThis[ORIGINAL_OGGETTI_KEY]
      : originalOggetti;

    const oggettiPerLingua = baseOggetti.filter(
      (o) =>
        o?.IDLingua === idLingua ||
        o?.IDLingua === null ||
        o?.IDLingua === undefined
    );
    if (oggettiPerLingua.length > 0) {
      gameState.Oggetti = JSON.parse(JSON.stringify(oggettiPerLingua)); // Deep copy dai dati originali
      console.log('Caricamento Oggetti in gameState: Sì, numero di record: ' + gameState.Oggetti.length);
    } else {
      gameState.Oggetti = [];
    }
  }

  // === HELPER FUNCTIONS PER SISTEMA TURN (v3.0) ===

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

  /**
   * Determina se un comando consuma un turno temporale.
   * Solo i comandi SYSTEM (informativi) non consumano turno.
   * NAVIGATION e ACTION consumano turno.
   * @param {Object} parseResult - Risultato del parsing del comando
   * @returns {boolean} - true se il comando consuma turno
   */
  function shouldConsumeTurn(parseResult) {
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
   * Verifica se il giocatore ha una fonte di luce attiva.
   * Controlla sia la torcia (Oggetto ID=2) che la lampada (ID=9).
   * @returns {boolean} - true se ha luce attiva
   */
  function hasFonteLuceAttiva() {
    // Alla barriera (luogo 59) la luce è garantita (BAS 1030–1050)
    if (gameState.currentLocationId === 59) {
      return true;
    }

    // Verifica torcia elettrica (ID=37) nell'inventario e non spenta.
    // Source of truth inventario: `IDLuogo === 0` (come in v1.3.2).
    const torcia = gameState.Oggetti.find((o) => o.ID === 37);
    if (torcia && torcia.IDLuogo === 0 && !gameState.timers.torciaDifettosa) {
      return true;
    }

    // Verifica lampada (ID=27) accesa: fa luce solo dove si trova, in inventario o nel luogo
    // corrente (R8, §4.3). Altrove il comportamento non cambia (R9: allontanarsene è morte immediata).
    if (gameState.timers.lampadaAccesa) {
      const lampada = gameState.Oggetti.find((o) => o.ID === 27);
      if (lampada && (lampada.IDLuogo === 0 || lampada.IDLuogo === gameState.currentLocationId)) {
        return true;
      }
    }

    // Fiammifero acceso (R8): dà luce per il comando successivo a quello che lo accende
    if (gameState.timers.matchTimer > 0) {
      return true;
    }

    return false;
  }

  /**
   * Crea uno snapshot immutabile del mondo per il turno corrente.
   * Salva lo stato precedente e aggiorna i contatori globali.
   * @param {Object} parseResult - Risultato del parsing del comando
   */
  function prepareTurnContext(parseResult) {
    // Luoghi pericolosi (zona intercettazione): 51, 52, 53, 55, 56, 58
    const dangerZones = [51, 52, 53, 55, 56, 58];
    
    // Salva stato precedente (shallow copy di current, con fallback per prima esecuzione)
    const prev = gameState.turn.current || {};
    gameState.turn.previous = {
      location: prev.location || gameState.currentLocationId,
      hasLight: prev.hasLight || false,
      consumedTurn: prev.consumesTurn || false,
      inDangerZone: prev.inDangerZone || false  // BUGFIX Sprint 3.3.5.C
    };

    // Determina proprietà turno corrente
    const consumesTurn = shouldConsumeTurn(parseResult);
    const hasLight = hasFonteLuceAttiva();
    const inDangerZone = dangerZones.includes(gameState.currentLocationId);

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
   * - Intercettazione NON è più qui: migrata a gameOverEffect (Sprint 3.3.5.C)
   * - awaitingContinue NON è più qui: gestito da victoryEffect middleware
   * 
   * @param {Object} parseResult - Risultato del parsing del comando
   * @returns {Object|null} - Oggetto risultato se bloccato, null se ok
   */
  function runPreExecutionChecks(parseResult) {
    // Check movement block: guardia blocca movimento (Sprint 3.4.B)
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

  // === POST-EXECUTION EFFECTS (v3.0) ===

  /**
   * Applica effetti temporali dopo l'esecuzione del comando.
   * Delega l'applicazione degli effetti al sistema turnEffects (middleware pattern).
   * 
   * @param {Object} result - Risultato comando da executeCommandLegacy
   * @param {Object} parseResult - Comando parsato originale
   * @returns {Object} - Risultato modificato con eventuali effetti
   */
  function applyTurnEffects(result, parseResult) {
    // === RICALCOLO hasLight dopo esecuzione comando ===
    // Se il comando ha modificato lo stato dell'illuminazione (es. ACCENDI LAMPADA),
    // dobbiamo ricalcolare hasLight PRIMA di applicare gli effetti
    const updatedHasLight = hasFonteLuceAttiva();
    gameState.turn.current.hasLight = updatedHasLight;
    
    // === RICALCOLO inDangerZone dopo esecuzione comando ===
    // BUGFIX Sprint 3.3.5.C: Se il comando ha cambiato location (NAVIGATION),
    // dobbiamo ricalcolare inDangerZone con la nuova location
    const dangerZones = [51, 52, 53, 55, 56, 58];
    const updatedInDangerZone = dangerZones.includes(gameState.currentLocationId);
    gameState.turn.current.inDangerZone = updatedInDangerZone;

    // Movimento riuscito: luogo cambiato rispetto all'inizio del turno (R1, R2)
    gameState.turn.movedThisTurn = gameState.currentLocationId !== gameState.turn.current.location;

    // === APPLICA EFFETTI TEMPORALI REGISTRATI (Sprint 3.3.5) ===
    // Delega al sistema middleware: ogni effetto modifica gameState e result
    applyAllTurnEffects(gameState, result, parseResult);
    
    // Sprint 3.3.5.A: ✅ Sistema Torcia (spegnimento dopo 6 turni)
    // Sprint 3.3.5.B: ✅ Sistema Buio (morte dopo 3 turni senza luce)
    // Sprint 3.3.5.C: ✅ Sistema Intercettazione (morte dopo 4 turni in danger zone)
    // Nota: i misteri vengono gestiti dal “Sistema Punteggio Misteri” (Sprint 3.2.2) in questo file.
    
    // === DEBUG: Monitor stato turni ===
    // Logica incremento:
    // - globalTurnNumber: incrementato SEMPRE (anche per comandi SYSTEM)
    // - totalTurnsConsumed: incrementato SOLO per comandi consuming (NAVIGATION, ACTION)
    // Logica torcia:
    // - torciaDifettosa = true se: totalTurnsConsumed >= 6 OR torcia.IDLuogo != 0
    
    return result;
  }

  // Funzione helper per capitalizzare comandi
  function capitalizeCommand(str) {
    // Mapping speciale per alcuni comandi
    const mappings = {
      'PRENDERE': 'Prendi',
      'SALVARE': 'Salva',
      'CARICARE': 'Carica',
      'INVENTARIO': 'Inventario',
      'ESAMINARE': 'Esamina',
      'OSSERVARE': 'Osserva',
      'GUARDARE': 'Guarda',
      'APRIRE': 'Apri',
      'CHIUDERE': 'Chiudi',
      'LEGGERE': 'Leggi',
      'INFILARE': 'Infila',
      'POSARE': 'Posa',
      'LASCIARE': 'Lascia',
      'SPOSTARE': 'Sposta',
      'MUOVERE': 'Muovi',
      'ACCENDERE': 'Accendi',
      'METTERE': 'Metti',
      'AIUTO': 'Aiuto',
      'FINE': 'Fine',
      'PUNTI': 'Punti',
      'NORD': 'Nord',
      'SUD': 'Sud',
      'EST': 'Est',
      'OVEST': 'Ovest',
      'SU': 'Su',
      'GIU': 'Giù'
    };
    if (mappings[str]) return mappings[str];
    
    // Capitalizzazione standard
    return str.charAt(0) + str.slice(1).toLowerCase();
  }

  // Funzione isolata per generare messaggio di aiuto
  function generateHelpMessage(idLingua = gameState?.currentLingua ?? 1) {
    const lingua = Number(idLingua) === 2 ? 2 : 1;
    const termini = global.odessaData.TerminiLessico || [];

    // IT: manteniamo il comportamento storico (concetti canonici + capitalizzazione).
    if (lingua === 1) {
      const direzioni = termini
        .filter(t => t.ID_TipoLessico === 2)
        .map(t => capitalizeCommand(t.Concetto))
        .sort();

      const sistema = termini
        .filter(t => t.ID_TipoLessico === 3)
        .map(t => capitalizeCommand(t.Concetto))
        .sort();

      const verbi = termini
        .filter(t => t.ID_TipoLessico === 1)
        .map(t => capitalizeCommand(t.Concetto))
        .sort();

      let msg = '<b>Comandi disponibili:</b>\n';
      msg += '<i>Direzioni: ' + direzioni.join(', ') + '</i>\n';
      msg += '<i>Sistema: ' + sistema.join(', ') + '</i>\n';
      msg += '<i>Azioni: ' + verbi.join(', ') + '</i>\n\n';
      return msg;
    }

    // EN: usa VociLessico per mostrare comandi in lingua selezionata.
    const voci = global.odessaData.VociLessico || [];

    function voicesForTerm(termId) {
      return voci
        .filter(v => v.ID_Termine === termId && v.ID_Lingua === 2)
        .map(v => String(v.Voce || '').trim())
        .filter(Boolean);
    }

    function pickPrimaryVoice(termId) {
      const voices = Array.from(new Set(voicesForTerm(termId)))
        .sort((a, b) => a.localeCompare(b, 'en'));
      if (!voices.length) return null;
      // Preferisci una voce "lunga" (es. NORTH) rispetto a abbreviazioni (es. N)
      const long = voices.find(v => v.length > 1);
      return long || voices[0];
    }

    function pickDirectionVoice(termId) {
      const voices = Array.from(new Set(voicesForTerm(termId)))
        .sort((a, b) => a.localeCompare(b, 'en'));
      if (!voices.length) return null;
      const long = voices.find(v => v.length > 1);
      const short = voices.find(v => v.length === 1);
      if (long && short) return `${long} (${short})`;
      return long || short || voices[0];
    }

    const direzioni = termini
      .filter(t => t.ID_TipoLessico === 2)
      .map(t => pickDirectionVoice(t.ID_Termine) || capitalizeCommand(t.Concetto))
      .sort((a, b) => a.localeCompare(b, 'en'));

    const sistema = termini
      .filter(t => t.ID_TipoLessico === 3)
      .map(t => pickPrimaryVoice(t.ID_Termine) || capitalizeCommand(t.Concetto))
      .sort((a, b) => a.localeCompare(b, 'en'));

    const verbi = termini
      .filter(t => t.ID_TipoLessico === 1)
      .map(t => pickPrimaryVoice(t.ID_Termine) || capitalizeCommand(t.Concetto))
      .sort((a, b) => a.localeCompare(b, 'en'));

    let msg = '<b>Available commands:</b>\n';
    msg += '<i>Directions: ' + direzioni.join(', ') + '</i>\n';
    msg += '<i>System: ' + sistema.join(', ') + '</i>\n';
    msg += '<i>Actions: ' + verbi.join(', ') + '</i>\n\n';
    return msg;
  }

  // Funzione centralizzata per generare descrizione luogo con oggetti presenti
  function generaDescrizioneLuogoConOggetti(idLuogo) {
    const luogo = global.odessaData.Luoghi.find(l => l.ID === idLuogo && l.IDLingua === gameState.currentLingua);
    if (!luogo) return '';
    
    let messaggio = `<span style="color: black;">${luogo.Descrizione}</span>\n`;
    
    // Aggiungi lista oggetti presenti (include scenici spostabili: Attivo=2)
    const oggettiPresenti = gameState.Oggetti.filter(o => 
      o.IDLuogo === idLuogo && o.Attivo >= 1
    );
    
    if (oggettiPresenti.length > 0) {
      messaggio += `\n<b><i>${getSystemMessage('engine.location.objectsPresent', gameState.currentLingua)}</i></b>\n`;
      oggettiPresenti.forEach(obj => {
        messaggio += `<i>  - ${obj.Oggetto}</i>\n`;
      });
    }
    
    return messaggio;
  }

  // Funzione per ottenere gli oggetti correnti
  function getOggetti() {
    return gameState.Oggetti || [];
  }

  // Funzione per ottenere le direzioni disponibili per un luogo
  function getDirezioniLuogo(idLuogo) {
    const luogo = global.odessaData.Luoghi.find(l => l.ID === idLuogo && l.IDLingua === gameState.currentLingua);
    if (!luogo) return {};
    
    const direzioni = {
      Nord: luogo.Nord,
      Est: luogo.Est,
      Sud: luogo.Sud,
      Ovest: luogo.Ovest,
      Su: luogo.Su,
      Giu: luogo.Giu
    };
    
    // Applica sblocchi permanenti
    if (gameState.direzioniSbloccate) {
      for (const [key, value] of Object.entries(gameState.direzioniSbloccate)) {
        const [luogoStr, direzione] = key.split('_');
        if (parseInt(luogoStr) === idLuogo) {
          direzioni[direzione] = value;
        }
      }
    }
    
    // Applica toggle
    if (gameState.direzioniToggle) {
      for (const [key, isOpen] of Object.entries(gameState.direzioniToggle)) {
        const [luogoStr, direzione] = key.split('_');
        if (parseInt(luogoStr) === idLuogo) {
          // Se il toggle è attivo, usa la destinazione, altrimenti blocca
          if (isOpen) {
            // Trova la destinazione originale
            const interazione = (global.odessaData.Interazioni || [])
              .filter(i => i.IDLingua === gameState.currentLingua)
              .find(i => 
                i.effetti && i.effetti.some(e => 
                  e.tipo === 'TOGGLE_DIREZIONE' && 
                  e.luogo === idLuogo && 
                  e.direzione === direzione
                )
              );
            if (interazione) {
              const effetto = interazione.effetti.find(e => 
                e.tipo === 'TOGGLE_DIREZIONE' && 
                e.luogo === idLuogo && 
                e.direzione === direzione
              );
              direzioni[direzione] = effetto.destinazione;
            }
          } else {
            direzioni[direzione] = 0;
          }
        }
      }
    }
    
    return direzioni;
  }

  // Funzione per impostare lo stato di gioco
  function setGameState(newState) {
    gameState = { 
      ...newState,
      awaitingEndConfirm: newState.awaitingEndConfirm === true,
      visitedPlaces: new Set(newState.visitedPlaces || []),
      Oggetti: newState.Oggetti ? JSON.parse(JSON.stringify(newState.Oggetti)) : [],
      // Deserializzazione Set del punteggio
      punteggio: newState.punteggio ? {
        totale: newState.punteggio.totale || 0,
        interazioniPunteggio: new Set(newState.punteggio.interazioniPunteggio || []),
        misteriRisolti: new Set(newState.punteggio.misteriRisolti || [])
      } : {
        totale: 0,
        interazioniPunteggio: new Set(),
        misteriRisolti: new Set()
      },
      // BUGFIX: Assicura struttura turn completa dopo caricamento
      // Timer della guardia (R4): default 5 se il salvataggio è già alla barriera
      guardTimer: typeof newState.guardTimer === 'number'
        ? newState.guardTimer
        : (newState.narrativeState === 'ENDING_PHASE_2_WAIT' ? 5 : 0),
      // Fiammiferi (R8): default per i salvataggi che non li contengono (§4.1)
      timers: (() => {
        const timers = { ...(newState.timers || {}) };
        if (typeof timers.matchesLeft !== 'number') {
          const fiammiferi = (newState.Oggetti || []).find((o) => o.ID === 36);
          timers.matchesLeft = fiammiferi && fiammiferi.IDLuogo !== -1 ? 6 : 0;
        }
        if (typeof timers.matchTimer !== 'number') {
          timers.matchTimer = 0;
        }
        return timers;
      })(),
      turn: newState.turn ? {
        globalTurnNumber: newState.turn.globalTurnNumber || 0,
        totalTurnsConsumed: newState.turn.totalTurnsConsumed || 0,
        turnsInDarkness: newState.turn.turnsInDarkness || 0,
        turnsInDangerZone: newState.turn.turnsInDangerZone || 0,
        darknessTimer: newState.turn.darknessTimer || 0,
        openAreaTimer: newState.turn.openAreaTimer || 0,
        movedThisTurn: newState.turn.movedThisTurn === true,
        current: newState.turn.current ? {
          parseResult: newState.turn.current.parseResult || null,
          consumesTurn: newState.turn.current.consumesTurn || false,
          location: newState.turn.current.location || newState.currentLocationId || 1,
          hasLight: newState.turn.current.hasLight || false,
          inDangerZone: newState.turn.current.inDangerZone || false
        } : {
          parseResult: null,
          consumesTurn: false,
          location: newState.currentLocationId || 1,
          hasLight: false,
          inDangerZone: false
        },
        previous: newState.turn.previous ? {
          location: newState.turn.previous.location || 1,
          hasLight: newState.turn.previous.hasLight || false,
          consumedTurn: newState.turn.previous.consumedTurn || false,
          inDangerZone: newState.turn.previous.inDangerZone || false
        } : {
          location: 1,
          hasLight: false,
          consumedTurn: false,
          inDangerZone: false
        }
      } : {
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
          location: newState.currentLocationId || 1,
          hasLight: false,
          inDangerZone: false
        },
        previous: {
          location: 1,
          hasLight: false,
          consumedTurn: false
        }
      }
    };
    // Campo della v1.4.0 non più usato (R4): ignorato se presente nel salvataggio
    delete gameState.unusefulCommandsCounter;
  }
  // Funzione per impostare il luogo corrente
  function setCurrentLocation(locationId) {
    const before = isEngineDebugEnabled() ? getDebugStateSnapshot() : null;

    gameState.currentLocationId = locationId;
    
    // Sincronizzazione visitedPlaces
    if (!gameState.visitedPlaces.has(locationId)) {
      gameState.visitedPlaces.add(locationId);
      
      // Assegna +1 punto SOLO se NON è luogo terminale
      const luogo = global.odessaData?.Luoghi?.find(l => l.ID === locationId && l.IDLingua === gameState.currentLingua);
      const isTerminal = luogo ? luogo.Terminale === -1 : null;
      if (luogo && !isTerminal) {
        gameState.punteggio.totale += 1;
      }

      if (before) {
        const after = getDebugStateSnapshot();
        pushEngineDebugEvent({
          kind: 'SET_CURRENT_LOCATION',
          fromLocationId: before.currentLocationId,
          toLocationId: after.currentLocationId,
          wasNewVisit: true,
          isTerminal,
          delta: {
            score: (after.score ?? 0) - (before.score ?? 0),
          },
          before,
          after,
        });
      }
      return;
    }

    if (before) {
      const after = getDebugStateSnapshot();
      pushEngineDebugEvent({
        kind: 'SET_CURRENT_LOCATION',
        fromLocationId: before.currentLocationId,
        toLocationId: after.currentLocationId,
        wasNewVisit: false,
        delta: {
          score: (after.score ?? 0) - (before.score ?? 0),
        },
        before,
        after,
      });
    }
  }

  function getGameStateSnapshot() {
    const currentLocation = global.odessaData.Luoghi.find(l => l.ID === gameState.currentLocationId && l.IDLingua === gameState.currentLingua);
    const snapshot = {
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
      currentLingua: gameState.currentLingua,
      // Serializzazione nuove strutture
      punteggio: {
        totale: gameState.punteggio.totale,
        interazioniPunteggio: Array.from(gameState.punteggio.interazioniPunteggio),
        misteriRisolti: Array.from(gameState.punteggio.misteriRisolti)
      },
      timers: { ...gameState.timers },
      narrativeState: gameState.narrativeState,
      narrativePhase: gameState.narrativePhase,
      victory: gameState.victory,
      movementBlocked: gameState.movementBlocked,
      guardTimer: gameState.guardTimer,
      awaitingContinue: gameState.awaitingContinue,
      // Turn System v3.0 (Sprint 3.3.5)
      turn: {
        globalTurnNumber: gameState.turn.globalTurnNumber,
        totalTurnsConsumed: gameState.turn.totalTurnsConsumed,
        turnsInDarkness: gameState.turn.turnsInDarkness,
        turnsInDangerZone: gameState.turn.turnsInDangerZone,
        darknessTimer: gameState.turn.darknessTimer,
        openAreaTimer: gameState.turn.openAreaTimer,
        movedThisTurn: gameState.turn.movedThisTurn,
        current: {
          parseResult: null, // Non serializzabile/non necessario
          consumesTurn: gameState.turn.current.consumesTurn,
          location: gameState.turn.current.location,
          hasLight: gameState.turn.current.hasLight,
          inDangerZone: gameState.turn.current.inDangerZone
        },
        previous: {
          location: gameState.turn.previous.location,
          hasLight: gameState.turn.previous.hasLight,
          consumedTurn: gameState.turn.previous.consumedTurn,
          inDangerZone: gameState.turn.previous.inDangerZone
        }
      },
      // Metadata per chiarezza
      currentLocationName: currentLocation ? currentLocation.Nome : 'Sconosciuto',
      timestamp: new Date().toISOString(),
      version: appVersion,
    };
    return snapshot;
  }

  function toCommandDTO(parseResult) {
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

  // Funzione helper per normalizzare nomi (spazi -> underscore)
  function normalizeForComparison(str) {
    return str.toUpperCase().replace(/\s+/g, '_');
  }

  // Funzione per verificare i prerequisiti di un'interazione.
  // Restituisce { ok: true } oppure { ok: false, prerequisito } con il primo prerequisito fallito.
  function verificaPrerequisiti(prerequisiti) {
    if (!prerequisiti || prerequisiti.length === 0) return { ok: true };
    
    for (const req of prerequisiti) {
      if (req.tipo === 'OGGETTO_IN_INVENTARIO') {
        const oggetto = gameState.Oggetti.find(o => 
          normalizeForComparison(o.Oggetto) === normalizeForComparison(req.target) && 
          o.IDLuogo === 0 && 
          o.Attivo >= 3
        );
        if (!oggetto) return { ok: false, prerequisito: req };
      } else if (req.tipo === 'OGGETTO_IN_LUOGO') {
        const oggetto = gameState.Oggetti.find(o => 
          normalizeForComparison(o.Oggetto) === normalizeForComparison(req.target) && 
          o.IDLuogo === req.luogo && 
          o.Attivo >= 1
        );
        if (!oggetto) return { ok: false, prerequisito: req };
      } else if (req.tipo === 'OGGETTO_VISIBILE') {
        const oggetto = gameState.Oggetti.find(o => 
          normalizeForComparison(o.Oggetto) === normalizeForComparison(req.target) && 
          o.IDLuogo === req.luogo && 
          o.Attivo >= 1
        );
        if (!oggetto) return { ok: false, prerequisito: req };
      } else if (req.tipo === 'SEQUENZA_COMPLETATA') {
        const seq = gameState.sequenze[req.target];
        if (!seq || !seq.completata) return { ok: false, prerequisito: req };
      } else if (req.tipo === 'INTERAZIONE_ESEGUITA') {
        if (!gameState.interazioniEseguite.includes(req.target)) return { ok: false, prerequisito: req };
      } else if (req.tipo === 'FLAG_FALSE') {
        if (getNestedProperty(gameState, req.flag)) return { ok: false, prerequisito: req };
      } else if (!PREREQUISITE_TYPES.has(req.tipo)) {
        // Tipo sconosciuto: fail-closed (prerequisito non soddisfatto), segnalato una sola volta.
        warnUnknownTypeOnce('prerequisito', req.tipo);
        return { ok: false, prerequisito: req };
      }
    }
    return { ok: true };
  }

  // === SISTEMA PUNTEGGIO MISTERI ===
  // Assegna +3 punti quando un mistero viene risolto automaticamente tramite effetti
  // statoPreToggle: stato del toggle PRIMA dell'effetto (solo per TOGGLE_DIREZIONE), calcolato in applicaEffetti
  function assegnaPunteggioMistero(effetto, { statoPreToggle } = {}) {
    let misteroId = null;
    
    // Task 4a: VISIBILITA - oggetto diventa visibile
    if (effetto.tipo === 'VISIBILITA') {
      misteroId = `visibilita_${effetto.target}`;
    }
    
    // Task 4b: SBLOCCA_DIREZIONE - direzione sbloccata permanentemente
    // IMPORTANTE: Direzioni bidirezionali (A↔B) contano come 1 solo mistero
    // Usiamo sempre la coppia (min, max) per normalizzare
    else if (effetto.tipo === 'SBLOCCA_DIREZIONE') {
      const luogoA = effetto.luogo;
      const luogoB = effetto.destinazione;
      // Normalizza: usa sempre coppia ordinata (min, max)
      const min = Math.min(luogoA, luogoB);
      const max = Math.max(luogoA, luogoB);
      misteroId = `direzione_${min}_${max}`;
    }
    
    // Task 4c: TOGGLE_DIREZIONE - solo prima apertura (0 → valore)
    else if (effetto.tipo === 'TOGGLE_DIREZIONE') {
      // Usa lo stato PRE-toggle passato da applicaEffetti()
      // Assegna punti solo se sta APRENDO (false → true)
      // Chiusure (true → false) e riaperture successive: NO +3
      if (statoPreToggle === false) {
        // Normalizza come SBLOCCA_DIREZIONE: usa coppia ordinata (min, max)
        const luogoA = effetto.luogo;
        const luogoB = effetto.destinazione;
        const min = Math.min(luogoA, luogoB);
        const max = Math.max(luogoA, luogoB);
        misteroId = `direzione_${min}_${max}`;
      }
    }
    
    // Assegna +3 punti se il mistero non è già stato risolto
    if (misteroId && !gameState.punteggio.misteriRisolti.has(misteroId)) {
      gameState.punteggio.totale += 3;
      gameState.punteggio.misteriRisolti.add(misteroId);
    }
  }

  /**
   * Consuma un fiammifero (R8, §4.2): usata da `accendi fiammifero` e dall'effetto
   * CONSUMA_FIAMMIFERO (interazione `accendi_lampada`). Se la scorta si esaurisce,
   * i Fiammiferi (ID 36) spariscono dal gioco.
   * @returns {boolean} true se i fiammiferi sono appena finiti
   */
  function consumaFiammifero() {
    if (typeof gameState.timers.matchesLeft !== 'number') {
      gameState.timers.matchesLeft = 6;
    }
    gameState.timers.matchesLeft = Math.max(0, gameState.timers.matchesLeft - 1);
    if (gameState.timers.matchesLeft === 0) {
      const fiammiferi = gameState.Oggetti.find((o) => o.ID === 36);
      if (fiammiferi) {
        fiammiferi.IDLuogo = -1;
        fiammiferi.Attivo = 0;
        fiammiferi.Inventario = false;
      }
      return true;
    }
    return false;
  }

  /**
   * Gestisce `accendi fiammifero` (R8, §4.3): non è un'interazione di Interazioni.json
   * (nessun punteggio). Ammesso se i Fiammiferi sono in inventario o nel luogo corrente.
   */
  function accendiFiammifero() {
    const fiammiferi = gameState.Oggetti.find((o) =>
      o.ID === 36 &&
      (o.IDLuogo === 0 || o.IDLuogo === gameState.currentLocationId) &&
      o.Attivo >= 1
    );
    if (!fiammiferi || !(gameState.timers.matchesLeft > 0)) {
      return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.matches.none', gameState.currentLingua), effects: [] };
    }

    const finished = consumaFiammifero();
    gameState.timers.matchTimer = 2;
    let message = getSystemMessage('engine.matches.lit', gameState.currentLingua);
    if (finished) {
      message += '\n\n' + getSystemMessage('engine.matches.finished', gameState.currentLingua);
    }
    return { accepted: true, resultType: 'OK', message, effects: [] };
  }

  // Funzione per applicare gli effetti di un'interazione
  // @returns {string[]} messaggi aggiuntivi da accodare alla risposta (es. fiammiferi finiti)
  function applicaEffetti(effetti, luogoCorrente) {
    const extraMessages = [];
    for (const effetto of effetti) {
      // Stato precedente al toggle: variabile locale (non si scrive sui dati globali condivisi)
      let statoPreToggle;
      if (effetto.tipo === 'VISIBILITA') {
        // Se l'effetto specifica un luogo, cerca solo lì. Altrimenti cerca nel luogo corrente
        const targetLuogo = effetto.luogo !== undefined ? effetto.luogo : luogoCorrente;
        const oggetto = gameState.Oggetti.find(o => 
          normalizeForComparison(o.Oggetto) === normalizeForComparison(effetto.target) &&
          (targetLuogo === undefined || o.IDLuogo === targetLuogo)
        );
        if (oggetto) {
          oggetto.Attivo = effetto.valore;
        }
      } else if (effetto.tipo === 'SPOSTA_OGGETTO') {
        const oggetto = gameState.Oggetti.find(o => 
          normalizeForComparison(o.Oggetto) === normalizeForComparison(effetto.target)
        );
        if (oggetto) {
          oggetto.IDLuogo = effetto.a_luogo;
        }
      } else if (effetto.tipo === 'SBLOCCA_DIREZIONE') {
        // Modifica la direzione nel gameState (da implementare con Luoghi dinamici)
        // Per ora registriamo l'effetto
        const key = `${effetto.luogo}_${effetto.direzione}`;
        if (!gameState.direzioniSbloccate) gameState.direzioniSbloccate = {};
        gameState.direzioniSbloccate[key] = effetto.destinazione;
      } else if (effetto.tipo === 'TOGGLE_DIREZIONE') {
        const key = `${effetto.luogo}_${effetto.direzione}`;
        if (!gameState.direzioniToggle[key]) {
          gameState.direzioniToggle[key] = false;
        }
        // Salva stato PRIMA del toggle per assegnaPunteggioMistero
        statoPreToggle = gameState.direzioniToggle[key];
        gameState.direzioniToggle[key] = !gameState.direzioniToggle[key];
      } else if (effetto.tipo === 'VITTORIA') {
        gameState.ended = true;
        gameState.victory = true;
      } else if (effetto.tipo === 'SEQUENZA') {
        // Gestione sequenze (es. combinazione cassaforte)
        // Questo effetto viene gestito direttamente in cercaEseguiInterazione
        // perché richiede accesso alla risposta e controllo flusso
      } else if (effetto.tipo === 'SET_FLAG') {
        // Imposta un flag in gameState usando percorso nested (es. "timers.lampadaAccesa")
        setNestedProperty(gameState, effetto.flag, effetto.valore);
      } else if (effetto.tipo === 'RESET_COUNTER') {
        // Resetta un counter in gameState a 0 (es. "turn.turnsInDarkness")
        setNestedProperty(gameState, effetto.counter, 0);
      } else if (effetto.tipo === 'CONSUMA_FIAMMIFERO') {
        // R8: consumo di un fiammifero (interazione accendi_lampada)
        if (consumaFiammifero()) {
          extraMessages.push(getSystemMessage('engine.matches.finished', gameState.currentLingua));
        }
      } else if (!EFFECT_TYPES.has(effetto.tipo)) {
        warnUnknownTypeOnce('effetto', effetto.tipo);
      }
      
      // === SISTEMA PUNTEGGIO MISTERI ===
      // Assegna +3 punti se questo effetto risolve un mistero
      assegnaPunteggioMistero(effetto, { statoPreToggle });
    }
    return extraMessages;
  }

  // Funzione per cercare e eseguire un'interazione
  function cercaEseguiInterazione(verb, noun) {
    const interazioni = (global.odessaData.Interazioni || [])
      .filter(i => i.IDLingua === gameState.currentLingua);
    
    // Cerca un'interazione che corrisponda
    for (const interazione of interazioni) {
      if (normalizeForComparison(interazione.trigger.verbo) === normalizeForComparison(verb) &&
          normalizeForComparison(interazione.trigger.oggetto) === normalizeForComparison(noun)) {
        
        // Verifica luogo
        if (interazione.condizioni.luogo && interazione.condizioni.luogo !== gameState.currentLocationId) {
          continue;
        }
        
        // Verifica se già eseguita (se non ripetibile)
        if (!interazione.ripetibile && gameState.interazioniEseguite.includes(interazione.id)) {
          const messaggio = interazione.risposta_gia_eseguita || "Non c'è bisogno di farlo di nuovo.";
          return { accepted: true, resultType: 'OK', message: messaggio, effects: [] };
        }
        
        // Verifica prerequisiti
        const esitoPrerequisiti = verificaPrerequisiti(interazione.condizioni.prerequisiti);
        if (!esitoPrerequisiti.ok) {
          const rispostaPrerequisito = esitoPrerequisiti.prerequisito.risposta;
          if (rispostaPrerequisito) {
            // Risposta dedicata: nessun effetto, nessun punteggio, interazione non registrata come eseguita
            return { accepted: true, resultType: 'OK', message: rispostaPrerequisito, effects: [] };
          }
          // Senza risposta dedicata: passa all'interazione successiva
          continue;
        }
        
        // Interazione trovata e valida
        // Determina la risposta (per toggle)
        let risposta = interazione.risposta;
        if (interazione.trigger.verbo === 'PREMERE' || interazione.trigger.verbo === 'RUOTARE') {
          // Verifica stato toggle
          const primoEffetto = interazione.effetti.find(e => e.tipo === 'TOGGLE_DIREZIONE');
          if (primoEffetto) {
            const key = `${primoEffetto.luogo}_${primoEffetto.direzione}`;
            const statoCorrente = gameState.direzioniToggle[key] || false;
            risposta = statoCorrente ? interazione.risposta_chiudi : interazione.risposta_apri;
          }
        }
        
        // Gestione speciale per effetto SEQUENZA
        const effettoSequenza = interazione.effetti.find(e => e.tipo === 'SEQUENZA');
        if (effettoSequenza) {
          const key = effettoSequenza.target;
          const direzione = effettoSequenza.direzione;
          
          // Inizializza sequenza se non esiste
          if (!gameState.sequenze[key]) {
            gameState.sequenze[key] = {
              pattern: effettoSequenza.pattern,
              progressione: [],
              completata: false
            };
          }
          
          const seq = gameState.sequenze[key];
          
          // Se già completata, non fare nulla
          if (seq.completata) {
            return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.safeAlreadyOpen', gameState.currentLingua), effects: [] };
          }
          
          // Verifica se la direzione è corretta per il passo attuale
          const passoAtteso = seq.pattern[seq.progressione.length];
          
          if (direzione === passoAtteso) {
            seq.progressione.push(direzione);
            
            // Sequenza completata?
            if (seq.progressione.length === seq.pattern.length) {
              seq.completata = true;
              
              // § 3.2.3 Task 5: Award +2 points for cassaforte sequence completion
              if (!gameState.punteggio.misteriRisolti.has('sequenza_cassaforte')) {
                gameState.punteggio.misteriRisolti.add('sequenza_cassaforte');
                gameState.punteggio.totale += 2;
              }
              
              applicaEffetti(effettoSequenza.effetti_completamento, interazione.condizioni.luogo);
              risposta = interazione.risposta_completa;
              
              // Usa funzione centralizzata per descrizione luogo e oggetti
              const descrizioneCompleta = generaDescrizioneLuogoConOggetti(gameState.currentLocationId);
              const messaggioCompleto = risposta + '\n\n' + descrizioneCompleta;
              
              return { accepted: true, resultType: 'OK', message: messaggioCompleto, effects: interazione.effetti };
            } else {
              risposta = interazione.risposta_step;
              return { accepted: true, resultType: 'OK', message: risposta, effects: [] };
            }
          } else {
            // Errore: reset sequenza
            seq.progressione = [];
            risposta = interazione.risposta_errore;
            return { accepted: true, resultType: 'OK', message: risposta, effects: [] };
          }
        }
        
        // === SISTEMA PUNTEGGIO: Assegna +2 punti PRIMA di applicare effetti ===
        // Importante: deve avvenire PRIMA di applicaEffetti() perché VITTORIA imposta ended=true
        if (!gameState.punteggio.interazioniPunteggio.has(interazione.id)) {
          gameState.punteggio.totale += 2;
          gameState.punteggio.interazioniPunteggio.add(interazione.id);
        }
        
        // Segna come eseguita
        if (!interazione.ripetibile) {
          gameState.interazioniEseguite.push(interazione.id);
        }
        
        // Applica effetti (passa il luogo corrente per risolvere ambiguità oggetti con stesso nome)
        const extraMessages = applicaEffetti(interazione.effetti, interazione.condizioni.luogo);
        if (extraMessages.length > 0) {
          risposta = risposta + '\n\n' + extraMessages.join('\n\n');
        }

        // Verifica se è VITTORIA per aggiungere flag ended nella risposta
        const hasVittoriaEffect = interazione.effetti.some(e => e.tipo === 'VITTORIA');
        const resultBase = { 
          accepted: true, 
          resultType: 'OK', 
          effects: interazione.effetti
        };
        
        // Se VITTORIA, aggiungi flag ended e victory alla risposta
        if (hasVittoriaEffect) {
          resultBase.ended = true;
          resultBase.victory = true;
        }
        
        // Se ci sono effetti VISIBILITA, aggiungi descrizione luogo e oggetti
        const haVisibilitaEffects = interazione.effetti.some(e => e.tipo === 'VISIBILITA');
        if (haVisibilitaEffects) {
          // Usa funzione centralizzata per descrizione luogo e oggetti
          const descrizioneCompleta = generaDescrizioneLuogoConOggetti(gameState.currentLocationId);
          const messaggioCompleto = risposta + '\n\n' + descrizioneCompleta;
          
          return { ...resultBase, message: messaggioCompleto };
        }
        
        return { ...resultBase, message: risposta };
      }
    }
    
    return null;
  }

  // === LEGACY COMMAND EXECUTION (Preserved for backward compatibility) ===
  // This function contains the original 173 LOC command execution logic.
  // It is called by the new executeCommand wrapper which adds turn-based pipeline.

  function executeCommandLegacy(parseResult) {
    if (!parseResult) {
      return { accepted: false, resultType: 'ERROR', message: getSystemMessage('engine.error.noParseResult', gameState.currentLingua) };
    }
    if (parseResult.IsValid !== true) {
      const userMessage = mapParseErrorToUserMessage(parseResult, gameState.currentLingua);
      return {
        accepted: false,
        resultType: 'ERROR',
        message: userMessage || getSystemMessage('parse.error.invalidInputGeneric', gameState.currentLingua),
      };
    }
    // Esecuzione minimale con stato per alcuni comandi
    switch (parseResult.CommandType) {
      case 'NAVIGATION':
        {
          const concept = (parseResult.VerbConcept || parseResult.CanonicalVerb || '').toUpperCase();

          const directionField = (() => {
            switch (concept) {
              case 'NORD':
                return 'Nord';
              case 'EST':
                return 'Est';
              case 'SUD':
                return 'Sud';
              case 'OVEST':
                return 'Ovest';
              case 'SU':
              case 'ALTO':
                return 'Su';
              case 'GIU':
              case 'GIÙ':
              case 'BASSO':
                return 'Giu';
              default:
                return null;
            }
          })();

          const messageBlocked = gameState.currentLingua === 2
            ? 'You cannot go that way.'
            : 'Non puoi andare in quella direzione.';

          const messageUnknown = gameState.currentLingua === 2
            ? 'Direction not recognized.'
            : 'Direzione non riconosciuta.';

          if (!directionField) {
            return {
              accepted: true,
              resultType: 'ERROR',
              message: messageUnknown,
              effects: [],
            };
          }

          const currentId = gameState.currentLocationId;
          const direzioni = getDirezioniLuogo(currentId);
          const nextId = direzioni?.[directionField];

          if (typeof nextId !== 'number' || nextId < 1) {
            return {
              accepted: true,
              resultType: 'ERROR',
              message: messageBlocked,
              effects: [],
            };
          }

          setCurrentLocation(nextId);
          return {
            accepted: true,
            resultType: 'OK',
            message: '',
            effects: [],
            locationId: nextId,
            showLocation: true,
          };
        }
      case 'SYSTEM':
        {
          // Preferisci il concetto per normalizzare i sinonimi (INVENTARIO/COSA/?)
          const concept = (parseResult.VerbConcept || parseResult.CanonicalVerb || '').toUpperCase();
          switch (concept) {
            case 'INVENTARIO': {
              const inventoryItems = (gameState.Oggetti || []).filter(item => item.Attivo >= 3 && item.IDLuogo === 0 && item.IDLingua === gameState.currentLingua);
              if (inventoryItems.length === 0) {
                return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.inventory.empty', gameState.currentLingua), effects: [], showLocation: true };
              }
              const itemNames = inventoryItems.map(item => item.Oggetto).join(', ');
              return {
                accepted: true,
                resultType: 'OK',
                message: getSystemMessage('engine.inventory.list', gameState.currentLingua, [itemNames]),
                effects: [],
                showLocation: true
              };
            }
            case 'AIUTO': {
              const message = generateHelpMessage(gameState.currentLingua);
              return { accepted: true, resultType: 'OK', message, effects: [], showLocation: true };
            }
            case 'SALVARE': {
              return { accepted: true, resultType: 'SAVE_GAME', message: getSystemMessage('engine.save.inProgress', gameState.currentLingua), effects: [] };
            }
            case 'CARICARE':
              return { accepted: true, resultType: 'LOAD_GAME', message: getSystemMessage('engine.load.inProgress', gameState.currentLingua), effects: [] };
            case 'PUNTI': {
              // § 3.2.3 Task 6: Display score with rank and breakdown (i18n ready)
              const totale = gameState.punteggio.totale;
              const visitedPlaces = gameState.visitedPlaces.size;
              const interazioni = gameState.punteggio.interazioniPunteggio.size;
              const misteri = gameState.punteggio.misteriRisolti.size;
              
              // Ranghi basati su soglie (localizzati)
              let rangoKey = 'engine.rank.novice';
              if (totale >= 100) rangoKey = 'engine.rank.master';
              else if (totale >= 67) rangoKey = 'engine.rank.investigator';
              else if (totale >= 34) rangoKey = 'engine.rank.explorer';
              if (totale >= 134) rangoKey = 'engine.rank.perfectionist';
              
              const rango = getSystemMessage(rangoKey, gameState.currentLingua);
              const breakdown = getSystemMessage('engine.score.breakdown', gameState.currentLingua, [
                totale.toString(),
                rango,
                visitedPlaces.toString(),
                interazioni.toString(),
                misteri.toString()
              ]);
              return { accepted: true, resultType: 'OK', message: breakdown, effects: [], showLocation: true };
            }
            case 'FINE':
              gameState.awaitingEndConfirm = true;
              return { accepted: true, resultType: 'CONFIRM_END', message: getSystemMessage('engine.end.confirm', gameState.currentLingua), effects: [] };
            default:
              return {
                accepted: true,
                resultType: 'OK',
                message: `Stub: sistema ${parseResult.CanonicalVerb}`,
                effects: [],
              };
          }
        }
      case 'ACTION':
        {
          const verb = (parseResult.CanonicalVerb || '').toUpperCase();
          const concept = (parseResult.VerbConcept || '').toUpperCase();
          // Usa NounConcept invece di CanonicalNoun per gestire correttamente nomi composti
          const noun = (parseResult.NounConcept || parseResult.CanonicalNoun || '').toUpperCase();

          // Al buio alcune azioni non si eseguono (R1, BAS 240–250); il turno è consumato
          if (DARK_BLOCKED_VERBS.has(concept) && !hasFonteLuceAttiva()) {
            return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.dark.tooDark', gameState.currentLingua), effects: [] };
          }

          // ACCENDI FIAMMIFERO (R8): gestito dal motore, non come interazione (nessun punteggio)
          const fiammiferiRecord = gameState.Oggetti.find((o) => o.ID === 36);
          if (concept === 'ACCENDERE' && fiammiferiRecord &&
              normalizeForComparison(fiammiferiRecord.Oggetto) === normalizeForComparison(noun)) {
            return accendiFiammifero();
          }

          // PRIORITÀ 1: Cerca interazioni custom nel file Interazioni.json
          // Usa il VerbConcept (significato semantico) invece del CanonicalVerb (forma)
          if (noun && concept) {
            const interazioneResult = cercaEseguiInterazione(concept, noun);
            if (interazioneResult) {
              return interazioneResult;
            }
          }
          
          // PRIORITÀ 2: Gestione standard degli oggetti
          // Verifica se l'oggetto è presente nel luogo corrente o nell'inventario
          const oggetto = (gameState.Oggetti || []).find(obj => 
            normalizeForComparison(obj.Oggetto) === normalizeForComparison(noun) && 
            (obj.IDLuogo === gameState.currentLocationId || obj.IDLuogo === 0) &&
            obj.Attivo >= 1
          );
          // ESAMINA / GUARDA
          if (concept === 'ESAMINARE' || concept === 'GUARDARE' || verb === 'ESAMINA' || verb === 'GUARDA') {
            // Senza oggetto: mostra descrizione del luogo corrente con oggetti presenti
            if (!noun) {
              const messaggioCompleto = generaDescrizioneLuogoConOggetti(gameState.currentLocationId);
              if (messaggioCompleto) {
                return { accepted: true, resultType: 'OK', message: messaggioCompleto, effects: [] };
              }
              return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.examine.nothingSpecial', gameState.currentLingua), effects: [] };
            }
            // Con oggetto: mostra descrizione dell'oggetto
            if (!oggetto) return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.examine.objectNotHere', gameState.currentLingua, [noun.toLowerCase().replace(/_/g, ' ')]), effects: [] };
            const text = oggetto.descrizione || 'Non noti nulla di particolare.';
            return { accepted: true, resultType: 'OK', message: text, effects: [] };
          }
          // APRI / CHIUDI (elementi apribili)
          if (concept === 'APRIRE' || concept === 'CHIUDERE' || verb === 'APRI' || verb === 'CHIUDI') {
            if (!oggetto) return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.examine.objectNotHere', gameState.currentLingua, [noun.toLowerCase().replace(/_/g, ' ')]), effects: [] };
            const canOpen = Object.prototype.hasOwnProperty.call(gameState.openStates, noun);
            if (!canOpen) return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.openClose.cannotDo', gameState.currentLingua, [verb.toLowerCase(), noun.toLowerCase().replace(/_/g, ' ')]), effects: [] };
            const openNow = !!gameState.openStates[noun];
            const isOpenCommand = concept === 'APRIRE' || verb === 'APRI';
            if (isOpenCommand) {
              if (openNow) return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.open.alreadyOpen', gameState.currentLingua), effects: [] };
              gameState.openStates[noun] = true;
              return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.open.success', gameState.currentLingua, [noun]), effects: [] };
            } else {
              if (!openNow) return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.close.alreadyClosed', gameState.currentLingua), effects: [] };
              gameState.openStates[noun] = false;
              return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.close.success', gameState.currentLingua, [noun]), effects: [] };
            }
          }
          if (concept === 'PRENDERE' || verb === 'PRENDI') {
            // Controlla limite inventario (max 5 oggetti)
            const oggettiInInventario = (gameState.Oggetti || []).filter(obj => obj.IDLuogo === 0 && obj.Attivo >= 3);
            if (oggettiInInventario.length >= 5) {
              return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.take.inventoryFull', gameState.currentLingua), effects: [] };
            }
            // Trova l'oggetto nel luogo corrente
            const normalizeForComparison = (str) => str.toUpperCase().replace(/\s+/g, '_');
            const oggetto = (gameState.Oggetti || []).find(obj => 
              normalizeForComparison(obj.Oggetto) === normalizeForComparison(noun) && 
              obj.IDLuogo === gameState.currentLocationId && 
              obj.Attivo >= 1
            );
            if (oggetto) {
              if (oggetto.Attivo < 3) {
                // Oggetto scenico (1) o spostabile (2), non raccoglibile
                return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.take.cannotTake', gameState.currentLingua), effects: [] };
              }
              // Attivo >= 3: oggetto raccoglibile
              oggetto.IDLuogo = 0; // Sposta nell'inventario
              return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.take.success', gameState.currentLingua, [oggetto.Oggetto]), effects: [] };
            }
            return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.examine.objectNotHere', gameState.currentLingua, [noun.toLowerCase().replace(/_/g, ' ')]), effects: [] };
          }
          if (concept === 'POSARE' || concept === 'LASCIARE' || verb === 'POSA' || verb === 'LASCIA') {
            // Trova l'oggetto nell'inventario
            const normalizeForComparison = (str) => str.toUpperCase().replace(/\s+/g, '_');
            const oggetto = (gameState.Oggetti || []).find(obj => 
              normalizeForComparison(obj.Oggetto) === normalizeForComparison(noun) && 
              obj.IDLuogo === 0 && 
              obj.Attivo >= 3
            );
            if (oggetto) {
              oggetto.IDLuogo = gameState.currentLocationId; // Sposta nel luogo corrente
              return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.drop.success', gameState.currentLingua, [oggetto.Oggetto]), effects: [] };
            }
            return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.drop.notInInventory', gameState.currentLingua, [noun.toLowerCase().replace(/_/g, ' ')]), effects: [] };
          }
          // Altri verbi: verifica se richiedono oggetto
          if (!noun) {
            return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.action.whatDoYouWant', gameState.currentLingua, [verb.toLowerCase()]), effects: [] };
          }
          // PRIORITÀ: Verifica esistenza oggetto prima di dire che l'azione non è possibile
          if (!oggetto) {
            return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.examine.objectNotHere', gameState.currentLingua, [noun.toLowerCase().replace(/_/g, ' ')]), effects: [] };
          }
          // Altri verbi: risposta generica user-friendly (oggetto presente, azione non supportata)
          return {
            accepted: true,
            resultType: 'OK',
            message: getSystemMessage('engine.action.cannotDo', gameState.currentLingua, [verb.toLowerCase(), noun.toLowerCase().replace(/_/g, ' ')]),
            effects: [],
          };
        }
      default:
        return { accepted: false, resultType: 'ERROR', message: getSystemMessage('engine.error.unknownCommandType', gameState.currentLingua) };
    }
  }
  // === NEW TURN-BASED PIPELINE WRAPPER (v3.0) ===
  // This wrapper adds turn-based mechanics around the legacy command execution.
  // Pipeline phases: Snapshot → Pre-checks → Core (legacy) → Post-effects
  // Sprint 3.3.5.A: PARTIAL activation (prepareTurnContext + applyTurnEffects TORCH only)

  function executeCommand(parseResult) {
    const debugEnabled = isEngineDebugEnabled();
    const debugBefore = debugEnabled ? getDebugStateSnapshot() : null;

    // Phase 0: Validation (preserved from original)
    if (!parseResult) {
      return { accepted: false, resultType: 'ERROR', message: getSystemMessage('engine.error.noParseResult', gameState.currentLingua) };
    }
    if (parseResult.IsValid !== true) {
      const userMessage = mapParseErrorToUserMessage(parseResult, gameState.currentLingua);
      return {
        accepted: false,
        resultType: 'ERROR',
        message: userMessage || getSystemMessage('parse.error.invalidInputGeneric', gameState.currentLingua),
      };
    }

    // Phase 1: Create turn snapshot (ACTIVE - Sprint 3.3.2)
    prepareTurnContext(parseResult);

    // Phase 2: Run pre-execution checks (ACTIVE - Sprint 3.3.5.B: awaitingRestart)
    const preCheck = runPreExecutionChecks(parseResult);
    if (preCheck) {
      // Il movimento bloccato alla barriera consuma comunque un turno (R4, #107)
      if (shouldConsumeTurn(parseResult)) {
        applyTurnEffects(preCheck, parseResult);
      }
      if (debugEnabled) {
        pushEngineDebugEvent({
          kind: 'EXECUTE_COMMAND_BLOCKED',
          parse: summarizeParseResult(parseResult),
          result: {
            accepted: !!preCheck.accepted,
            resultType: preCheck.resultType ?? null,
          },
          before: debugBefore,
          after: getDebugStateSnapshot(),
        });
      }
      return preCheck;
    }

    // Phase 3: Execute core command logic (ACTIVE - unchanged legacy)
    const result = executeCommandLegacy(parseResult);

    // Phase 4: Apply turn effects (ACTIVE - Sprint 3.3.5.A: torch, 3.3.5.B: darkness)
    // Gli effetti si applicano a ogni comando che consuma un turno, accettato o no (#107)
    if (shouldConsumeTurn(parseResult)) {
      const finalResult = applyTurnEffects(result, parseResult);
      if (debugEnabled) {
        const debugAfter = getDebugStateSnapshot();
        pushEngineDebugEvent({
          kind: 'EXECUTE_COMMAND',
          parse: summarizeParseResult(parseResult),
          consumesTurn: true,
          result: {
            accepted: !!finalResult.accepted,
            resultType: finalResult.resultType ?? null,
          },
          delta: {
            score: (debugAfter.score ?? 0) - (debugBefore.score ?? 0),
            totalTurnsConsumed: (debugAfter.totalTurnsConsumed ?? 0) - (debugBefore.totalTurnsConsumed ?? 0),
            turnsInDangerZone: (debugAfter.turnsInDangerZone ?? 0) - (debugBefore.turnsInDangerZone ?? 0),
            awaitingRestart:
              (debugAfter.awaitingRestart ?? false) === (debugBefore.awaitingRestart ?? false)
                ? 0
                : 1,
          },
          before: debugBefore,
          after: debugAfter,
        });
      }
      return finalResult;
    }

    if (debugEnabled) {
      const debugAfter = getDebugStateSnapshot();
      pushEngineDebugEvent({
        kind: 'EXECUTE_COMMAND',
        parse: summarizeParseResult(parseResult),
        consumesTurn: false,
        result: {
          accepted: !!result.accepted,
          resultType: result.resultType ?? null,
        },
        delta: {
          score: (debugAfter.score ?? 0) - (debugBefore.score ?? 0),
          totalTurnsConsumed: (debugAfter.totalTurnsConsumed ?? 0) - (debugBefore.totalTurnsConsumed ?? 0),
          turnsInDangerZone: (debugAfter.turnsInDangerZone ?? 0) - (debugBefore.turnsInDangerZone ?? 0),
          awaitingRestart:
            (debugAfter.awaitingRestart ?? false) === (debugBefore.awaitingRestart ?? false)
              ? 0
              : 1,
        },
        before: debugBefore,
        after: debugAfter,
      });
    }

    return result;
  }

  return {
    enterLocation,
    executeCommandAsync,
    confirmEnd,
    confirmRestart,
    initializeOriginalData,
    getGameState,
    resetGameState,
    shouldConsumeTurn,
    hasFonteLuceAttiva,
    prepareTurnContext,
    runPreExecutionChecks,
    applyTurnEffects,
    generateHelpMessage,
    generaDescrizioneLuogoConOggetti,
    getOggetti,
    getDirezioniLuogo,
    setGameState,
    setCurrentLocation,
    getGameStateSnapshot,
    toCommandDTO,
    executeCommand,
  };
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