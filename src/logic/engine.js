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
  openStates: { BOTOLA: false, CASSAFORTE: false, SCOMPARTO: false },
  awaitingRestart: false,
  currentLocationId: 1,
  ended: false,
  visitedPlaces: new Set([1]),
  Oggetti: [],
  interazioniEseguite: [], // ID delle interazioni già eseguite (non ripetibili)
  direzioniToggle: {} // Stato dei toggle (es. "44_Est": true/false)
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

// Funzione per resettare lo stato di gioco
export function resetGameState() {
  console.log('Inizializzazione gameState');
  gameState = {
    openStates: { BOTOLA: false, CASSAFORTE: false, SCOMPARTO: false },
    awaitingRestart: false,
    currentLocationId: 1,
    ended: false,
    visitedPlaces: new Set([1]),
    Oggetti: [],
    interazioniEseguite: [],
    direzioniToggle: {}
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

// Funzione per ottenere gli oggetti correnti
export function getOggetti() {
  return gameState.Oggetti || [];
}

// Funzione per ottenere le direzioni disponibili per un luogo
export function getDirezioniLuogo(idLuogo) {
  const luogo = global.odessaData.Luoghi.find(l => l.ID === idLuogo);
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
          const interazione = (global.odessaData.Interazioni || []).find(i => 
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
    Oggetti: newState.Oggetti ? JSON.parse(JSON.stringify(newState.Oggetti)) : []
  };
}
// Funzione per impostare il luogo corrente
export function setCurrentLocation(locationId) {
  gameState.currentLocationId = locationId;
}

export function getGameStateSnapshot() {
  const currentLocation = global.odessaData.Luoghi.find(l => l.ID === gameState.currentLocationId);
  const snapshot = {
    openStates: { ...gameState.openStates },
    awaitingRestart: gameState.awaitingRestart,
    currentLocationId: gameState.currentLocationId,
    ended: gameState.ended,
    visitedPlaces: Array.from(gameState.visitedPlaces || []),
    Oggetti: JSON.parse(JSON.stringify(gameState.Oggetti || [])),
    // Metadata per chiarezza
    currentLocationName: currentLocation ? currentLocation.Nome : 'Sconosciuto',
    timestamp: new Date().toISOString(),
    version: '1.3.0',
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
    }
  }
  return true;
}

// Funzione per applicare gli effetti di un'interazione
function applicaEffetti(effetti) {
  for (const effetto of effetti) {
    if (effetto.tipo === 'VISIBILITA') {
      const oggetto = gameState.Oggetti.find(o => 
        normalizeForComparison(o.Oggetto) === normalizeForComparison(effetto.target)
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
    }
  }
}

// Funzione per cercare e eseguire un'interazione
function cercaEseguiInterazione(verb, noun) {
  const interazioni = global.odessaData.Interazioni || [];
  
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
        return null; // Già eseguita, non fare nulla
      }
      
      // Verifica prerequisiti
      if (!verificaPrerequisiti(interazione.condizioni.prerequisiti)) {
        continue;
      }
      
      // Interazione trovata e valida
      // Determina la risposta (per toggle)
      let risposta = interazione.risposta;
      if (interazione.trigger.verbo === 'PREMI' || interazione.trigger.verbo === 'RUOTA') {
        // Verifica stato toggle
        const primoEffetto = interazione.effetti.find(e => e.tipo === 'TOGGLE_DIREZIONE');
        if (primoEffetto) {
          const key = `${primoEffetto.luogo}_${primoEffetto.direzione}`;
          const statoCorrente = gameState.direzioniToggle[key] || false;
          risposta = statoCorrente ? interazione.risposta_chiudi : interazione.risposta_apri;
        }
      }
      
      // Applica effetti
      applicaEffetti(interazione.effetti);
      
      // Segna come eseguita
      if (!interazione.ripetibile) {
        gameState.interazioniEseguite.push(interazione.id);
      }
      
      return { accepted: true, resultType: 'OK', message: risposta, effects: interazione.effetti };
    }
  }
  
  return null;
}

