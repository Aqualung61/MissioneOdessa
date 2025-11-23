import { describe, it, expect, beforeAll } from 'vitest';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import VociLessico from '../src/data-internal/VociLessico.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';

// Verbi che non richiedono oggetto
const NO_OBJECT = new Set(['DORMI','SCAPPA','SORRIDI']);

describe('Copertura verbi azione REQ01', () => {
  beforeAll(async () => {
    // Carica dati JSON in global.odessaData per simulare initOdessa
    global.odessaData = {
      VociLessico,
      TerminiLessico,
      TipiLessico,
    };
    await ensureVocabulary();
  });

  it('Verbi azione presenti sono riconosciuti', async () => {
    // Ottieni i verbi ACTION dal vocabolario
    const vocab = await ensureVocabulary();
    const { tokenMap } = vocab;
    const actionVerbs = new Set();
    for (const [token, info] of tokenMap) {
      if (info.type === 'ACTION') {
        actionVerbs.add(token);
      }
    }
    const presentVerbs = Array.from(actionVerbs);
    
    for (const v of presentVerbs) {
      const res = await parseCommand(null, v);
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
