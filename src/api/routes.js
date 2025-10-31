import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
const router = express.Router();

// GET /api/luoghi - restituisce tutti i luoghi
router.get('/luoghi', async (req, res) => {
  const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const luoghi = await db.all('SELECT * FROM Luoghi');
  await db.close();
  res.json(luoghi);
});

// Esempio di endpoint
router.get('/ping', (req, res) => {
  res.json({ pong: true });
});

export default router;
