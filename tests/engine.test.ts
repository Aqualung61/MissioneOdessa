import { describe, it, expect } from 'vitest';
import { toCommandDTO, executeCommand } from '../src/logic/engine.js';

const baseParse = {
  IsValid: true,
  OriginalInput: '',
  NormalizedInput: '',
  CommandType: 'ACTION',
  CanonicalVerb: 'PRENDI',
  CanonicalNoun: 'LAMPADA',
  NounIndex: null,
  VerbTermId: 21,
  VerbConcept: 'PREMERE',
  NounTermId: 101,
  NounConcept: 'LAMPADA',
  Error: 'NONE',
};

describe('Engine stub', () => {
  it('toCommandDTO mappa i campi principali', () => {
    const dto = toCommandDTO(baseParse);
    expect(dto?.type).toBe('ACTION');
    expect(dto?.verb?.canonical).toBe('PRENDI');
    expect(dto?.noun?.canonical).toBe('LAMPADA');
  });

  it('executeCommand ritorna OK per ACTION', () => {
    const res = executeCommand(baseParse);
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('OK');
  });

  it('executeCommand ritorna ERROR per parse non valido', () => {
    const bad = { ...baseParse, IsValid: false, Error: 'COMMAND_UNKNOWN' };
    const res = executeCommand(bad);
    expect(res.accepted).toBe(false);
    expect(res.resultType).toBe('ERROR');
  });

  it('SYSTEM: INVENTARIO/COSA/? restituiscono messaggio coerente', () => {
    const make = (canonical: string, concept: string) => ({
      ...baseParse,
      IsValid: true,
      CommandType: 'SYSTEM',
      CanonicalVerb: canonical,
      VerbConcept: concept,
      CanonicalNoun: null,
    });
    for (const [canon, concept] of [
      ['INVENTARIO', 'INVENTARIO'],
      ['COSA', 'INVENTARIO'],
      ['?', 'INVENTARIO'],
    ]) {
      const res = executeCommand(make(canon, concept));
      expect(res.accepted).toBe(true);
      expect(res.resultType).toBe('OK');
      expect(typeof res.message).toBe('string');
      expect(res.message.length).toBeGreaterThan(0);
    }
  });

  it('gestisce NAVIGATION con solo verbo canonico', () => {
    const navParse = {
      ...baseParse,
      CommandType: 'NAVIGATION',
      CanonicalVerb: 'NORD',
      CanonicalNoun: null,
      NounIndex: null,
    };
    const dto = toCommandDTO(navParse);
    expect(dto?.type).toBe('NAVIGATION');
    expect(dto?.verb?.canonical).toBe('NORD');
    expect(dto?.noun).toBeNull();

    const res = executeCommand(navParse);
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('OK');
  });
});
