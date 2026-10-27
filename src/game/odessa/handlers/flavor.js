// Gestori ACTION di Odessa "di colore": risposte fisse dell'originale.

// 9 — odessa.action.spegni
// SPEGNI (con o senza nome): risposta fissa decisa (R9, inventario §1.2).
export const spegni = {
  id: 'odessa.action.spegni',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'SPEGNERE',
  run: (cmd, ctx) => ({
    accepted: true,
    resultType: 'OK',
    message: ctx.msg('engine.spegni.notTime'),
    effects: [],
  }),
};

// 10 — odessa.action.scappa
// SCAPPA (D7): stessa risposta sempre.
export const scappa = {
  id: 'odessa.action.scappa',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'SCAPPARE',
  run: (cmd, ctx) => ({
    accepted: true,
    resultType: 'OK',
    message: ctx.msg('engine.scappa.cantEscape'),
    effects: [],
  }),
};

// 11 — odessa.action.sorridi
// SORRIDI: stessa risposta sempre (con o senza nome, come già l'originale).
export const sorridi = {
  id: 'odessa.action.sorridi',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'SORRIDERE',
  run: (cmd, ctx) => ({
    accepted: true,
    resultType: 'OK',
    message: ctx.msg('engine.sorridi.cheese'),
    effects: [],
  }),
};

// 12 — odessa.action.dormi
// DORMI, SIEDITI (D7): stessa risposta con o senza nome; sostituisce la risposta
// generica "Cosa vuoi dormire?".
export const dormi = {
  id: 'odessa.action.dormi',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'DORMIRE' || cmd.concept === 'SEDERSI',
  run: (cmd, ctx) => ({
    accepted: true,
    resultType: 'OK',
    message: ctx.msg('engine.dormi.noTimeToWaste'),
    effects: [],
  }),
};

// 13 — odessa.action.parla
// PARLA, RISPONDI: stessa risposta ovunque tranne alla barriera (59).
export const parla = {
  id: 'odessa.action.parla',
  types: ['ACTION'],
  match: (cmd) => cmd.concept === 'PARLARE',
  run: (cmd, ctx) => {
    const chiave =
      ctx.state.currentLocationId === ctx.game.config.luoghi.barriera
        ? 'engine.parla.guardGerman'
        : 'engine.parla.toSelf';
    return { accepted: true, resultType: 'OK', message: ctx.msg(chiave), effects: [] };
  },
};
