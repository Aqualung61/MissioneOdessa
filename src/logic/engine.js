// Sprint 1: i18n - importa helper per messaggi di sistema
import { getSystemMessage } from './systemMessages.js';

// Stub: entra in luogo terminale (da implementare secondo logica app)
export async function enterLocation(locationId) {
  // Logica: entra in luogo terminale, imposta stato di riavvio
  gameState.awaitingRestart = true;
  gameState.currentLocationId = locationId;
  return { accepted: true, resultType: 'TERMINAL', locationId };
}
// Stub: esecuzione comando asincrona (da implementare secondo logica app)
export async function executeCommandAsync(parseResult) {
  // Puoi aggiungere logica custom async qui se serve
  return executeCommand(parseResult);
}
// Stub: conferma riavvio (da implementare secondo logica app)
export function confirmRestart(risposta) {
  // Normalizza risposta
  const r = (risposta || '').toUpperCase();
  if (r === 'S' || r === 'SI' || r === 'SÌ') {
    // Riavvia: torna in location 1, non più in attesa
    gameState.awaitingRestart = false;
    gameState.currentLocationId = 1;
    return { accepted: true, resultType: 'OK' };
  }
  if (r === 'NO') {
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
    torciaDifettosa: true,           // True all'inizio, False se accendi lampada
    lampadaAccesa: false,            // Stato della lampada
    azioniInLuogoPericoloso: 0,      // Counter per Intercettazione
    ultimoLuogoPericoloso: null      // ID per reset al cambio stanza
  },
  
  // === SISTEMA VITTORIA ===
  narrativeState: null,              // Enum: ENDING_PHASE_1A, etc.
  narrativePhase: 0,                 // Progressivo numerico (opzionale)
  victory: false,                    // Flag vittoria finale
  movementBlocked: false,            // Blocca NAVIGATION (per luogo 59)
  unusefulCommandsCounter: 0,        // Counter comandi errati al luogo 59
  awaitingContinue: false,           // Se true, engine aspetta solo BARRA SPAZIO
  continueCallback: null             // Funzione da eseguire alla pressione di BARRA
};

// Copia immutabile dei dati originali (salvata all'avvio, non modificata dal caricamento)
let originalOggetti = [];

// Funzione per inizializzare i dati originali (chiamata una volta all'avvio)
export function initializeOriginalData() {
  if (global.odessaData && global.odessaData.Oggetti) {
    originalOggetti = JSON.parse(JSON.stringify(global.odessaData.Oggetti));
    console.log('Dati originali salvati: ' + originalOggetti.length + ' oggetti');
  }
}

// Funzione per ottenere riferimento allo stato di gioco (per test)
export function getGameState() {
  return gameState;
}

