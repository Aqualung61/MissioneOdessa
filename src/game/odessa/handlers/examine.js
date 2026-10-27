// Gestore ACTION di Odessa per i casi speciali di ESAMINA/GUARDA. Il caso senza
// nome resta al gestore generico: questo gestore richiede sempre un nome.

function isExamine(cmd) {
  return cmd.concept === 'ESAMINARE' || cmd.concept === 'GUARDARE' || cmd.verb === 'ESAMINA' || cmd.verb === 'GUARDA';
}

// 22 — odessa.action.examineSpecial
export const examineSpecial = {
  id: 'odessa.action.examineSpecial',
  types: ['ACTION'],
  match: (cmd) => isExamine(cmd) && !!cmd.noun,
  run: (cmd, ctx) => {
    const gameState = ctx.state;
    const noun = cmd.noun;
    // Esamina/guarda + nome di luogo, ovunque, come guarda da
    // solo (BAS 5520: nessun testo dedicato, ripresenta il luogo).
    if (noun === 'LUOGO') {
      const messaggioCompleto = ctx.helpers.generaDescrizioneLuogoConOggetti(gameState.currentLocationId);
      if (messaggioCompleto) {
        return { accepted: true, resultType: 'OK', message: messaggioCompleto, effects: [] };
      }
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.examine.nothingSpecial'), effects: [] };
    }
    // Esamina/guarda guardia/uomo, solo alla barriera.
    // Altrove: nessun oggetto GUARDIA nei dati, prosegue con l'elaborazione
    // standard (§4.10 generale: "Non vedi guardia qui.").
    if (noun === 'GUARDIA' && gameState.currentLocationId === ctx.game.config.luoghi.barriera) {
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.examine.guard'), effects: [] };
    }
    // Oggetti scenici del gioco originale, senza controllo
    // di presenza (azione sempre valida, come nel BAS).
    const OGGETTI_SCENICI_SENZA_PRESENZA = new Set(ctx.game.config.regole.oggettiSceniciSenzaPresenza);
    if (OGGETTI_SCENICI_SENZA_PRESENZA.has(noun)) {
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.examine.nothingSpecialOriginal'), effects: [] };
    }
    // Macerie ai luoghi 11, 32, 36 (al 49 resta la descrizione
    // dell'oggetto, invariata: non toccata da questo blocco).
    const macerieLocalizzataPerEsamina = gameState.currentLingua === 1 ? 'MACERIE' : 'RUBBLE';
    if (noun === macerieLocalizzataPerEsamina && ctx.game.config.luoghi.macerieEsaminabili.includes(gameState.currentLocationId)) {
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.examine.nothingSpecialOriginal'), effects: [] };
    }
    return null;
  },
};
