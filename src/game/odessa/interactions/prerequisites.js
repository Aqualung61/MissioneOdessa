// Registro dei prerequisiti di Odessa (TD Lotto 4b, §3.2): tipo → (req, ctx) => boolean,
// `true` = soddisfatto. Corpi trascritti alla lettera da `verificaPrerequisiti` di
// `engine.js` (ce547fd, righe 936–972); la condizione di fallimento originale
// (`if (...) return { ok: false }`) è invertita in modo esplicito in `return <condizione di successo>`.

export const prerequisiteTypes = {
  // originale: if (!oggetto) fallisce
  OGGETTO_IN_INVENTARIO: (req, ctx) => {
    const oggetto = ctx.state.Oggetti.find(o =>
      ctx.helpers.normalize(o.Oggetto) === ctx.helpers.normalize(req.target) &&
      o.IDLuogo === 0 &&
      o.Attivo >= 3
    );
    return !!oggetto;
  },

  // originale: if (!oggetto) fallisce
  OGGETTO_IN_LUOGO: (req, ctx) => {
    const oggetto = ctx.state.Oggetti.find(o =>
      ctx.helpers.normalize(o.Oggetto) === ctx.helpers.normalize(req.target) &&
      o.IDLuogo === req.luogo &&
      o.Attivo >= 1
    );
    return !!oggetto;
  },

  // Stessa condizione di OGGETTO_IN_LUOGO oggi (TD Lotto 4b §3.2, §8): due voci distinte, identiche.
  // originale: if (!oggetto) fallisce
  OGGETTO_VISIBILE: (req, ctx) => {
    const oggetto = ctx.state.Oggetti.find(o =>
      ctx.helpers.normalize(o.Oggetto) === ctx.helpers.normalize(req.target) &&
      o.IDLuogo === req.luogo &&
      o.Attivo >= 1
    );
    return !!oggetto;
  },

  // originale: if (!seq || !seq.completata) fallisce
  SEQUENZA_COMPLETATA: (req, ctx) => {
    const seq = ctx.state.sequenze[req.target];
    return !(!seq || !seq.completata);
  },

  // originale: if (!includes) fallisce
  INTERAZIONE_ESEGUITA: (req, ctx) => {
    return ctx.state.interazioniEseguite.includes(req.target);
  },

  // originale: if (getNestedProperty(...)) fallisce
  FLAG_FALSE: (req, ctx) => {
    return !ctx.helpers.getNestedProperty(ctx.state, req.flag);
  },

  // originale: if (length >= limite) fallisce
  INVENTARIO_NON_PIENO: (req, ctx) => {
    // Stesso conteggio del comando PRENDERE generico (limite di 5 oggetti)
    const oggettiInInventario = (ctx.state.Oggetti || []).filter(o => o.IDLuogo === 0 && o.Attivo >= 3);
    return !(oggettiInInventario.length >= ctx.game.config.regole.limiteInventario);
  },

  // originale: if (!isOpen) fallisce
  DIREZIONE_APERTA: (req, ctx) => {
    // Vero se la direzione è attualmente aperta tramite toggle (es. porta del 44, pulsante)
    const key = `${req.luogo}_${req.direzione}`;
    const isOpen = !!ctx.state.direzioniToggle[key];
    return isOpen;
  },
};
