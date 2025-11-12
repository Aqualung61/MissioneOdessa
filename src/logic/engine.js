// Stub: entra in luogo terminale (da implementare secondo logica app)
export async function enterLocation(dbPath, locationId) {
  // Logica: entra in luogo terminale, imposta stato di riavvio
  gameState.awaitingRestart = true;
  gameState.currentLocationId = locationId;
  console.log('[DEBUG enterLocation] gameState:', JSON.stringify(gameState));
  return { accepted: true, resultType: 'TERMINAL', locationId };
}
// Stub: esecuzione comando asincrona (da implementare secondo logica app)
export async function executeCommandAsync(parseResult) {
  // Puoi aggiungere logica custom async qui se serve
  return executeCommand(parseResult);
}
// Stub: conferma riavvio (da implementare secondo logica app)
export function confirmRestart(dbPath, risposta) {
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

// Stato di gioco minimale (singleton in memoria)
const DEFAULT_STATE = Object.freeze({
  roomItems: ['LAMPADA', 'BADILE', 'BOTOLA'],
  inventory: [],
  openStates: { BOTOLA: false, CASSAFORTE: false, SCOMPARTO: false },
});

let gameState = {
  roomItems: [...DEFAULT_STATE.roomItems],
  inventory: [...DEFAULT_STATE.inventory],
  openStates: { ...DEFAULT_STATE.openStates },
  awaitingRestart: false,
  currentLocationId: 1,
  ended: false
};
// Funzione per resettare lo stato di gioco
export function resetGameState() {
  gameState = {
    roomItems: [...DEFAULT_STATE.roomItems],
    inventory: [...DEFAULT_STATE.inventory],
    openStates: { ...DEFAULT_STATE.openStates },
    awaitingRestart: false,
    currentLocationId: 1,
    ended: false
  };
}
  gameState = {
    roomItems: [...DEFAULT_STATE.roomItems],
    inventory: [...DEFAULT_STATE.inventory],
    openStates: { ...DEFAULT_STATE.openStates },
    awaitingRestart: false,
    currentLocationId: 1,
    ended: false
  };
// ...nessuna graffa qui
export function getGameStateSnapshot() {
  const snapshot = {
    roomItems: [...gameState.roomItems],
    inventory: [...gameState.inventory],
    openStates: { ...gameState.openStates },
    awaitingRestart: gameState.awaitingRestart,
    currentLocationId: gameState.currentLocationId,
    ended: gameState.ended,
  };
  console.log('[DEBUG getGameStateSnapshot] snapshot:', JSON.stringify(snapshot));
  return snapshot;
}

function removeFirstMatch(arr, name, index /* optional 1-based */) {
  const positions = [];
  for (let i = 0; i < arr.length; i++) if (arr[i] === name) positions.push(i);
  if (positions.length === 0) return -1;
  const pos = index != null ? positions[(index - 1) | 0] : positions[0];
  if (pos == null) return -1;
  arr.splice(pos, 1);
  return pos;
}

function addItem(arr, name) {
  arr.push(name);
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
          case 'INVENTARIO':
            if (gameState.inventory.length === 0) {
              return { accepted: true, resultType: 'OK', message: 'Non hai nulla.', effects: [] };
            }
            return {
              accepted: true,
              resultType: 'OK',
              message: 'Hai con te: ' + gameState.inventory.join(', ') + '.',
              effects: [],
            };
          case 'SALVA':
            return { accepted: true, resultType: 'OK', message: 'Salvataggio (stub).', effects: [] };
          case 'CARICA':
            return { accepted: true, resultType: 'OK', message: 'Caricamento (stub).', effects: [] };
          case 'PUNTI':
            return { accepted: true, resultType: 'OK', message: 'Punteggio: 0 (stub).', effects: [] };
          case 'FINE':
            return { accepted: true, resultType: 'OK', message: 'Fine gioco (stub).', effects: [] };
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
        const noun = (parseResult.CanonicalNoun || '').toUpperCase();
        const idx = parseResult.NounIndex != null ? Number(parseResult.NounIndex) : null;
        if (!noun) {
          return { accepted: true, resultType: 'OK', message: `Cosa vuoi ${verb.toLowerCase()}?`, effects: [] };
        }
        const isPresentHere = gameState.roomItems.includes(noun) || gameState.inventory.includes(noun);
        // ESAMINA / OSSERVA / GUARDA (concetti affini)
        if (concept === 'ESAMINARE' || concept === 'OSSERVARE' || verb === 'ESAMINA' || verb === 'OSSERVA' || verb === 'GUARDA') {
          if (!isPresentHere) return { accepted: true, resultType: 'OK', message: `Non vedi ${noun} qui.`, effects: [] };
          const descriptions = { LAMPADA: 'Una normale lampada.', BADILE: 'Un badile robusto.', BOTOLA: 'Una botola nel pavimento.' };
          const text = descriptions[noun] || 'Non noti nulla di particolare.';
          return { accepted: true, resultType: 'OK', message: text, effects: [] };
        }
        // APRI / CHIUDI (elementi apribili)
        if (verb === 'APRI' || verb === 'CHIUDI') {
          if (!isPresentHere) return { accepted: true, resultType: 'OK', message: `Non vedi ${noun} qui.`, effects: [] };
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
          const pos = removeFirstMatch(gameState.roomItems, noun, idx);
          if (pos >= 0) {
            addItem(gameState.inventory, noun);
            return { accepted: true, resultType: 'OK', message: `Hai preso la ${noun}.`, effects: [] };
          }
          return { accepted: true, resultType: 'OK', message: `Non c'è ${noun} qui.`, effects: [] };
        }
        if (verb === 'POSA' || verb === 'LASCIA') {
          const pos = removeFirstMatch(gameState.inventory, noun, idx);
          if (pos >= 0) {
            addItem(gameState.roomItems, noun);
            return { accepted: true, resultType: 'OK', message: `Hai posato la ${noun}.`, effects: [] };
          }
          return { accepted: true, resultType: 'OK', message: `Non hai ${noun} con te.`, effects: [] };
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
