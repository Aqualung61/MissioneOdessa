// Gestore ACTION di Odessa: SCAVA.

// 17 — odessa.action.dig
// SCAVA: senza nome (o con "macerie" dove non esiste un'interazione dedicata),
// risposte dell'originale per luogo.
export const dig = {
  id: 'odessa.action.dig',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'SCAVARE',
  run: (cmd, ctx) => {
    const gameState = ctx.state;
    const noun = cmd.noun;
    const macerieLocalizzata = gameState.currentLingua === 1 ? 'MACERIE' : 'RUBBLE';
    const senzaNomeOMacerie = !noun || noun === macerieLocalizzata;
    if (senzaNomeOMacerie) {
      const LUOGHI_SCAVA_MACERIE_DELEGATA = new Set(ctx.game.config.luoghi.scavoDelegatoAInterazione);
      if (!noun && LUOGHI_SCAVA_MACERIE_DELEGATA.has(gameState.currentLocationId)) {
        const risultatoScava = ctx.helpers.cercaEseguiInterazione('SCAVARE', macerieLocalizzata);
        if (risultatoScava) return risultatoScava;
      }
      if (ctx.game.config.luoghi.scavoSenzaAttrezzo.includes(gameState.currentLocationId)) {
        const haBadile = gameState.Oggetti.some((o) => o.ID === ctx.game.config.oggetti.badile && o.IDLuogo === 0 && o.Attivo >= 3);
        if (!haBadile) {
          return { accepted: true, resultType: 'OK', message: ctx.msg('engine.dig.bareHandsNoTool'), effects: [] };
        }
        // A 36, sotto il passaggio crollato, scavando non si trova un passaggio a nord (E-4, v1.1).
        const chiave = gameState.currentLocationId === ctx.game.config.luoghi.passaggioCrollato.destinazione ? 'engine.dig.noPassageNorth' : 'engine.dig.digging';
        return { accepted: true, resultType: 'OK', message: ctx.msg(chiave), effects: [] };
      }
      if (!noun) {
        const haBadile = gameState.Oggetti.some((o) => o.ID === ctx.game.config.oggetti.badile && o.IDLuogo === 0 && o.Attivo >= 3);
        const chiave = haBadile ? 'engine.dig.digging' : 'engine.dig.noToolHere';
        return { accepted: true, resultType: 'OK', message: ctx.msg(chiave), effects: [] };
      }
      // Nome "macerie" altrove, senza interazione dedicata: prosegue con l'elaborazione standard.
    }
    return null;
  },
};
