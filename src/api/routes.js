import express from 'express';
import { getOggetti } from '../logic/engine.js';

const router = express.Router();

// GET /api/frontend-messages/:lingua - restituisce messaggi UI localizzati
router.get('/frontend-messages/:lingua', async (req, res, next) => {
  try {
    const lingua = parseInt(req.params.lingua, 10);
    if (!lingua || (lingua !== 1 && lingua !== 2)) {
      return res.status(400).json({ ok: false, error: 'Lingua non valida (1=IT, 2=EN)' });
    }
    const messaggiFrontend = global.odessaData.MessaggiFrontend || [];
    const filtered = messaggiFrontend.filter(m => m.IDLingua === lingua);
    res.json({ ok: true, messages: filtered, count: filtered.length });
  } catch (err) {
    // Delegare al middleware globale per evitare leak in produzione
    return next(err);
  }
});

// GET /api/introduzione - restituisce il testo markdown della presentazione
router.get('/introduzione', async (req, res) => {
  const id = parseInt(req.query.id, 10) || 1;
  const lingua = parseInt(req.query.lingua, 10) || 1;
  const introduzioni = global.odessaData.Introduzione || [];
  const row = introduzioni.find(intro => intro.ID == id && intro.IDLingua == lingua);
  res.json({ testo: row?.Testo || '' });
});

// GET /api/storia - restituisce testi markdown e label localizzata per la pagina storia
router.get('/storia', async (req, res) => {
  const id = parseInt(req.query.id, 10) || 1;
  const lingua = parseInt(req.query.lingua, 10) || 1;
  const storie = global.odessaData.Storia || [];
  const row = storie.find(storia => storia.ID == id && storia.IDLingua == lingua);
  res.json({
    testo1: row?.Testo1 || '',
    testo2: row?.Testo2 || '',
    labelLinks: row?.LabelLinks || '',
    labelDocumenti: row?.LabelDocumenti || '',
    autoreLine: row?.AutoreLine || '',
    genereLine: row?.GenereLine || '',
    piattaformaLine: row?.PiattaformaLine || '',
  });
});

// GET /api/luoghi - restituisce tutti i luoghi
router.get('/luoghi', async (req, res) => {
  const luoghi = global.odessaData.Luoghi || [];
  const luoghiLogici = global.odessaData.LuoghiLogici || [];
  const luoghiConImmagini = luoghi.map(luogo => {
    const luogoLogico = luoghiLogici.find(ll => ll.ID_LuogoLogico == luogo.ID_LuogoLogico);
    return { 
      ...luogo, 
      Immagine: luogoLogico?.Immagine || null,
      Buio: luogoLogico?.Buio || 0
    };
  });
  res.json(luoghiConImmagini);
});

// GET /api/luogo-oggetti - restituisce gli oggetti in un luogo specifico
router.get('/luogo-oggetti', async (req, res) => {
  const { idLuogo, idLingua } = req.query;
  if (!idLuogo || !idLingua) {
    return res.status(400).json({ error: 'Parametri idLuogo e idLingua richiesti' });
  }
  const data = getOggetti();
  const filtered = data
    .filter(item => item.IDLuogo == idLuogo && item.IDLingua == idLingua && item.Attivo >= 1);
  const oggetti = filtered
    .map(item => {
      return { descrizione: item.Oggetto || '' };
    });
  res.json(oggetti);
});

// Esempio di endpoint
router.get('/ping', (req, res) => {
  res.json({ pong: true });
});

export default router;
