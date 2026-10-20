// Gestore ACTION di Odessa per i casi speciali di ESAMINA/GUARDA (TD Lotto 4a, §4,
// riga 22): blocco 1743–1769 di 4acdd1b trascritto alla lettera (R1). Il caso senza
// nome (1736) resta al gestore generico 23: questo gestore richiede sempre un nome.

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
    // 4.6 (#109, L3): esamina/guarda + nome di luogo, ovunque, come guarda da
    // solo (BAS 5520: nessun testo dedicato, ripresenta il luogo).
    if (noun === 'LUOGO') {
      const messaggioCompleto = ctx.helpers.generaDescrizioneLuogoConOggetti(gameState.currentLocationId);
      if (messaggioCompleto) {
        return { accepted: true, resultType: 'OK', message: messaggioCompleto, effects: [] };
      }
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.examine.nothingSpecial'), effects: [] };
    }
    // 4.1 (#109, L3): esamina/guarda guardia/uomo, solo alla barriera (59).
    // Altrove: nessun oggetto GUARDIA nei dati, prosegue con l'elaborazione
    // standard (§4.10 generale: "Non vedi guardia qui.").
    if (noun === 'GUARDIA' && gameState.currentLocationId === ctx.game.config.luoghi.barriera) {
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.examine.guard'), effects: [] };
    }
    // 4.4 (#109, L3, E2): oggetti scenici del gioco originale, senza controllo
    // di presenza (azione sempre valida, come nel BAS).
    const OGGETTI_SCENICI_SENZA_PRESENZA = new Set(ctx.game.config.regole.oggettiSceniciSenzaPresenza);
    if (OGGETTI_SCENICI_SENZA_PRESENZA.has(noun)) {
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.examine.nothingSpecialOriginal'), effects: [] };
    }
    // 4.5 (#109, L3): macerie ai luoghi 11, 32, 36 (al 49 resta la descrizione
    // dell'oggetto, invariata: non toccata da questo blocco).
    const macerieLocalizzataPerEsamina = gameState.currentLingua === 1 ? 'MACERIE' : 'RUBBLE';
    if (noun === macerieLocalizzataPerEsamina && ctx.game.config.luoghi.macerieEsaminabili.includes(gameState.currentLocationId)) {
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.examine.nothingSpecialOriginal'), effects: [] };
    }
    return null;
  },
};
