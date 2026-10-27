// Gestori ACTION di Odessa per la luce. `fiammiferiRecord` si ricalcola dove serve,
// perché l'oggetto può cambiare tra una chiamata e l'altra.

function findFiammiferi(ctx) {
  return ctx.state.Oggetti.find((o) => o.ID === ctx.game.config.oggetti.fiammiferi);
}

// 7 — odessa.action.lightMatches (righe 1556–1561)
// ACCENDI FIAMMIFERO (R8): gestito dal motore, non come interazione (nessun punteggio)
export const lightMatches = {
  id: 'odessa.action.lightMatches',
  types: ['ACTION'],
  match: (cmd, ctx) => {
    const fiammiferiRecord = findFiammiferi(ctx);
    return cmd.concept === 'ACCENDERE' && fiammiferiRecord &&
      ctx.helpers.normalize(fiammiferiRecord.Oggetto) === ctx.helpers.normalize(cmd.noun);
  },
  run: (cmd, ctx) => ctx.helpers.accendiFiammifero(),
};

// 15 — odessa.action.lightGeneric (righe 1631–1650)
// ACCENDI senza nome, o ACCENDI LUCE: prima fonte applicabile (torcia, poi
// fiammifero, poi lampada); nessuna fonte -> risposta dedicata.
export const lightGeneric = {
  id: 'odessa.action.lightGeneric',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'ACCENDERE' && (!cmd.noun || cmd.noun === 'LUCE'),
  run: (cmd, ctx) => {
    const gameState = ctx.state;
    const fiammiferiRecord = findFiammiferi(ctx);
    const torciaRecord = gameState.Oggetti.find((o) => o.ID === ctx.game.config.oggetti.torcia);
    const torciaConTe = !!torciaRecord && torciaRecord.IDLuogo === 0 && !gameState.timers.torciaDifettosa;
    if (torciaConTe) {
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.torch.alreadyLit'), effects: [] };
    }
    const fiammiferiDisponibili = fiammiferiRecord &&
      (fiammiferiRecord.IDLuogo === 0 || fiammiferiRecord.IDLuogo === gameState.currentLocationId) &&
      fiammiferiRecord.Attivo >= 1 && gameState.timers.matchesLeft > 0;
    if (fiammiferiDisponibili) {
      return ctx.helpers.accendiFiammifero();
    }
    const lampadaConTe = gameState.Oggetti.some((o) => o.ID === ctx.game.config.oggetti.lampada && o.IDLuogo === 0 && o.Attivo >= 3);
    if (lampadaConTe) {
      const lampadaLocalizzata = gameState.currentLingua === 1 ? 'LAMPADA' : 'LAMP';
      const risultatoLampada = ctx.helpers.cercaEseguiInterazione('ACCENDERE', lampadaLocalizzata);
      if (risultatoLampada) return risultatoLampada;
    }
    return { accepted: true, resultType: 'OK', message: ctx.msg('engine.light.noSourceHere'), effects: [] };
  },
};

// 16 — odessa.action.lightTorch (righe 1652–1668)
// ACCENDI TORCIA: stato dedicato (nel luogo ma non con te, con te funzionante, con te guasta).
// NounConcept per i nomi (tipo NOUN) in EN non è il concetto italiano ma il nome
// localizzato dell'oggetto (parser.js, localizedNounConceptByTerm): "FLASHLIGHT",
// non "TORCIA_ELETTRICA".
export const lightTorch = {
  id: 'odessa.action.lightTorch',
  types: ['ACTION'],
  match: (cmd, ctx) => {
    const torciaElettricaLocalizzata = ctx.state.currentLingua === 1 ? 'TORCIA_ELETTRICA' : 'FLASHLIGHT';
    return cmd.concept === 'ACCENDERE' && cmd.noun === torciaElettricaLocalizzata;
  },
  run: (cmd, ctx) => {
    const gameState = ctx.state;
    const torciaRecord = gameState.Oggetti.find((o) => o.ID === ctx.game.config.oggetti.torcia);
    const conTe = !!torciaRecord && torciaRecord.IDLuogo === 0;
    const nelLuogo = !!torciaRecord && torciaRecord.IDLuogo === gameState.currentLocationId;
    if (conTe) {
      const chiave = gameState.timers.torciaDifettosa ? 'engine.torch.broken' : 'engine.torch.alreadyLit';
      return { accepted: true, resultType: 'OK', message: ctx.msg(chiave), effects: [] };
    }
    if (nelLuogo) {
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.torch.takeFirst'), effects: [] };
    }
    // Altrimenti (torcia non qui): prosegue con l'elaborazione standard sotto.
    return null;
  },
};
