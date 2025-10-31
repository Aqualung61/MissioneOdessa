import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const router = express.Router();

// GET /api/lingue - restituisce tutte le lingue
router.get('/', async (req, res) => {
  const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const lingue = await db.all('SELECT * FROM Lingue');
  await db.close();
  res.json(lingue);
});

export default router;
