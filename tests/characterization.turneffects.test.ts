/**
 * Test di caratterizzazione — effetti di turno (#63).
 * Specifica: `docs/20261019 - TD Lotto 0 Rete di caratterizzazione - v1.0.md`, §3.5.
 *
 * Ambito: `getDawnTurnLimit` (`src/logic/turnEffects/dawnEffect.js`), unico ramo
 * raggiungibile individuato tra gli effetti di turno non ancora coperto. Variabile
 * d'ambiente impostata solo durante il test e ripristinata subito dopo.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { getDawnTurnLimit, DAWN_TURN_LIMIT } from '../src/logic/turnEffects/dawnEffect.js';

describe('Caratterizzazione — effetti di turno: getDawnTurnLimit (#63)', () => {
  const prev = process.env.GAME_MAX_TURNS_CONSUMED;

  afterEach(() => {
    if (typeof prev === 'string') process.env.GAME_MAX_TURNS_CONSUMED = prev;
    else delete process.env.GAME_MAX_TURNS_CONSUMED;
  });

  it('getDawnTurnLimit — GAME_MAX_TURNS_CONSUMED non numerico: ricade sul limite predefinito', () => {
    process.env.GAME_MAX_TURNS_CONSUMED = 'abc';
    expect(getDawnTurnLimit()).toBe(DAWN_TURN_LIMIT);
  });

  it('getDawnTurnLimit — GAME_MAX_TURNS_CONSUMED a zero: ricade sul limite predefinito', () => {
    process.env.GAME_MAX_TURNS_CONSUMED = '0';
    expect(getDawnTurnLimit()).toBe(DAWN_TURN_LIMIT);
  });
});
