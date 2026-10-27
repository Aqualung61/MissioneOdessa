// Gestore ACTION di Odessa: CARICA/LOAD con PESO/PESA. Le due chiamate a
// `cercaEseguiInterazione('METTERE', …)` e il ramo "già eseguita" restano nello stesso ordine.

// 8 — odessa.action.loadWeight
// === Verbi e risposte dell'originale senza interazione dedicata ===
// CARICA/LOAD con PESO/PESA (#98): stesso esito di METTERE PESO,
// usando l'interazione esistente carica_pesa_57 (stesso id, stesso punteggio una
// sola volta); senza il peso in inventario, risposta dedicata. Con altri nomi,
// "carica" resta un'azione senza effetto (nessun intervento qui).
export const loadWeight = {
  id: 'odessa.action.loadWeight',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'CARICARE' && (cmd.noun === 'PESO' || cmd.noun === 'PESA' || cmd.noun === 'WEIGHT' || cmd.noun === 'SCALE'),
  run: (cmd, ctx) => {
    const gameState = ctx.state;
    if (gameState.currentLocationId === ctx.game.config.luoghi.pesa) {
      const pesoLocalizzato = gameState.currentLingua === 1 ? 'PESO' : 'WEIGHT';
      // L'interazione già eseguita (es. prima con "metti peso") ha spostato il
      // peso dall'inventario (IDLuogo 0) al luogo 57: va riconosciuta come già
      // fatta a prescindere da dove sia ora il peso, non solo quando è ancora in
      // inventario (altrimenti "carica peso" dopo "metti peso" risponderebbe
      // erroneamente "serve un peso" invece di "non c'è bisogno di farlo di nuovo").
      if (gameState.interazioniEseguite.includes('carica_pesa_57')) {
        const risultatoCarica = ctx.helpers.cercaEseguiInterazione('METTERE', pesoLocalizzato);
        if (risultatoCarica) return risultatoCarica;
      }
      const pesoInInventario = gameState.Oggetti.some((o) =>
        ctx.helpers.normalize(o.Oggetto) === pesoLocalizzato && o.IDLuogo === 0 && o.Attivo >= 3
      );
      if (!pesoInInventario) {
        return { accepted: true, resultType: 'OK', message: ctx.msg('engine.load.scaleNeedsWeight'), effects: [] };
      }
      const risultatoCarica = ctx.helpers.cercaEseguiInterazione('METTERE', pesoLocalizzato);
      if (risultatoCarica) return risultatoCarica;
    }
    // Altrove: prosegue con l'elaborazione standard (nessun effetto, D2 generico).
    return null;
  },
};
