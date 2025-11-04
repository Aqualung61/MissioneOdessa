import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import path from 'node:path';
// @ts-expect-error ESM JS module (parser)
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { executeCommand, resetGameState, getGameStateSnapshot } from '../src/logic/engine.js';

const DB = path.resolve(process.cwd(), 'db', 'Odessa.db');

describe('Engine gameplay base: PRENDI/POSA e INVENTARIO', () => {
  beforeAll(async () => {
    await ensureVocabulary(DB);
  });

  beforeEach(() => {
    resetGameState();
  });

  it('PRENDI LAMPADA -> inventario contiene LAMPADA', async () => {
    const parsed = await parseCommand(DB, 'PRENDI LAMPADA');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toMatch(/Hai preso la LAMPADA/);
    const snap = getGameStateSnapshot();
    expect(snap.inventory).toContain('LAMPADA');
    expect(snap.roomItems).not.toContain('LAMPADA');
  });

  it('POSA LAMPADA dopo PRENDI -> torna nella stanza', async () => {
    let parsed = await parseCommand(DB, 'PRENDI LAMPADA');
    executeCommand(parsed);
    parsed = await parseCommand(DB, 'POSA LAMPADA');
    const res2 = executeCommand(parsed);
    expect(res2.accepted).toBe(true);
    expect(res2.message).toMatch(/Hai posato la LAMPADA/);
    const snap = getGameStateSnapshot();
    expect(snap.inventory).not.toContain('LAMPADA');
    expect(snap.roomItems).toContain('LAMPADA');
  });

  it('INVENTARIO mostra contenuto o assenza', async () => {
    // Vuoto
    let parsed = await parseCommand(DB, 'INVENTARIO');
    let res = executeCommand(parsed);
    expect(res.message).toBe('Non hai nulla.');
    // Dopo PRENDI LAMPADA
    parsed = await parseCommand(DB, 'PRENDI LAMPADA');
    executeCommand(parsed);
    parsed = await parseCommand(DB, 'INVENTARIO');
    res = executeCommand(parsed);
    expect(res.message).toContain('LAMPADA');
  });
});
