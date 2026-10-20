// Gestori di NAVIGATION specifici di Odessa (TD Lotto 4a, §4, righe 2 e 3). Blocchi
// trascritti alla lettera dallo switch dei comandi di `engine.js` su 4acdd1b (R1).
import { directionFieldFor } from '../../../logic/core/handlers/navigation.js';

// 2 — odessa.nav.collapsedPassage (righe 1413–1434 di 4acdd1b)
// Passaggio crollato (32 → 36): nell'originale il crollo avviene una sola
// volta (BAS 330–340, 5160–5210); dopo, il passaggio resta bloccato (#117).
export const collapsedPassage = {
  id: 'odessa.nav.collapsedPassage',
  types: ['NAVIGATION'],
  match: (cmd, ctx) =>
    ctx.state.currentLocationId === ctx.game.config.luoghi.passaggioCrollato.luogo
    && directionFieldFor(cmd.concept) === ctx.game.config.luoghi.passaggioCrollato.direzione,
  run: (cmd, ctx) => {
    if (ctx.state.flags.passaggioCrollato) {
      return {
        accepted: true,
        resultType: 'ERROR',
        message: ctx.msg('engine.move.passageCollapsedBlocked'),
        effects: [],
      };
    }
    ctx.state.flags.passaggioCrollato = true;
    ctx.helpers.setCurrentLocation(ctx.game.config.luoghi.passaggioCrollato.destinazione);
    return {
      accepted: true,
      resultType: 'OK',
      message: ctx.msg('engine.move.passageCollapses'),
      effects: [],
      locationId: ctx.game.config.luoghi.passaggioCrollato.destinazione,
      showLocation: true,
    };
  },
};

// 3 — odessa.nav.blockedWithText (righe 1436–1445 di 4acdd1b)
// Movimenti bloccati con un testo dedicato dell'originale (#109, L3, §4.7–4.9):
// sostituiscono il messaggio generico solo in quei luoghi e condizioni; il
// turno si consuma comunque, come per ogni movimento bloccato.
function findBlockedWithText(cmd, ctx) {
  const directionField = directionFieldFor(cmd.concept);
  const currentId = ctx.state.currentLocationId;
  const direzioni = ctx.helpers.getDirezioniLuogo(currentId);
  const nextId = direzioni?.[directionField];

  if (typeof nextId !== 'number' || nextId < 1) {
    return ctx.game.config.luoghi.movimentiBloccatiConTesto.find(
      (m) => m.luogo === currentId && m.direzione === directionField
    );
  }
  return undefined;
}

export const blockedWithText = {
  id: 'odessa.nav.blockedWithText',
  types: ['NAVIGATION'],
  match: (cmd, ctx) => !!findBlockedWithText(cmd, ctx),
  run: (cmd, ctx) => {
    const movimentoBloccatoConTesto = findBlockedWithText(cmd, ctx);
    return { accepted: true, resultType: 'ERROR', message: ctx.msg(movimentoBloccatoConTesto.messaggio), effects: [] };
  },
};
