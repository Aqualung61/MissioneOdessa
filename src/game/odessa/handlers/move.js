// Gestore ACTION di Odessa: MUOVI/SPOSTA. L'oggetto presente si ricalcola qui, dopo le
// interazioni, con la stessa ricerca di "PRIORITÀ 2".

// 21 — odessa.action.moveObject
// MUOVI/SPOSTA senza interazione dedicata (D3): solo se l'oggetto è presente,
// altrimenti il comportamento resta invariato (oggetto non qui).
export const moveObject = {
  id: 'odessa.action.moveObject',
  types: ['ACTION'],
  match: (cmd) =>
    (cmd.concept === 'SPOSTARE' || cmd.verb === 'MUOVI' || cmd.verb === 'SPOSTA') && !!cmd.noun,
  run: (cmd, ctx) => {
    const oggetto = ctx.helpers.findObjectHereOrInventory(cmd.noun);
    if (!oggetto) return null;
    const trasportabile =
      oggetto.Attivo >= 3 || ctx.game.config.oggetti.spostabiliAncheSeFissi.includes(oggetto.ID);
    const chiave = trasportabile ? 'engine.move.nothingHappens' : 'engine.move.notPossible';
    return { accepted: true, resultType: 'OK', message: ctx.msg(chiave), effects: [] };
  },
};
