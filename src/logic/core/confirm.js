// Conferme FINE e riavvio (SI/NO).
// Leggono `eng.state` a ogni chiamata: `confirmRestart` può riassegnarlo (reset).
import { getSystemMessage } from '../systemMessages.js';

/**
 * Conferma o annulla la fine della partita (risposta SI/NO) quando lo stato è in attesa di conferma.
 * @param {Object} eng - contenitore del motore
 * @param {string} risposta - testo digitato (S, SI, SÌ, Y, YES / N, NO)
 * @returns {Object} risultato con `accepted`, `resultType` e, se presente, `message`
 */
export function confirmEnd(eng, risposta) {
  const r = (risposta || '').trim().toUpperCase();

  const isYes = r === 'S' || r === 'SI' || r === 'SÌ' || r === 'Y' || r === 'YES';
  const isNo = r === 'N' || r === 'NO';

  if (isYes) {
    eng.state.awaitingEndConfirm = false;
    eng.state.awaitingRestart = true;
    return {
      accepted: false,
      resultType: 'GAME_OVER',
      message: getSystemMessage('engine.end.ended', eng.state.currentLingua),
      gameOver: true,
    };
  }

  if (isNo) {
    eng.state.awaitingEndConfirm = false;
    return {
      accepted: true,
      resultType: 'OK',
      message: getSystemMessage('engine.end.continued', eng.state.currentLingua),
    };
  }

  // Risposta non riconosciuta: rimane in attesa
  return { accepted: false, resultType: 'ERROR' };
}

/**
 * Conferma o rifiuta il riavvio (risposta SI/NO). Con SI chiama `resetGameState` nella lingua corrente.
 * @param {Object} eng - contenitore del motore
 * @param {string} risposta - testo digitato (S, SI, SÌ, Y, YES / N, NO)
 * @param {function(number): void} resetGameState - funzione di reset del motore
 * @returns {Object} risultato con `accepted` e `resultType`
 */
export function confirmRestart(eng, risposta, resetGameState) {
  // Normalizza risposta
  const r = (risposta || '').trim().toUpperCase();
  if (r === 'S' || r === 'SI' || r === 'SÌ' || r === 'Y' || r === 'YES') {
    // Riavvia: reset completo stato (source of truth), mantenendo lingua corrente
    // Nota: `resetGameState` ricrea visitedPlaces/punteggio/turn/timers ecc.
    const lingua = typeof eng.state?.currentLingua === 'number' ? eng.state.currentLingua : 1;
    resetGameState(lingua);
    return { accepted: true, resultType: 'OK' };
  }
  if (r === 'N' || r === 'NO') {
    // Termina partita
    eng.state.awaitingRestart = false;
    eng.state.ended = true;
    return { accepted: true, resultType: 'ENDED' };
  }
  // Risposta non riconosciuta: rimane in attesa
  return { accepted: false, resultType: 'ERROR' };
}
