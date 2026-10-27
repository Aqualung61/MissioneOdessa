// Gestori generici di NAVIGATION.

// Concetti di NAVIGAZIONE gestiti (confrontati con il lessico).
export const HANDLED_NAV_CONCEPTS = ['NORD', 'EST', 'SUD', 'OVEST', 'ALTO', 'BASSO'];

// Mappa concetto → colonna della direzione (dallo switch originale; i casi
// 'SU', 'GIU', 'GIÙ' non sono presenti: il lessico non li produce).
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

// 1 — core.nav.unknownDirection
export const unknownDirection = {
  id: 'core.nav.unknownDirection',
  types: ['NAVIGATION'],
  match: (cmd) => !directionFieldFor(cmd.concept),
  run: (cmd, ctx) => {
    const messageUnknown =
      ctx.state.currentLingua === 2 ? 'Direction not recognized.' : 'Direzione non riconosciuta.';

    return {
      accepted: true,
      resultType: 'ERROR',
      message: messageUnknown,
      effects: [],
    };
  },
};

// 4 — core.nav.move: bloccato generico o spostamento
export const move = {
  id: 'core.nav.move',
  types: ['NAVIGATION'],
  run: (cmd, ctx) => {
    const directionField = directionFieldFor(cmd.concept);

    const messageBlocked =
      ctx.state.currentLingua === 2
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
