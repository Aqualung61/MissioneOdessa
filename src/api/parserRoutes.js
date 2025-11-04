import express from 'express';
import { parseCommand, ensureVocabulary, resetVocabularyCache } from '../logic/parser.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const router = express.Router();

// POST /api/parser/parse  { input: string }
router.post('/parse', async (req, res) => {
  try {
    const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
    const inputChunks = [];
    req.on('data', (chunk) => inputChunks.push(chunk));
    req.on('end', async () => {
      let input = '';
      try {
        const body = inputChunks.length ? JSON.parse(Buffer.concat(inputChunks).toString('utf8')) : {};
        input = (body?.input || '').toString();
      } catch {
        input = '';
      }
      await ensureVocabulary(dbPath); // pre-carica se non già in cache
      const result = await parseCommand(dbPath, input);
      res.json(result);
    });
  } catch (err) {
    res.status(500).json({ IsValid: false, Error: 'INTERNAL', Message: err.message });
  }
});

export default router;

// Diagnostica: GET /api/parser/stats
// Ritorna conteggi per tipo lessicale e info DB path
router.get('/stats', async (req, res) => {
  try {
    const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    const byType = await db.all(
      `SELECT t.NomeTipo AS Tipo, COUNT(DISTINCT tl.ID) AS Termini, COUNT(vl.ID) AS Voci
       FROM TipiLessico t
       LEFT JOIN TerminiLessico tl ON tl.TipoID = t.ID
       LEFT JOIN VociLessico vl ON vl.TermineID = tl.ID AND vl.LinguaID = 1
       GROUP BY t.NomeTipo`
    );
    await db.close();
    res.json({ dbPathResolved: dbPath, byType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ricarica (invalida) la cache del vocabolario
router.post('/reload', async (req, res) => {
  try {
    resetVocabularyCache();
    // opzionalmente pre-carica subito
    const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
    await ensureVocabulary(dbPath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