// Funzione per resettare lo stato di gioco
export function resetGameState(idLingua = 1) {
  console.log('Inizializzazione gameState con lingua:', idLingua);
  gameState = {
    openStates: { BOTOLA: false },
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
      torciaDifettosa: true,
      lampadaAccesa: false,
      azioniInLuogoPericoloso: 0,
      ultimoLuogoPericoloso: null
    },
    
    // === SISTEMA VITTORIA ===
    narrativeState: null,
    narrativePhase: 0,
    victory: false,
    movementBlocked: false,
    unusefulCommandsCounter: 0,
    awaitingContinue: false,
    continueCallback: null
  };
  // Aggiungi Oggetti a gameState dai dati originali
  if (originalOggetti.length > 0) {
    gameState.Oggetti = JSON.parse(JSON.stringify(originalOggetti)); // Deep copy dai dati originali
    console.log('Caricamento Oggetti in gameState: Sì, numero di record: ' + gameState.Oggetti.length);
  } else {
    console.log('Caricamento Oggetti in gameState: No');
    gameState.Oggetti = [];
  }
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
export function generateHelpMessage(idLingua = 1) {
  const termini = global.odessaData.TerminiLessico || [];
  
  // Filtra e ordina comandi di direzione
  const direzioni = termini
    .filter(t => t.ID_TipoLessico === 2)
    .map(t => capitalizeCommand(t.Concetto))
    .sort();
  
  // Filtra e ordina comandi di sistema
  const sistema = termini
    .filter(t => t.ID_TipoLessico === 3)
    .map(t => capitalizeCommand(t.Concetto))
    .sort();
  
  // Filtra e ordina verbi azione
  const verbi = termini
    .filter(t => t.ID_TipoLessico === 1)
    .map(t => capitalizeCommand(t.Concetto))
    .sort();
  
  // Filtra oggetti per lingua e ordina (solo visibili)
  const oggetti = (global.odessaData.Oggetti || [])
    .filter(o => o.IDLingua === idLingua && o.Attivo >= 1)
    .map(o => o.Oggetto)
    .sort();
  
  // Costruisci messaggio con formattazione HTML
  let msg = '<b>Comandi disponibili:</b>\n';
  msg += '<i>Direzioni: ' + direzioni.join(', ') + '</i>\n';
  msg += '<i>Sistema: ' + sistema.join(', ') + '</i>\n';
  msg += '<i>Azioni: ' + verbi.join(', ') + '</i>\n\n';
  msg += '<b>Oggetti nel gioco:</b>\n<i>' + oggetti.join(', ') + '</i>';
  
  return msg;
}

// Funzione centralizzata per generare descrizione luogo con oggetti presenti
export function generaDescrizioneLuogoConOggetti(idLuogo) {
  const luogo = global.odessaData.Luoghi.find(l => l.ID === idLuogo && l.IDLingua === gameState.currentLingua);
  if (!luogo) return '';
  
  let messaggio = `<span style="color: black;">${luogo.Descrizione}</span>\n`;
  
  // Aggiungi lista oggetti presenti (esclusi contenuti: Attivo=2)
  const oggettiPresenti = gameState.Oggetti.filter(o => 
    o.IDLuogo === idLuogo && (o.Attivo === 1 || o.Attivo >= 3)
  );
  
  if (oggettiPresenti.length > 0) {
    messaggio += '\n<b><i>Oggetti presenti:</i></b>\n';
    oggettiPresenti.forEach(obj => {
      messaggio += `<i>  - ${obj.Oggetto}</i>\n`;
    });
  }
  
  return messaggio;
}

// Funzione per ottenere gli oggetti correnti
export function getOggetti() {
  return gameState.Oggetti || [];
}

// Funzione per ottenere le direzioni disponibili per un luogo
export function getDirezioniLuogo(idLuogo) {
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
export function setGameState(newState) {
  gameState = { 
    ...newState, 
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
    }
  };
}
// Funzione per impostare il luogo corrente
export function setCurrentLocation(locationId) {
  gameState.currentLocationId = locationId;
  
  // Sincronizzazione visitedPlaces e assegnazione punteggio
  if (!gameState.visitedPlaces.has(locationId)) {
    gameState.visitedPlaces.add(locationId);
    gameState.punteggio.totale += 1;
  }
}

export function getGameStateSnapshot() {
  const currentLocation = global.odessaData.Luoghi.find(l => l.ID === gameState.currentLocationId && l.IDLingua === gameState.currentLingua);
  const snapshot = {
    openStates: { ...gameState.openStates },
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
    unusefulCommandsCounter: gameState.unusefulCommandsCounter,
    awaitingContinue: gameState.awaitingContinue,
    // Metadata per chiarezza
    currentLocationName: currentLocation ? currentLocation.Nome : 'Sconosciuto',
    timestamp: new Date().toISOString(),
    version: '1.4.0',
  };
  return snapshot;
}

