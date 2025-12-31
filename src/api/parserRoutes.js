import express from 'express';
import { parseCommand, resetVocabularyCache, ensureVocabulary } from '../logic/parser.js';

const router = express.Router();

// POST /api/parser/parse  { input: string }
router.post('/parse', async (req, res) => {
  try {
    const { input } = req.body || {};
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ IsValid: false, Error: 'INVALID_INPUT' });
    }
    // ensureVocabulary ora chiamata automaticamente in parseCommand
    const result = await parseCommand(null, input); // dbPath ignorato
    res.json(result);
  } catch (err) {
    res.status(500).json({ IsValid: false, Error: 'INTERNAL', Message: err.message });
  }
});

export default router;

// Diagnostica: GET /api/parser/stats
// Ritorna conteggi per tipo lessicale e info DB path
router.get('/stats', async (req, res) => {
  try {
    const tipiLessico = global.odessaData.TipiLessico || [];
    const terminiLessico = global.odessaData.TerminiLessico || [];
    const vociLessico = global.odessaData.VociLessico || [];
    
    const byType = tipiLessico.map(t => {
      const termini = terminiLessico.filter(tl => tl.ID_TipoLessico === t.ID_TipoLessico);
      const voci = vociLessico.filter(vl => termini.some(tl => tl.ID_Termine === vl.ID_Termine));
      return {
        Tipo: t.NomeTipo,
        Termini: new Set(termini.map(tl => tl.ID_Termine)).size,
        Voci: voci.length
      };
    });
    
    res.json({ dbPathResolved: 'in-memory (global.odessaData)', byType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ricarica (invalida) la cache del vocabolario
router.post('/reload', async (req, res) => {
  try {
    resetVocabularyCache();
    // opzionalmente pre-carica subito
    await ensureVocabulary();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
