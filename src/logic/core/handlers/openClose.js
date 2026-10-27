// Gestore generico ACTION per APRI/CHIUDI; oggetto presente ricalcolato qui.

// 24 — core.action.openClose
// APRI / CHIUDI (elementi apribili)
export const openClose = {
  id: 'core.action.openClose',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'APRIRE' || cmd.concept === 'CHIUDERE' || cmd.verb === 'APRI' || cmd.verb === 'CHIUDI',
  run: (cmd, ctx) => {
    const gameState = ctx.state;
    const { verb, concept, noun } = cmd;
    const oggetto = ctx.helpers.findObjectHereOrInventory(noun);
    if (!oggetto) return { accepted: true, resultType: 'OK', message: ctx.msg('engine.examine.objectNotHere', [cmd.nounForMissingObject]), effects: [] };
    const canOpen = Object.prototype.hasOwnProperty.call(gameState.openStates, noun);
    if (!canOpen) return { accepted: true, resultType: 'OK', message: ctx.msg('engine.openClose.cannotDo', [verb.toLowerCase(), noun.toLowerCase().replace(/_/g, ' ')]), effects: [] };
    const openNow = !!gameState.openStates[noun];
    const isOpenCommand = concept === 'APRIRE' || verb === 'APRI';
    if (isOpenCommand) {
      if (openNow) return { accepted: true, resultType: 'OK', message: ctx.msg('engine.open.alreadyOpen'), effects: [] };
      gameState.openStates[noun] = true;
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.open.success', [noun]), effects: [] };
    } else {
      if (!openNow) return { accepted: true, resultType: 'OK', message: ctx.msg('engine.close.alreadyClosed'), effects: [] };
      gameState.openStates[noun] = false;
      return { accepted: true, resultType: 'OK', message: ctx.msg('engine.close.success', [noun]), effects: [] };
    }
  },
};
