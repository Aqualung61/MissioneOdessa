// src/server.js
// Entry point: avvio server Express, carica dati in memoria e monta API/statico


import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { loadLuoghi } from './data/luoghiStore.js';
import apiRoutes from './api/routes.js';
import linguaRoutes from './api/linguaRoutes.js';
import parserRoutes from './api/parserRoutes.js';
import engineRoutes from './api/engineRoutes.js';

// Definizione __filename e __dirname per ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Leggi versione da package.json
const { version } = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json')));
console.log(`Missione Odessa - Versione: ${version}`);

// ...existing code...

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.ODESSA_DB_PATH || './db/Odessa.db';
console.log(`DB in uso: ${path.resolve(DB_PATH)}`);

// API: versione applicazione
app.get('/api/version', (req, res) => {
  res.json({ version });
});


// Serve statico dalla root del progetto
const ROOT = path.resolve(__dirname, '..');
app.use(cors());

// Carica dati in memoria all'avvio
await loadLuoghi(DB_PATH);

// API (devono venire PRIMA dello statico!)
app.use('/api', apiRoutes);
app.use('/api/lingue', linguaRoutes);
app.use('/api/parser', parserRoutes);
app.use('/api/engine', engineRoutes);

// Endpoint di spegnimento "graceful" per pipeline/test (solo in ambiente di test)
if (process.env.NODE_ENV === 'test') {
  app.post('/api/shutdown', async (req, res) => {
    try {
      res.json({ ok: true });
    } catch {
      // In contesto test può fallire l'invio risposta: prosegui comunque allo shutdown
      ;
    }
    // Chiudi il server con un piccolo delay per dare tempo alla risposta di partire
    setTimeout(() => {
      server.close(() => {
        process.exit(0);
      });
    }, 50);
  });
}

// Statico dopo le API
app.use(express.static(ROOT));

// Catch-all per SPA (deve essere l'ULTIMO!)
app.use((req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Server unico avviato su http://localhost:${PORT}/`);
});
