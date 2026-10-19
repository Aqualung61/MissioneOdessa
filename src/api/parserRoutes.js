import express from 'express';
import { resetVocabularyCache, ensureVocabulary } from '../logic/parser.js';

const router = express.Router();

function notInProduction(req, res, next) {
  if (process.env.NODE_ENV === 'production') return next('router');
  return next();
}

// Diagnostica: GET /api/parser/stats
// Ritorna conteggi per tipo lessicale e info DB path
router.get('/stats', notInProduction, async (req, res, next) => {
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
    
    res.json({ byType });
  } catch (err) {
    return next(err);
  }
});

// Ricarica (invalida) la cache del vocabolario
router.post('/reload', notInProduction, async (req, res, next) => {
  try {
    resetVocabularyCache();
    // opzionalmente pre-carica subito
    await ensureVocabulary();
    res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
