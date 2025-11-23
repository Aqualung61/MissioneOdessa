import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const router = express.Router();

// GET /api/lingue - restituisce tutte le lingue
router.get('/', async (req, res) => {
  res.json(global.odessaData.Lingue || []);
});

export default router;
