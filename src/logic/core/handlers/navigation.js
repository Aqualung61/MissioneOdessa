// Gestori generici di NAVIGATION (TD Lotto 4a, §4, righe 1 e 4). Blocchi trascritti alla
// lettera dallo switch dei comandi di `engine.js` su 4acdd1b (R1): `gameState` → `ctx.state`,
// helper → `ctx.helpers`.

// Concetti di NAVIGAZIONE gestiti (TD Lotto 4a, §5.1 punto 4: confrontati con il lessico).
export const HANDLED_NAV_CONCEPTS = ['NORD', 'EST', 'SUD', 'OVEST', 'ALTO', 'BASSO'];

// Mappa concetto → colonna della direzione (alla lettera dallo switch originale; i casi
// 'SU', 'GIU', 'GIÙ' sono stati rimossi in P5: il lessico non li produce, TD §3.6).
export function directionFieldFor(concept) {
  switch (concept) {
    case 'NORD':
      return 'Nord';
    case 'EST':
      return 'Est';
    case 'SUD':
      return 'Sud';
    case 'OVEST':
      return 'Ovest';
    case 'ALTO':
      return 'Su';
    case 'BASSO':
      return 'Giu';
    default:
      return null;
  }
}

// 1 — core.nav.unknownDirection (righe 1370–1407 di 4acdd1b)
export const unknownDirection = {
  id: 'core.nav.unknownDirection',
  types: ['NAVIGATION'],
  match: (cmd) => !directionFieldFor(cmd.concept),
  run: (cmd, ctx) => {
    const messageUnknown = ctx.state.currentLingua === 2
      ? 'Direction not recognized.'
      : 'Direzione non riconosciuta.';

    return {
      accepted: true,
      resultType: 'ERROR',
      message: messageUnknown,
      effects: [],
    };
  },
};

// 4 — core.nav.move (righe 1446–1462 di 4acdd1b): bloccato generico o spostamento
export const move = {
  id: 'core.nav.move',
  types: ['NAVIGATION'],
  run: (cmd, ctx) => {
    const directionField = directionFieldFor(cmd.concept);

    const messageBlocked = ctx.state.currentLingua === 2
      ? 'You cannot go that way.'
      : 'Non puoi andare in quella direzione.';

    const currentId = ctx.state.currentLocationId;
    const direzioni = ctx.helpers.getDirezioniLuogo(currentId);
    const nextId = direzioni?.[directionField];

    if (typeof nextId !== 'number' || nextId < 1) {
      return {
        accepted: true,
        resultType: 'ERROR',
        message: messageBlocked,
        effects: [],
      };
    }

    ctx.helpers.setCurrentLocation(nextId);
    return {
      accepted: true,
      resultType: 'OK',
      message: '',
      effects: [],
      locationId: nextId,
      showLocation: true,
    };
  },
};
