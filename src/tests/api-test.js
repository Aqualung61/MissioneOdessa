// api.js - API REST per i luoghi (Node.js + sqlite)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
app.use(cors());
const PORT = process.env.API_PORT || 3002;
const DB_PATH = process.env.ODESSA_DB_PATH || './db/odessa.db';

let db;

// Avvia connessione DB all'avvio
(async () => {
  db = await open({ filename: DB_PATH, driver: sqlite3.Database });
})();

// Restituisce tutti i luoghi
app.get('/api/luoghi', async (req, res) => {
  const rows = await db.all('SELECT * FROM Luoghi');
  res.json(rows);
});

// Restituisce un luogo per ID
app.get('/api/luoghi/:id', async (req, res) => {
  const luogo = await db.get('SELECT * FROM Luoghi WHERE ID = ?', req.params.id);
  if (!luogo) return res.status(404).json({ error: 'Not found' });
  res.json(luogo);
});

app.listen(PORT, () => {
  console.log(`API server avviato su http://localhost:${PORT}/api/luoghi`);
});
