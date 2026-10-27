// Gestore generico ACTION per ESAMINA/GUARDA. L'oggetto presente si
// ricalcola qui, dopo le interazioni; i casi speciali con nome stanno nel
// gestore del gioco che lo precede.

// 23 — core.action.examine
export const examine = {
  id: 'core.action.examine',
  types: ['ACTION'],
  match: (cmd) =>
    cmd.concept === 'ESAMINARE' ||
    cmd.concept === 'GUARDARE' ||
    cmd.verb === 'ESAMINA' ||
    cmd.verb === 'GUARDA',
  run: (cmd, ctx) => {
    // Senza oggetto: mostra descrizione del luogo corrente con oggetti presenti
    if (!cmd.noun) {
      const messaggioCompleto = ctx.helpers.generaDescrizioneLuogoConOggetti(
        ctx.state.currentLocationId
      );
      if (messaggioCompleto) {
        return { accepted: true, resultType: 'OK', message: messaggioCompleto, effects: [] };
      }
      return {
        accepted: true,
        resultType: 'OK',
        message: ctx.msg('engine.examine.nothingSpecial'),
        effects: [],
      };
    }
    const oggetto = ctx.helpers.findObjectHereOrInventory(cmd.noun);
    // Con oggetto: mostra descrizione dell'oggetto
    if (!oggetto)
      return {
        accepted: true,
        resultType: 'OK',
        message: ctx.msg('engine.examine.objectNotHere', [cmd.nounForMissingObject]),
        effects: [],
      };
    const text = oggetto.descrizione || ctx.msg('engine.examine.nothingSpecial');
    return { accepted: true, resultType: 'OK', message: text, effects: [] };
  },
};
