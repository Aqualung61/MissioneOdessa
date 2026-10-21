// Registro degli effetti di Odessa (TD Lotto 4b, §3.3): tipo → (effetto, ctx, env) =>
// info | undefined. Rami trascritti alla lettera da `applicaEffetti` di `engine.js`
// (ce547fd, righe 1082–1130) con le sole sostituzioni di R1: `gameState` → `ctx.state`,
// helper → `ctx.helpers.*`, `getSystemMessage(k, lingua)` → `ctx.msg(k)`.
// `env` = { luogoCorrente, extraMessages }.

export const effectTypes = {
  VISIBILITA: (effetto, ctx, env) => {
    // Se l'effetto specifica un luogo, cerca solo lì. Altrimenti cerca nel luogo corrente
    const targetLuogo = effetto.luogo !== undefined ? effetto.luogo : env.luogoCorrente;
    const oggetto = ctx.state.Oggetti.find(o =>
      ctx.helpers.normalize(o.Oggetto) === ctx.helpers.normalize(effetto.target) &&
      (targetLuogo === undefined || o.IDLuogo === targetLuogo)
    );
    if (oggetto) {
      oggetto.Attivo = effetto.valore;
    }
  },

  SPOSTA_OGGETTO: (effetto, ctx) => {
    const oggetto = ctx.state.Oggetti.find(o =>
      ctx.helpers.normalize(o.Oggetto) === ctx.helpers.normalize(effetto.target)
    );
    if (oggetto) {
      oggetto.IDLuogo = effetto.a_luogo;
    }
  },

  SBLOCCA_DIREZIONE: (effetto, ctx) => {
    // Modifica la direzione nel gameState (da implementare con Luoghi dinamici)
    // Per ora registriamo l'effetto
    const key = `${effetto.luogo}_${effetto.direzione}`;
    if (!ctx.state.direzioniSbloccate) ctx.state.direzioniSbloccate = {};
    ctx.state.direzioniSbloccate[key] = effetto.destinazione;
  },

  // R3 (TD Lotto 4b): `statoPreToggle` è letto DOPO l'eventuale inizializzazione a `false`
  // e PRIMA dell'inversione; è l'unico effetto che restituisce `info`.
  TOGGLE_DIREZIONE: (effetto, ctx) => {
    const key = `${effetto.luogo}_${effetto.direzione}`;
    if (!ctx.state.direzioniToggle[key]) {
      ctx.state.direzioniToggle[key] = false;
    }
    // Salva stato PRIMA del toggle per la regola dei misteri (awardMystery)
    const statoPreToggle = ctx.state.direzioniToggle[key];
    ctx.state.direzioniToggle[key] = !ctx.state.direzioniToggle[key];
    return { statoPreToggle };
  },

  VITTORIA: (effetto, ctx) => {
    ctx.state.ended = true;
    ctx.state.victory = true;
  },

  // Voce volutamente VUOTA: non è codice morto. Il tipo è gestito direttamente in
  // `cercaEseguiInterazione` (richiede accesso alla risposta e controllo flusso); rimuovere
  // questa voce farebbe scattare l'avviso di tipo sconosciuto (TD Lotto 4b, §3.3).
  SEQUENZA: () => undefined,

  SET_FLAG: (effetto, ctx) => {
    // Imposta un flag in gameState usando percorso nested (es. "timers.lampadaAccesa")
    ctx.helpers.setNestedProperty(ctx.state, effetto.flag, effetto.valore);
  },

  RESET_COUNTER: (effetto, ctx) => {
    // Resetta un counter in gameState a 0 (es. "turn.turnsInDarkness")
    ctx.helpers.setNestedProperty(ctx.state, effetto.counter, 0);
  },

  CONSUMA_FIAMMIFERO: (effetto, ctx, env) => {
    // R8: consumo di un fiammifero (interazione accendi_lampada)
    if (ctx.helpers.consumaFiammifero()) {
      env.extraMessages.push(ctx.msg('engine.matches.finished'));
    }
  },
};
