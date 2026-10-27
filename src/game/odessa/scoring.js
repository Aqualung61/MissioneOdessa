// Punteggio dei misteri di Odessa: `mysteryIdFor` (quale mistero risolve un effetto) e
// `awardMystery` (assegnazione dei punti).

/**
 * Identificativo del mistero risolto da un effetto, oppure `null`.
 * @param {Object} effetto - effetto dell'interazione
 * @param {{statoPreToggle?: boolean}} info - valore restituito dalla funzione del registro
 */
export function mysteryIdFor(effetto, { statoPreToggle } = {}) {
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
    // Usa lo stato PRE-toggle restituito dall'effetto
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

  return misteroId;
}

/**
 * Assegna i punti mistero se l'effetto risolve un mistero non ancora risolto.
 * Per un tipo sconosciuto o senza mistero non assegna nulla.
 */
export function awardMystery(effetto, info, ctx) {
  const misteroId = mysteryIdFor(effetto, info);

  // Assegna +3 punti se il mistero non è già stato risolto
  if (misteroId && !ctx.state.punteggio.misteriRisolti.has(misteroId)) {
    ctx.state.punteggio.totale += ctx.game.config.punteggio.mistero;
    ctx.state.punteggio.misteriRisolti.add(misteroId);
  }
}
