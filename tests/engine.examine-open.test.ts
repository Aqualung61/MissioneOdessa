import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import path from 'node:path';
// @ts-expect-error ESM JS module
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { executeCommand, resetGameState, getGameStateSnapshot } from '../src/logic/engine.js';

const DB = path.resolve(process.cwd(), 'db', 'Odessa.db');

describe('Engine: ESAMINA e APRI/CHIUDI', () => {
  beforeAll(async () => {
    await ensureVocabulary(DB);
  });

  beforeEach(() => {
    resetGameState();
  });

  it('ESAMINA LAMPADA presente -> descrizione stub', async () => {
    const parsed = await parseCommand(DB, 'ESAMINA LAMPADA');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(typeof res.message).toBe('string');
    expect(res.message.length).toBeGreaterThan(0);
  });

  it('APRI BOTOLA -> aperta; CHIUDI BOTOLA -> chiusa', async () => {
    let parsed = await parseCommand(DB, 'APRI BOTOLA');
    let res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toMatch(/Hai aperto la BOTOLA|È già aperto/i);
    let snap = getGameStateSnapshot();
    expect(snap.openStates.BOTOLA).toBe(true);

    parsed = await parseCommand(DB, 'CHIUDI BOTOLA');
    res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toMatch(/Hai chiuso la BOTOLA|È già chiuso/i);
    snap = getGameStateSnapshot();
    expect(snap.openStates.BOTOLA).toBe(false);
  });
});
