import { describe, it, expect, beforeAll } from 'vitest';
// Rimosso @ts-expect-error inutilizzato
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import VociLessico from '../src/data-internal/VociLessico.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';

describe('Sinonimi di Sistema e Navigazione (REQ01 1.2.2, 1.2.3)', () => {
  beforeAll(async () => {
    // Carica dati JSON in global.odessaData per simulare initOdessa
    global.odessaData = {
      VociLessico,
      TerminiLessico,
      TipiLessico,
    };
    await ensureVocabulary();
  });

  it('INVENTARIO: ?, COSA, INVENTARIO => SYSTEM', async () => {
    for (const s of ['?', 'COSA', 'INVENTARIO']) {
      const res = await parseCommand(null, s);
      expect(res.IsValid).toBe(true);
      expect(res.CommandType).toBe('SYSTEM');
    }
  });

  it('SALVA/SAVE => SYSTEM', async () => {
    for (const s of ['SALVA', 'SAVE']) {
      const res = await parseCommand(null, s);
      expect(res.IsValid).toBe(true);
      expect(res.CommandType).toBe('SYSTEM');
    }
  });

  it('CARICA/LOAD => SYSTEM', async () => {
    for (const s of ['CARICA', 'LOAD']) {
      const res = await parseCommand(null, s);
      expect(res.IsValid).toBe(true);
      expect(res.CommandType).toBe('SYSTEM');
    }
  });

  it('SU/SALI/ALTO => NAVIGATION', async () => {
    const cases: [string, string][] = [
      ['SU', 'ALTO'],
      ['SALI', 'ALTO'],
      ['ALTO', 'ALTO'],
    ];
    for (const [s, canon] of cases) {
      const res = await parseCommand(null, s);
      expect(res.IsValid).toBe(true);
      expect(res.CommandType).toBe('NAVIGATION');
      expect(res.CanonicalVerb).toBe(canon);
    }
  });

  it('GIU/SCENDI/BASSO => NAVIGATION', async () => {
    const cases: [string, string][] = [
      ['GIU', 'BASSO'],
      ['SCENDI', 'BASSO'],
      ['BASSO', 'BASSO'],
    ];
    for (const [s, canon] of cases) {
      const res = await parseCommand(null, s);
      expect(res.IsValid).toBe(true);
      expect(res.CommandType).toBe('NAVIGATION');
      expect(res.CanonicalVerb).toBe(canon);
    }
  });

  it('N/E/O dai singoli caratteri => canonici NORD/EST/OVEST', async () => {
    const cases: [string, string][] = [
      ['N', 'NORD'],
      ['E', 'EST'],
      ['O', 'OVEST'],
    ];
    for (const [s, canon] of cases) {
      const res = await parseCommand(null, s);
      expect(res.IsValid).toBe(true);
      expect(res.CommandType).toBe('NAVIGATION');
      expect(res.CanonicalVerb).toBe(canon);
    }
  });
});
