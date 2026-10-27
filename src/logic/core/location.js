// Luoghi: descrizione, direzioni e luogo corrente.
// Ogni funzione riceve il contenitore `eng` e legge `eng.state` al momento della chiamata.
import { getGameData } from './gameData.js';
import { isEngineDebugEnabled, pushEngineDebugEvent } from '../engineDebug.js';
import { getSystemMessage } from '../systemMessages.js';
import { debugStateSnapshot } from './state.js';

/**
 * Descrizione (HTML) del luogo con l'elenco degli oggetti presenti, nella lingua corrente.
 * @param {Object} eng - contenitore del motore ({ game, state, originalOggetti })
 * @param {number} idLuogo - ID del luogo
 * @returns {string} testo, vuoto se il luogo non esiste nella lingua corrente
 */
export function generaDescrizioneLuogoConOggetti(eng, idLuogo) {
  const gameState = eng.state;
  const luogo = getGameData().Luoghi.find(l => l.ID === idLuogo && l.IDLingua === gameState.currentLingua);
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

/**
 * Effetto di un toggle di direzione: cerca, tra le interazioni della lingua, quella con
 * un effetto TOGGLE_DIREZIONE per il luogo e la direzione indicati.
 * @param {Object} data - dati statici di gioco (`getGameData()`)
 * @param {number} lingua
 * @param {number} idLuogo
 * @param {string} direzione
 * @returns {Object|null} l'effetto TOGGLE_DIREZIONE trovato, o `null` se l'interazione non esiste
 *   (il chiamante assegna `effetto.destinazione`, anche se assente)
 */
export function toggleDestination(data, lingua, idLuogo, direzione) {
  const isToggle = (e) => e.tipo === 'TOGGLE_DIREZIONE' && e.luogo === idLuogo && e.direzione === direzione;
  const interazione = (data.Interazioni || [])
    .filter(i => i.IDLingua === lingua)
    .find(i => i.effetti && i.effetti.some(isToggle));
  if (!interazione) return null;
  return interazione.effetti.find(isToggle);
}

// Applica sblocchi permanenti
function applyUnlockedDirections(direzioni, gameState, idLuogo) {
  if (!gameState.direzioniSbloccate) return;
  for (const [key, value] of Object.entries(gameState.direzioniSbloccate)) {
    const [luogoStr, direzione] = key.split('_');
    if (parseInt(luogoStr) === idLuogo) {
      direzioni[direzione] = value;
    }
  }
}

// Applica toggle
function applyToggledDirections(direzioni, gameState, idLuogo) {
  if (!gameState.direzioniToggle) return;
  for (const [key, isOpen] of Object.entries(gameState.direzioniToggle)) {
    const [luogoStr, direzione] = key.split('_');
    if (parseInt(luogoStr) !== idLuogo) continue;
    // Se il toggle è attivo, usa la destinazione, altrimenti blocca
    if (!isOpen) {
      direzioni[direzione] = 0;
      continue;
    }
    // Trova la destinazione originale (se l'interazione non esiste la direzione resta quella del luogo)
    const effetto = toggleDestination(getGameData(), gameState.currentLingua, idLuogo, direzione);
    if (effetto) direzioni[direzione] = effetto.destinazione;
  }
}

/**
 * Direzioni di un luogo (`Nord`, `Est`, `Sud`, `Ovest`, `Su`, `Giu`) con sblocchi e toggle applicati.
 * @param {Object} eng - contenitore del motore
 * @param {number} idLuogo - ID del luogo
 * @returns {Object} direzione → valore dei dati del luogo; oggetto vuoto se il luogo non esiste nella lingua corrente
 */
export function getDirezioniLuogo(eng, idLuogo) {
  const gameState = eng.state;
  const luogo = getGameData().Luoghi.find(l => l.ID === idLuogo && l.IDLingua === gameState.currentLingua);
  if (!luogo) return {};

  const direzioni = {
    Nord: luogo.Nord,
    Est: luogo.Est,
    Sud: luogo.Sud,
    Ovest: luogo.Ovest,
    Su: luogo.Su,
    Giu: luogo.Giu
  };

  applyUnlockedDirections(direzioni, gameState, idLuogo);
  applyToggledDirections(direzioni, gameState, idLuogo);

  return direzioni;
}

// Evento di debug SET_CURRENT_LOCATION: `isTerminal` compare solo nella prima visita (wasNewVisit).
function pushLocationEvent(eng, before, wasNewVisit, isTerminal) {
  const after = debugStateSnapshot(eng.state);
  pushEngineDebugEvent({
    kind: 'SET_CURRENT_LOCATION',
    fromLocationId: before.currentLocationId,
    toLocationId: after.currentLocationId,
    wasNewVisit,
    ...(wasNewVisit ? { isTerminal } : {}),
    delta: {
      score: (after.score ?? 0) - (before.score ?? 0),
    },
    before,
    after,
  });
}

/**
 * Imposta il luogo corrente. Alla prima visita lo registra in `visitedPlaces` e assegna il punto-luogo
 * (non per i luoghi terminali).
 * @param {Object} eng - contenitore del motore
 * @param {number} locationId - ID del luogo
 * @returns {void}
 */
export function setCurrentLocation(eng, locationId) {
  const gameState = eng.state;
  const before = isEngineDebugEnabled() ? debugStateSnapshot(gameState) : null;

  gameState.currentLocationId = locationId;

  // Sincronizzazione visitedPlaces
  if (!gameState.visitedPlaces.has(locationId)) {
    gameState.visitedPlaces.add(locationId);

    // Assegna +1 punto SOLO se NON è luogo terminale
    const luogo = getGameData()?.Luoghi?.find(l => l.ID === locationId && l.IDLingua === gameState.currentLingua);
    const isTerminal = luogo ? luogo.Terminale === -1 : null;
    if (luogo && !isTerminal) {
      gameState.punteggio.totale += eng.game.config.punteggio.luogo;
    }

    if (before) pushLocationEvent(eng, before, true, isTerminal);
    return;
  }

  if (before) pushLocationEvent(eng, before, false);
}
