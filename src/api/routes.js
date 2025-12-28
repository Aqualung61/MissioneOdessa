import express from 'express';
import { runE2ETests } from '../tests/runE2E.js';
import { azioni_setup, azioni_modi } from './azioni_lib.js';
import { getOggetti } from '../logic/engine.js';

const router = express.Router();

// GET /api/introduzione - restituisce il testo markdown della presentazione
router.get('/introduzione', async (req, res) => {
  const id = parseInt(req.query.id, 10) || 1;
  const lingua = parseInt(req.query.lingua, 10) || 1;
  const introduzioni = global.odessaData.Introduzione || [];
  const row = introduzioni.find(intro => intro.ID == id && intro.IDLingua == lingua);
  res.json({ testo: row?.Testo || '' });
});

// POST /api/run-tests - esegue la suite e2e Playwright e restituisce il report
router.post('/run-tests', async (req, res) => {
  try {
    const suite = (req.query?.suite || '').toString() || 'full';
    const result = await runE2ETests({ suite });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/luoghi - restituisce tutti i luoghi
router.get('/luoghi', async (req, res) => {
  const luoghi = global.odessaData.Luoghi || [];
  const luoghiImmagini = global.odessaData.Luoghi_immagine || [];
  const luoghiConImmagini = luoghi.map(luogo => {
    const immagine = luoghiImmagini.find(img => img.ID_luoghi == luogo.ID);
    return { ...luogo, Immagine: immagine?.Immagine || null };
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
    .filter(item => item.IDLuogo == idLuogo && item.IDLingua == idLingua && (item.Attivo === 1 || item.Attivo >= 3));
  const oggetti = filtered
    .map(item => {
      return { descrizione: item.Oggetto || '' };
    });
  res.json(oggetti);
});

// GET /api/azioni - gestisce azioni_setup
router.get('/azioni', azioni_setup);

// GET /api/azioni-modi - gestisce azioni_modi
router.get('/azioni-modi', azioni_modi);

// Esempio di endpoint
router.get('/ping', (req, res) => {
  res.json({ pong: true });
});

export default router;
