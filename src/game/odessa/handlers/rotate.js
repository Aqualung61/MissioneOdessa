// Gestori ACTION di Odessa per GIRA/RUOTA.

// 19 — odessa.action.rotateDirection
// GIRA/RUOTA DESTRA/SINISTRA (D4): fuori dalla biblioteca, o in biblioteca con la
// cassaforte non visibile, le interazioni dedicate (PRIORITÀ 1) non hanno risposto.
export const rotateDirection = {
  id: 'odessa.action.rotateDirection',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'RUOTARE' && (cmd.noun === 'DESTRA' || cmd.noun === 'SINISTRA'),
  run: (cmd, ctx) => ({
    accepted: true,
    resultType: 'OK',
    message: ctx.msg('engine.rotate.nothingToTurn'),
    effects: [],
  }),
};

// 20 — odessa.action.rotateKnob
// GIRA/RUOTA MANOPOLA: solo con la cassaforte visibile (dopo
// "sposta quadro"/"prendi quadro"), in biblioteca (24). Senza cassaforte visibile:
// prosegue con l'elaborazione standard, che dà "Non vedi manopola qui." (nessun
// oggetto MANOPOLA nei dati, §4.10 generale).
export const rotateKnob = {
  id: 'odessa.action.rotateKnob',
  types: ['ACTION'],
  match: (cmd, ctx) =>
    cmd.concept === 'RUOTARE' &&
    cmd.noun === 'MANOPOLA' &&
    ctx.state.currentLocationId === ctx.game.config.luoghi.cassaforte &&
    ctx.state.flags.cassaforteScoperta,
  run: (cmd, ctx) => ({
    accepted: true,
    resultType: 'OK',
    message: ctx.msg('engine.rotate.knobPoints'),
    effects: [],
  }),
};