export function toCommandDTO(parseResult) {
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

// Funzione per verificare i prerequisiti di un'interazione
function verificaPrerequisiti(prerequisiti) {
  if (!prerequisiti || prerequisiti.length === 0) return true;
  
  for (const req of prerequisiti) {
    if (req.tipo === 'OGGETTO_IN_INVENTARIO') {
      const oggetto = gameState.Oggetti.find(o => 
        normalizeForComparison(o.Oggetto) === normalizeForComparison(req.target) && 
        o.IDLuogo === 0 && 
        o.Attivo >= 3
      );
      if (!oggetto) return false;
    } else if (req.tipo === 'OGGETTO_IN_LUOGO') {
      const oggetto = gameState.Oggetti.find(o => 
        normalizeForComparison(o.Oggetto) === normalizeForComparison(req.target) && 
        o.IDLuogo === req.luogo && 
        o.Attivo >= 1
      );
      if (!oggetto) return false;
    } else if (req.tipo === 'OGGETTO_VISIBILE') {
      const oggetto = gameState.Oggetti.find(o => 
        normalizeForComparison(o.Oggetto) === normalizeForComparison(req.target) && 
        o.IDLuogo === req.luogo && 
        o.Attivo >= 1
      );
      if (!oggetto) return false;
    } else if (req.tipo === 'SEQUENZA_COMPLETATA') {
      const seq = gameState.sequenze[req.target];
      if (!seq || !seq.completata) return false;
    } else if (req.tipo === 'INTERAZIONE_ESEGUITA') {
      if (!gameState.interazioniEseguite.includes(req.target)) return false;
    }
  }
  return true;
}

// === SISTEMA PUNTEGGIO MISTERI ===
// Assegna +3 punti quando un mistero viene risolto automaticamente tramite effetti
function assegnaPunteggioMistero(effetto) {
  let misteroId = null;
  
  // Task 4a: VISIBILITA - oggetto diventa visibile
  if (effetto.tipo === 'VISIBILITA') {
    misteroId = `visibilita_${effetto.target}`;
  }
  
  // Task 4b: SBLOCCA_DIREZIONE - direzione sbloccata permanentemente
  else if (effetto.tipo === 'SBLOCCA_DIREZIONE') {
    misteroId = `direzione_${effetto.luogo}_${effetto.direzione}`;
  }
  
  // Task 4c: TOGGLE_DIREZIONE - solo prima apertura (0 → valore)
  else if (effetto.tipo === 'TOGGLE_DIREZIONE') {
    const key = `${effetto.luogo}_${effetto.direzione}`;
    const statoCorrente = gameState.direzioniToggle[key] || false;
    
    // Assegna punti solo se sta APRENDO (false → true)
    // Chiusure (true → false) e riaperture successive: NO +3
    if (!statoCorrente) {
      misteroId = `direzione_${effetto.luogo}_${effetto.direzione}`;
    }
  }
  
  // Assegna +3 punti se il mistero non è già stato risolto
  if (misteroId && !gameState.punteggio.misteriRisolti.has(misteroId)) {
    gameState.punteggio.totale += 3;
    gameState.punteggio.misteriRisolti.add(misteroId);
  }
}

// Funzione per applicare gli effetti di un'interazione
function applicaEffetti(effetti, luogoCorrente) {
  for (const effetto of effetti) {
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
      gameState.direzioniToggle[key] = !gameState.direzioniToggle[key];
    } else if (effetto.tipo === 'VITTORIA') {
      gameState.ended = true;
    } else if (effetto.tipo === 'SEQUENZA') {
      // Gestione sequenze (es. combinazione cassaforte)
      // Questo effetto viene gestito direttamente in cercaEseguiInterazione
      // perché richiede accesso alla risposta e controllo flusso
    }
    
    // === SISTEMA PUNTEGGIO MISTERI ===
    // Assegna +3 punti se questo effetto risolve un mistero
    assegnaPunteggioMistero(effetto);
  }
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
      if (!verificaPrerequisiti(interazione.condizioni.prerequisiti)) {
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
      
      // Applica effetti (passa il luogo corrente per risolvere ambiguità oggetti con stesso nome)
      applicaEffetti(interazione.effetti, interazione.condizioni.luogo);
      
      // Segna come eseguita
      if (!interazione.ripetibile) {
        gameState.interazioniEseguite.push(interazione.id);
      }
      
      // === SISTEMA PUNTEGGIO: Assegna +2 punti alla prima esecuzione ===
      if (!gameState.punteggio.interazioniPunteggio.has(interazione.id)) {
        gameState.punteggio.totale += 2;
        gameState.punteggio.interazioniPunteggio.add(interazione.id);
      }
      
      // Se ci sono effetti VISIBILITA, aggiungi descrizione luogo e oggetti
      const haVisibilitaEffects = interazione.effetti.some(e => e.tipo === 'VISIBILITA');
      if (haVisibilitaEffects) {
        // Usa funzione centralizzata per descrizione luogo e oggetti
        const descrizioneCompleta = generaDescrizioneLuogoConOggetti(gameState.currentLocationId);
        const messaggioCompleto = risposta + '\n\n' + descrizioneCompleta;
        
        return { accepted: true, resultType: 'OK', message: messaggioCompleto, effects: interazione.effetti };
      }
      
      return { accepted: true, resultType: 'OK', message: risposta, effects: interazione.effetti };
    }
  }
  
  return null;
}

