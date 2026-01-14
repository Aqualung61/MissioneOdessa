import { getGameState } from '../../src/logic/engine.js';

export function score() {
  return getGameState().punteggio.totale;
}
