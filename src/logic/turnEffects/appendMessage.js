/**
 * Aggiunge un messaggio di turno (avviso) in coda al messaggio del comando.
 * Se il messaggio del comando è vuoto (es. movimento riuscito), l'avviso lo sostituisce
 * senza righe vuote iniziali.
 * @param {Object} result - Risultato del comando (modificato)
 * @param {string} message - Testo da aggiungere
 */
export function appendTurnMessage(result, message) {
  if (!message) return;
  result.message = result.message ? result.message + '\n\n' + message : message;
}
