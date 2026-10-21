// Gestore generico ACTION per POSA/LASCIA (TD Lotto 4a, §4, riga 26): blocco 1816–1829
// di 4acdd1b trascritto alla lettera (R1); `normalizeForComparison` locale → `ctx.helpers.normalize` (R5).

// 26 — core.action.drop
export const drop = {
  id: 'core.action.drop',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'POSARE' || cmd.concept === 'LASCIARE' || cmd.verb === 'POSA' || cmd.verb === 'LASCIA',
  run: (cmd, ctx) => {
    const gameState = ctx.state;
    // Trova l'oggetto nell'inventario
    const oggetto = (gameState.Oggetti || []).find(obj =>
      ctx.helpers.normalize(obj.Oggetto) === ctx.helpers.normalize(cmd.noun) &&
      obj.IDLuogo === 0 &&
      obj.Attivo >= 3
    );
    if (oggetto) {
      oggetto.IDLuogo = gameState.currentLocationId; // Sposta nel luogo corrente
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.drop.success', [oggetto.Oggetto]), effects: [] };
    }
    return { accepted: true, resultType: 'OK', message: ctx.msg('engine.drop.notInInventory', [cmd.nounForMissingObject]), effects: [] };
  },
};