export function executeCommand(parseResult) {
  if (!parseResult) {
    return { accepted: false, resultType: 'ERROR', message: getSystemMessage('engine.error.noParseResult', gameState.currentLingua) };
  }
  if (parseResult.IsValid !== true) {
    return {
      accepted: false,
      resultType: 'ERROR',
      message: `Parse non valido: ${parseResult.Error || 'UNKNOWN'}`,
    };
  }
  // Esecuzione minimale con stato per alcuni comandi
  switch (parseResult.CommandType) {
    case 'NAVIGATION':
      return {
        accepted: true,
        resultType: 'OK',
        message: `Stub: spostamento verso ${parseResult.CanonicalVerb}`,
        effects: [],
      };
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
            const message = generateHelpMessage(1); // Default lingua 1
            return { accepted: true, resultType: 'OK', message, effects: [], showLocation: true };
          }
          case 'SALVARE': {
            return { accepted: true, resultType: 'SAVE_GAME', message: getSystemMessage('engine.save.inProgress', gameState.currentLingua), effects: [] };
          }
          case 'CARICARE':
            return { accepted: true, resultType: 'LOAD_GAME', message: getSystemMessage('engine.load.inProgress', gameState.currentLingua), effects: [] };
          case 'PUNTI':
            return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.score.display', gameState.currentLingua, ['0 (stub)']), effects: [], showLocation: true };
          case 'FINE':
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
        if (verb === 'APRI' || verb === 'CHIUDI') {
          if (!oggetto) return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.examine.objectNotHere', gameState.currentLingua, [noun.toLowerCase().replace(/_/g, ' ')]), effects: [] };
          const canOpen = Object.prototype.hasOwnProperty.call(gameState.openStates, noun);
          if (!canOpen) return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.openClose.cannotDo', gameState.currentLingua, [verb.toLowerCase(), noun.toLowerCase().replace(/_/g, ' ')]), effects: [] };
          const openNow = !!gameState.openStates[noun];
          if (verb === 'APRI') {
            if (openNow) return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.open.alreadyOpen', gameState.currentLingua), effects: [] };
            gameState.openStates[noun] = true;
            return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.open.success', gameState.currentLingua, [noun]), effects: [] };
          } else {
            if (!openNow) return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.close.alreadyClosed', gameState.currentLingua), effects: [] };
            gameState.openStates[noun] = false;
            return { accepted: true, resultType: 'OK', message: getSystemMessage('engine.close.success', gameState.currentLingua, [noun]), effects: [] };
          }
        }
        if (verb === 'PRENDI') {
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
        if (verb === 'POSA' || verb === 'LASCIA') {
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
