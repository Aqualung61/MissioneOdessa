// Gestore generico ACTION per PRENDI.

// 25 — core.action.take
export const take = {
  id: 'core.action.take',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'PRENDERE' || cmd.verb === 'PRENDI',
  run: (cmd, ctx) => {
    const gameState = ctx.state;
    const noun = cmd.noun;
    // Controlla limite inventario (max 5 oggetti)
    const oggettiInInventario = (gameState.Oggetti || []).filter(
      (obj) => obj.IDLuogo === 0 && obj.Attivo >= 3
    );
    if (oggettiInInventario.length >= ctx.game.config.regole.limiteInventario) {
      return {
        accepted: true,
        resultType: 'OK',
        message: ctx.msg('engine.take.inventoryFull'),
        effects: [],
      };
    }
    // Trova l'oggetto nel luogo corrente
    const oggetto = (gameState.Oggetti || []).find(
      (obj) =>
        ctx.helpers.normalize(obj.Oggetto) === ctx.helpers.normalize(noun) &&
        obj.IDLuogo === gameState.currentLocationId &&
        obj.Attivo >= 1
    );
    if (oggetto) {
      if (oggetto.Attivo < 3) {
        // Oggetto scenico (1) o spostabile (2), non raccoglibile
        return {
          accepted: true,
          resultType: 'OK',
          message: ctx.msg('engine.take.cannotTake'),
          effects: [],
        };
      }
      // Attivo >= 3: oggetto raccoglibile
      oggetto.IDLuogo = 0; // Sposta nell'inventario
      return {
        accepted: true,
        resultType: 'OK',
        message: ctx.msg('engine.take.success', [oggetto.Oggetto]),
        effects: [],
      };
    }
    return {
      accepted: true,
      resultType: 'OK',
      message: ctx.msg('engine.examine.objectNotHere', [cmd.nounForMissingObject]),
      effects: [],
    };
  },
};
