import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
// Rimosso @ts-expect-error inutilizzato
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';

const DB = path.resolve(process.cwd(), 'db', 'odessa.db');

describe('Parser REQ01 - casi base', () => {
  beforeAll(async () => {
    await ensureVocabulary(DB);
  });

  it('ACTION + NOUN: PRENDI LA LAMPADA => valido', async () => {
    const res = await parseCommand(DB, 'PRENDI LA LAMPADA');
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.CanonicalVerb).toBe('PRENDI');
    expect(res.CanonicalNoun).toBe('LAMPADA');
  });

  it('ACTION singolo senza oggetto: DORMI => valido', async () => {
    const res = await parseCommand(DB, 'DORMI');
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.CanonicalVerb).toBe('DORMI');
  });

  it('NAVIGATION: N => valido', async () => {
    const res = await parseCommand(DB, 'N');
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('NAVIGATION');
  });

  it('Errore sintassi: PRENDI => SYNTAX_ACTION_INCOMPLETE', async () => {
    const res = await parseCommand(DB, 'PRENDI');
    expect(res.IsValid).toBe(false);
    expect(res.Error).toBe('SYNTAX_ACTION_INCOMPLETE');
  });

  it('Errore NOUN sconosciuto: PRENDI ZZZ => SYNTAX_NOUN_UNKNOWN', async () => {
    const res = await parseCommand(DB, 'PRENDI ZZZ');
    expect(res.IsValid).toBe(false);
    expect(res.Error).toBe('SYNTAX_NOUN_UNKNOWN');
  });

  it('Tolleranza punteggiatura: PRENDI, LA LAMPADA! => valido', async () => {
    const res = await parseCommand(DB, 'PRENDI, LA LAMPADA!');
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.CanonicalNoun).toBe('LAMPADA');
  });

  it('Tolleranza accenti rimossi: GIU (per GIÙ) => NAVIGATION valido', async () => {
    const res = await parseCommand(DB, 'GIU');
    // Potrebbe essere NAVIGATION con canonico "BASSO"/"GIÙ" a seconda dell’ordinamento; verifichiamo solo il tipo
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('NAVIGATION');
  });
});
