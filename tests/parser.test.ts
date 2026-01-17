import { describe, it, expect, beforeAll } from 'vitest';
// Rimosso @ts-expect-error inutilizzato
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import VociLessico from '../src/data-internal/VociLessico.json';
import Oggetti from '../src/data-internal/Oggetti.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';

describe('Parser REQ01 - casi base', () => {
  beforeAll(async () => {
    // Carica dati JSON in global.odessaData per simulare initOdessa
    global.odessaData = {
      VociLessico,
      Oggetti,
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

  it('SYSTEM alias: ? => INVENTARIO anche in lingua EN', async () => {
    const res = await parseCommand(null, '?', { currentLingua: 2 });
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('SYSTEM');
    expect(res.CanonicalVerb).toBe('INVENTARIO');
    expect(res.VerbConcept).toBe('INVENTARIO');
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
    expect(res.UnknownNounToken).toBe('ZZZ');
  });

  it('Verbo sconosciuto: ASDF... => COMMAND_UNKNOWN + UnknownToken', async () => {
    const res = await parseCommand(null, 'ASDFGHJKLQWERTY');
    expect(res.IsValid).toBe(false);
    expect(res.Error).toBe('COMMAND_UNKNOWN');
    expect(typeof res.UnknownToken).toBe('string');
    expect(res.UnknownToken?.length).toBeGreaterThan(0);
  });

  it('Struttura non parsabile: N LAMPADA => SYNTAX_INVALID_STRUCTURE', async () => {
    const res = await parseCommand(null, 'N LAMPADA');
    expect(res.IsValid).toBe(false);
    expect(res.Error).toBe('SYNTAX_INVALID_STRUCTURE');
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

  it('EN: EXAMINE EMPTY SHELVES => valido (EMPTY stopword, SHELVES noun)', async () => {
    const res = await parseCommand(null, 'EXAMINE EMPTY SHELVES', { currentLingua: 2 });
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.VerbConcept).toBe('ESAMINARE');
    // NounConcept localizzato su Oggetti.json
    expect(res.NounConcept).toBe('Empty shelves');
  });

  it('EN: EXAMINE LARGE TABLE => valido (NOUN multi-parola)', async () => {
    const res = await parseCommand(null, 'EXAMINE LARGE TABLE', { currentLingua: 2 });
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.VerbConcept).toBe('ESAMINARE');
    expect(res.NounConcept).toBe('Large table');
  });

  it('EN: MOVE TAPESTRY => valido (alias noun)', async () => {
    const res = await parseCommand(null, 'MOVE TAPESTRY', { currentLingua: 2 });
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.VerbConcept).toBe('SPOSTARE');
    // NounConcept localizzato su Oggetti.json tramite il termine di ARAZZO_IN_PESSIME_CONDIZIONI
    expect(res.NounConcept).toBe('Tapestry in terrible condition');
  });

  it('EN: MOVE BATON => valido (alias noun)', async () => {
    const res = await parseCommand(null, 'MOVE BATON', { currentLingua: 2 });
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.VerbConcept).toBe('SPOSTARE');
    expect(res.NounConcept).toBe('Command baton');
  });

  it('EN: EXAMINE TROPHIES => valido (alias noun)', async () => {
    const res = await parseCommand(null, 'EXAMINE TROPHIES', { currentLingua: 2 });
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.VerbConcept).toBe('ESAMINARE');
    expect(res.NounConcept).toBe('Trophies on the walls');
  });

  it('EN: OPEN COMPARTMENT => valido (alias noun)', async () => {
    const res = await parseCommand(null, 'OPEN COMPARTMENT', { currentLingua: 2 });
    expect(res.IsValid).toBe(true);
    expect(res.CommandType).toBe('ACTION');
    expect(res.VerbConcept).toBe('APRIRE');
    expect(res.NounConcept).toBe('Secret compartment');
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
