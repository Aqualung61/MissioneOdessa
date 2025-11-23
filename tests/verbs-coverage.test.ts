import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';

const DB = path.resolve(process.cwd(), 'db', 'odessa.db');

// Elenco verbi REQ01 (33 voci effettive nell'allegato)
const ALL_VERBS = [
  'ACCENDI','APRI','ATTACCA','CHIUDI','COLPISCI','DAI','DORMI','ESAMINA','GIRA','GUARDA','INFILA','INTRODUCI',
  'LASCIA','LEGGI','MUOVI','OSSERVA','PICCHIA','PIGIA','PORGI','POSA','PREMI','PRENDI','RISPONDI','RUOTA',
  'SCAPPA','SCARICA','SCAVA','SCHIACCIA','SIEDITI','SORRIDI','SPEGNI','SPOSTA','UCCIDI'
] as const;

const NO_OBJECT = new Set(['DORMI','SCAPPA','SORRIDI']);

describe('Copertura verbi azione REQ01', () => {
  beforeAll(async () => {
    await ensureVocabulary(DB);
  });

  it('Tutti i verbi sono riconosciuti', async () => {
    for (const v of ALL_VERBS) {
      const res = await parseCommand(DB, v);
      if (NO_OBJECT.has(v)) {
        expect(res.IsValid).toBe(true);
        expect(res.CommandType).toBe('ACTION');
        expect(res.CanonicalVerb).toBeDefined();
      } else {
        // Verbo riconosciuto ma senza oggetto -> sintassi incompleta
        expect(res.IsValid).toBe(false);
        expect(res.Error).toBe('SYNTAX_ACTION_INCOMPLETE');
      }
    }
  });
});
