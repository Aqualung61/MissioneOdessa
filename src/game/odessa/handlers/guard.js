// Gestore ACTION di Odessa (TD Lotto 4a, §4, riga 14): blocco 1614–1628 di 4acdd1b
// trascritto alla lettera (R1).

// 14 — odessa.action.attackGuard
// === Lessico L3: guardia, nomi, luoghi, movimento e preposizioni (#109) ===
// ATTACCA (4.2): con o senza nome, solo alla barriera (59) -> morte (GUARD_ATTACK,
// come l'arresto della guardia, nessun effetto sul punteggio). Fuori dalla
// barriera (E1): nessun testo nuovo, prosegue con l'elaborazione standard
// (risposta generica del porting, come ogni altro verbo senza effetto).
export const attackGuard = {
  id: 'odessa.action.attackGuard',
  types: ['ACTION'],
  match: (cmd, ctx) => cmd.concept === 'ATTACCARE' && ctx.state.currentLocationId === ctx.game.config.luoghi.barriera,
  run: (cmd, ctx) => {
    ctx.state.awaitingRestart = true;
    return {
      accepted: false,
      resultType: 'GAME_OVER',
      message: ctx.msg('engine.attack.guardStrikes'),
      gameOver: true,
      gameOverReason: 'GUARD_ATTACK',
      effects: [],
    };
  },
};
