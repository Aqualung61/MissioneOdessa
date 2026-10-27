// Costruzione del comando per i gestori: i calcoli si fanno una sola volta, prima del dispatch.

/**
 * @param {Object} parseResult - ParseResult valido
 * @param {Object} state - `gameState` corrente
 * @param {Object} helpers - `helpers.normalize` per il calcolo di `nounForMissingObject`
 */
export function buildCommand(parseResult, state, helpers) {
  const type = parseResult.CommandType;

  if (type === 'ACTION') {
    const verb = (parseResult.CanonicalVerb || '').toUpperCase();
    const concept = (parseResult.VerbConcept || '').toUpperCase();
    // Usa NounConcept invece di CanonicalNoun per gestire correttamente nomi composti
    const noun = (parseResult.NounConcept || parseResult.CanonicalNoun || '').toUpperCase();
    // Regola generale dei nomi senza oggetto: se il nome non
    // corrisponde a un oggetto nei dati (in nessun luogo), si mostra la parola
    // effettivamente digitata dal giocatore (NounLiteral); se l'oggetto esiste altrove,
    // resta il nome dell'oggetto (NounConcept, già localizzato).
    const esisteComeOggettoOvunque = (state.Oggetti || []).some(
      (o) => helpers.normalize(o.Oggetto) === helpers.normalize(noun)
    );
    const nounForMissingObject = esisteComeOggettoOvunque
      ? noun.toLowerCase().replace(/_/g, ' ')
      : (parseResult.NounLiteral || noun.toLowerCase().replace(/_/g, ' '));
    return { type, parseResult, concept, verb, noun, nounForMissingObject };
  }

  // NAVIGATION, SYSTEM: preferisce il concetto per normalizzare i sinonimi
  const concept = (parseResult.VerbConcept || parseResult.CanonicalVerb || '').toUpperCase();
  return { type, parseResult, concept };
}
