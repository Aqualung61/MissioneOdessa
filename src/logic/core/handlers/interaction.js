// Gestore generico ACTION delle interazioni. I registri delle interazioni restano nel
// motore, esposti tramite `ctx.helpers.cercaEseguiInterazione`.

// 18 — core.action.interaction
// PRIORITÀ 1: Cerca interazioni custom nel file Interazioni.json
// Usa il VerbConcept (significato semantico) invece del CanonicalVerb (forma)
export const interaction = {
  id: 'core.action.interaction',
  types: ['ACTION'],
  match: (cmd) => !!(cmd.noun && cmd.concept),
  run: (cmd, ctx) => {
    const interazioneResult = ctx.helpers.cercaEseguiInterazione(cmd.concept, cmd.noun);
    if (interazioneResult) {
      return interazioneResult;
    }
    return null;
  },
};
