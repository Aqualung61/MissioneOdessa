// Conferme FINE e riavvio (SI/NO), estratte da `engine.js` (TD Lotto 5, §3.4.4).
// Leggono `eng.state` a ogni chiamata (R1): `confirmRestart` può riassegnarlo (reset).
import { getSystemMessage } from '../systemMessages.js';

// Conferma fine gioco (SI/NO) quando lo stato è in attesa di conferma.
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

// Conferma riavvio. `resetGameState(lingua)` è la funzione di reset del motore (composizione della facciata).
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
