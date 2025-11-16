import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { runE2ETests } from '../tests/runE2E.js';
import { azioni_setup } from './azioni_lib.js';

const router = express.Router();
// GET /api/introduzione - restituisce il testo markdown della presentazione
router.get('/introduzione', async (req, res) => {
  const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const row = await db.get('SELECT Testo FROM Introduzione WHERE ID = 1 AND IDLingua = 1');
  await db.close();
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
  const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const luoghi = await db.all(`
    SELECT Luoghi.*, Luoghi_immagine.Immagine, Luoghi.Terminale
    FROM Luoghi
    LEFT JOIN Luoghi_immagine ON Luoghi.ID = Luoghi_immagine.ID_Luoghi
  `);
  await db.close();
  res.json(luoghi);
});

// GET /api/azioni - gestisce azioni_setup
router.get('/azioni', azioni_setup);

// Esempio di endpoint
router.get('/ping', (req, res) => {
  res.json({ pong: true });
});

export default router;
