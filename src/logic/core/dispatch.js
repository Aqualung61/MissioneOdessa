// Dispatch dei gestori di verbo (TD Lotto 4a, §3.3). Un gestore è
// `{ id, types, match?, run }`; `run` restituisce un risultato oppure `null` per passare
// al successivo (i rami che oggi "proseguono con l'elaborazione standard").

/**
 * Primo risultato non nullo tra i gestori applicabili, nell'ordine dell'elenco; `null` se nessuno risponde.
 */
export function runHandlers(handlers, cmd, ctx) {
  for (const h of handlers) {
    if (!h.types.includes(cmd.type)) continue;
    if (h.match && !h.match(cmd, ctx)) continue;
    const r = h.run(cmd, ctx);
    if (r) return r;
  }
  return null;
}

export function dispatch(handlers, cmd, ctx) {
  return runHandlers(handlers, cmd, ctx)
    ?? { accepted: false, resultType: 'ERROR', message: ctx.msg('engine.error.unknownCommandType') };
}
