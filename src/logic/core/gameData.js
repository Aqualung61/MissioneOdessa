/**
 * Dati statici di gioco (`global.odessaData`). Letto a ogni chiamata:
 * i test sostituiscono `global.odessaData` con oggetti parziali.
 * @returns {Object}
 */
export function getGameData() {
  return global.odessaData;
}
