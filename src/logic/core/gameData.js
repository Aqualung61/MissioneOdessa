// Accesso ai dati statici di gioco (TD Lotto 4a, §3.7; TD 0 §4.8). Letto a ogni
// chiamata: i test sostituiscono `global.odessaData` con oggetti parziali.
export function getGameData() {
  return global.odessaData;
}
