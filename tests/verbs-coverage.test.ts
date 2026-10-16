import { describe, it, expect, beforeAll } from 'vitest';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import VociLessico from '../src/data-internal/VociLessico.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';

// Aggiornato per #109 (lotto L1): l'insieme dei verbi ammessi senza oggetto è basato
// sul concetto (valido per ogni sinonimo e in ogni lingua), come il parser
// (TD Lessico L1 sinonimi, §4), non su un elenco di forme italiane.
// Aggiornato per #109 (lotto L2b): aggiunti i verbi di §5.2 ammessi senza oggetto
// (TD Lessico L2 risposte e testi, §5.2).
const NO_OBJECT_CONCEPTS = new Set([
  'DORMIRE', 'ESAMINARE', 'GUARDARE', 'SCAVARE', 'ACCENDERE',
  'SPEGNERE', 'SCAPPARE', 'SORRIDERE', 'SEDERSI', 'PARLARE',
]);

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
    const actionVerbs = new Map();
    for (const [token, info] of tokenMap) {
      if (info.type === 'ACTION') {
        actionVerbs.set(token, info.concept);
      }
    }

    for (const [v, concept] of actionVerbs) {
      const res = await parseCommand(null, v);
      if (NO_OBJECT_CONCEPTS.has(concept)) {
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