export function executeCommand(parseResult) {
  if (!parseResult) {
    return { accepted: false, resultType: 'ERROR', message: 'Nessun risultato di parsing' };
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
            const inventoryItems = (gameState.Oggetti || []).filter(item => item.Attivo >= 3 && item.IDLuogo === 0 && item.IDLingua === 1);
            if (inventoryItems.length === 0) {
              return { accepted: true, resultType: 'OK', message: 'Non hai nulla.', effects: [], showLocation: true };
            }
            const itemNames = inventoryItems.map(item => item.Oggetto).join(', ');
            return {
              accepted: true,
              resultType: 'OK',
              message: 'Hai con te: ' + itemNames + '.',
              effects: [],
              showLocation: true
            };
          }
          case 'AIUTO': {
            const message = generateHelpMessage(1); // Default lingua 1
            return { accepted: true, resultType: 'OK', message, effects: [], showLocation: true };
          }
          case 'SALVARE': {
            return { accepted: true, resultType: 'SAVE_GAME', message: 'Salvataggio in corso...', effects: [] };
          }
          case 'CARICARE':
            return { accepted: true, resultType: 'LOAD_GAME', message: 'Caricamento in corso...', effects: [] };
          case 'PUNTI':
            return { accepted: true, resultType: 'OK', message: 'Punteggio: 0 (stub).', effects: [], showLocation: true };
          case 'FINE':
            return { accepted: true, resultType: 'CONFIRM_END', message: 'Vuoi davvero finire il gioco? (s/n)', effects: [] };
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
        if (noun) {
          const interazioneResult = cercaEseguiInterazione(verb, noun);
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
          // Senza oggetto: mostra descrizione del luogo corrente
          if (!noun) {
            const currentLocation = global.odessaData.Luoghi.find(l => l.ID === gameState.currentLocationId);
            if (currentLocation) {
              return { accepted: true, resultType: 'OK', message: currentLocation.Descrizione, effects: [], showLocation: true };
            }
            return { accepted: true, resultType: 'OK', message: 'Non vedi nulla di particolare.', effects: [], showLocation: true };
          }
          // Con oggetto: mostra descrizione dell'oggetto
          if (!oggetto) return { accepted: true, resultType: 'OK', message: `Non vedi ${noun} qui.`, effects: [] };
          const text = oggetto.descrizione || 'Non noti nulla di particolare.';
          return { accepted: true, resultType: 'OK', message: text, effects: [] };
        }
        // APRI / CHIUDI (elementi apribili)
        if (verb === 'APRI' || verb === 'CHIUDI') {
          if (!oggetto) return { accepted: true, resultType: 'OK', message: `Non vedi ${noun} qui.`, effects: [] };
          const canOpen = Object.prototype.hasOwnProperty.call(gameState.openStates, noun);
          if (!canOpen) return { accepted: true, resultType: 'OK', message: `Non puoi ${verb.toLowerCase()} ${noun}.`, effects: [] };
          const openNow = !!gameState.openStates[noun];
          if (verb === 'APRI') {
            if (openNow) return { accepted: true, resultType: 'OK', message: `È già aperto.`, effects: [] };
            gameState.openStates[noun] = true;
            return { accepted: true, resultType: 'OK', message: `Hai aperto la ${noun}.`, effects: [] };
          } else {
            if (!openNow) return { accepted: true, resultType: 'OK', message: `È già chiuso.`, effects: [] };
            gameState.openStates[noun] = false;
            return { accepted: true, resultType: 'OK', message: `Hai chiuso la ${noun}.`, effects: [] };
          }
        }
        if (verb === 'PRENDI') {
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
              return { accepted: true, resultType: 'OK', message: 'Questo oggetto non può essere preso.', effects: [] };
            }
            // Attivo >= 3: oggetto raccoglibile
            oggetto.IDLuogo = 0; // Sposta nell'inventario
            return { accepted: true, resultType: 'OK', message: `Hai preso ${oggetto.Oggetto}.`, effects: [] };
          }
          return { accepted: true, resultType: 'OK', message: `Non c'è ${noun} qui.`, effects: [] };
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
            return { accepted: true, resultType: 'OK', message: `Hai posato ${oggetto.Oggetto}.`, effects: [] };
          }
          return { accepted: true, resultType: 'OK', message: `Non hai ${noun} con te.`, effects: [] };
        }
        // Altri verbi: verifica se richiedono oggetto
        if (!noun) {
          return { accepted: true, resultType: 'OK', message: `Cosa vuoi ${verb.toLowerCase()}?`, effects: [] };
        }
        // Altri verbi: risposta generica
        return {
          accepted: true,
          resultType: 'OK',
          message: `Stub: azione ${verb}` + (noun ? ` su ${noun}` : ''),
          effects: [],
        };
      }
    default:
      return { accepted: false, resultType: 'ERROR', message: 'Tipo comando sconosciuto' };
  }
}
