// Gestore ACTION di Odessa: azioni bloccate dal buio.
// `DARK_BLOCKED_VERBS` arriva qui dalla configurazione del gioco.

// 6 — odessa.action.darkness
// Al buio alcune azioni non si eseguono (R1, BAS 240–250); il turno è consumato.
// CARICARE con un nome (#98): equivale a METTERE (es. "carica peso"), quindi
// bloccato al buio come METTERE; la forma "carica" da sola è un comando di SISTEMA
// e non passa da questo gestore, quindi il caricamento della partita non è mai bloccato.
// Verbi (concetti) che al buio non si eseguono: "È troppo buio per farlo." (R1, BAS 240–250).
// Restano eseguibili: movimento, POSARE, LASCIARE, ACCENDERE, DORMIRE e i comandi di sistema.
export const darkness = {
  id: 'odessa.action.darkness',
  types: ['ACTION'],
  match: (cmd, ctx) => {
    const DARK_BLOCKED_VERBS = new Set(ctx.game.config.regole.verbiBloccatiAlBuio);
    return (DARK_BLOCKED_VERBS.has(cmd.concept) || cmd.concept === 'CARICARE') && !ctx.game.rules.hasActiveLight(ctx.state);
  },
  run: (cmd, ctx) => ({ accepted: true, resultType: 'OK', message: ctx.msg('engine.dark.tooDark'), effects: [] }),
};
