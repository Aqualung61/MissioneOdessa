// Gestore generico ACTION di ripiego (TD Lotto 4a, §4, riga 27): blocco 1831–1844 di
// 4acdd1b trascritto alla lettera (R1); oggetto presente ricalcolato qui (R3).

// 27 — core.action.fallback
export const fallback = {
  id: 'core.action.fallback',
  types: ['ACTION'],
  run: (cmd, ctx) => {
    const { verb, noun } = cmd;
    // Altri verbi: verifica se richiedono oggetto
    if (!noun) {
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.action.whatDoYouWant', [verb.toLowerCase()]), effects: [] };
    }
    const oggetto = ctx.helpers.findObjectHereOrInventory(noun);
    // PRIORITÀ: Verifica esistenza oggetto prima di dire che l'azione non è possibile
    if (!oggetto) {
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.examine.objectNotHere', [cmd.nounForMissingObject]), effects: [] };
    }
    // Altri verbi: risposta generica user-friendly (oggetto presente, azione non supportata)
    return {
      accepted: true,
      resultType: 'OK',
      message: ctx.msg('engine.action.cannotDo', [verb.toLowerCase(), noun.toLowerCase().replace(/_/g, ' ')]),
      effects: [],
    };
  },
};
