import { describe, it, expect, beforeAll } from 'vitest';
// Rimosso @ts-expect-error inutilizzato
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import VociLessico from '../src/data-internal/VociLessico.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';

describe('Parser REQ01 - casi base', () => {
  beforeAll(async () => {
    // Carica dati JSON in global.odessaData per simulare initOdessa
    global.odessaData = {
      VociLessico,
      TerminiLessico,
      TipiLessico,
    };
    await ensureVocabulary();
  });

  it('ACTION + NOUN: PRENDI LA LAMPADA => valido', async () => {
    const res = await parseCommand(null, 'PRENDI LA LAMPADA');
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.CanonicalVerb).toBe('PRENDI');
    expect(res.CanonicalNoun).toBe('LAMPADA');
  });

  it('ACTION singolo senza oggetto: DORMI => valido', async () => {
    const res = await parseCommand(null, 'DORMI');
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.CanonicalVerb).toBe('DORMI');
  });

  it('NAVIGATION: N => valido', async () => {
    const res = await parseCommand(null, 'N');
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('NAVIGATION');
  });

  it('Errore sintassi: PRENDI => SYNTAX_ACTION_INCOMPLETE', async () => {
    const res = await parseCommand(null, 'PRENDI');
    expect(res.IsValid).toBe(false);
    expect(res.Error).toBe('SYNTAX_ACTION_INCOMPLETE');
  });

  it('Errore NOUN sconosciuto: PRENDI ZZZ => SYNTAX_NOUN_UNKNOWN', async () => {
    const res = await parseCommand(null, 'PRENDI ZZZ');
    expect(res.IsValid).toBe(false);
    expect(res.Error).toBe('SYNTAX_NOUN_UNKNOWN');
  });

  it('Tolleranza punteggiatura: PRENDI, LA LAMPADA! => valido', async () => {
    const res = await parseCommand(null, 'PRENDI, LA LAMPADA!');
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.CanonicalNoun).toBe('LAMPADA');
  });

  it('Tolleranza accenti rimossi: GIU (per GIÙ) => NAVIGATION valido', async () => {
    const res = await parseCommand(null, 'GIU');
    // Potrebbe essere NAVIGATION con canonico "BASSO"/"GIÙ" a seconda dell’ordinamento; verifichiamo solo il tipo
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('NAVIGATION');
  });
  it('Verbo ACCENDERE: ACCENDI LAMPADA => valido', async () => {
    const res = await parseCommand(null, 'ACCENDI LAMPADA');
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.VerbConcept).toBe('ACCENDERE');
    expect(res.CanonicalNoun).toBe('LAMPADA');
  });

  it('Invalid input: non-stringa => INVALID_INPUT (NOT_A_STRING)', async () => {
    const parse = parseCommand as unknown as (dbPath: unknown, input: unknown) => Promise<{ IsValid: boolean; Error: string; Details?: string | null }>;
    const res = await parse(null, 123);
    expect(res.IsValid).toBe(false);
    expect(res.Error).toBe('INVALID_INPUT');
    expect(res.Details).toBe('NOT_A_STRING');
  });

  it('Invalid input: solo spazi => INVALID_INPUT (EMPTY_INPUT)', async () => {
    const res = await parseCommand(null, '   ');
    expect(res.IsValid).toBe(false);
    expect(res.Error).toBe('INVALID_INPUT');
    expect(res.Details).toBe('EMPTY_INPUT');
  });

  it('Invalid input: control chars => INVALID_INPUT (CONTROL_CHARS)', async () => {
    const res = await parseCommand(null, 'CIAO\u0000');
    expect(res.IsValid).toBe(false);
    expect(res.Error).toBe('INVALID_INPUT');
    expect(res.Details).toBe('CONTROL_CHARS');
  });

  it('Invalid input: >500 chars => INVALID_INPUT (LENGTH_OUT_OF_RANGE)', async () => {
    const res = await parseCommand(null, 'a'.repeat(501));
    expect(res.IsValid).toBe(false);
    expect(res.Error).toBe('INVALID_INPUT');
    expect(res.Details).toBe('LENGTH_OUT_OF_RANGE');
  });
});
