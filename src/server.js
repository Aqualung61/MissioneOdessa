// src/server.js
// Entry point: avvio server Express, carica dati in memoria e monta API/statico


import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { loadLuoghi, loadVistaLuoghiOggetti } from './data/luoghiStore.js';
import apiRoutes from './api/routes.js';
import linguaRoutes from './api/linguaRoutes.js';
import parserRoutes from './api/parserRoutes.js';
import engineRoutes from './api/engineRoutes.js';
// import { azioni_setup } from './azioni_setup';

// Definizione __filename e __dirname per ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Leggi versione da package.json
const { version } = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json')));
console.log(`Missione Odessa - Versione: ${version}`);

// ...existing code...

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      fontSrc: ["'self'", "data:", "http://localhost:3001"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.ODESSA_DB_PATH || './db/Odessa.db';
const BASE_PATH = process.env.BASE_PATH || '';
console.log(`DB in uso: ${path.resolve(DB_PATH)}`);
console.log(`Base path: ${BASE_PATH || 'root'}`);

// API: versione applicazione
app.get(BASE_PATH + '/api/version', (req, res) => {
  res.json({ version });
});

// Redirect root to BASE_PATH if BASE_PATH is set
if (BASE_PATH) {
  app.get('/', (req, res) => {
    res.redirect(BASE_PATH + '/');
  });
}


// Serve statico dalla root del progetto
const ROOT = path.resolve(__dirname, '..');
app.use(cors());

// Carica dati in memoria all'avvio
let luoghi = [];
try {
  luoghi = await loadLuoghi(DB_PATH);
} catch (err) {
  console.error('Errore nel caricamento luoghi:', err.message);
}
let vistaLuoghiOggetti = [];
try {
  vistaLuoghiOggetti = await loadVistaLuoghiOggetti(DB_PATH);
} catch (err) {
  console.error('Errore nel caricamento vista_luoghi_oggetti:', err.message);
}

// API (devono venire PRIMA dello statico!)
app.use(BASE_PATH + '/api', apiRoutes);
app.use(BASE_PATH + '/api/lingue', linguaRoutes);
app.use(BASE_PATH + '/api/parser', parserRoutes);
app.use(BASE_PATH + '/api/engine', engineRoutes);

// Endpoint per vista luoghi-oggetti
app.get(BASE_PATH + '/api/vista-luoghi-oggetti', (req, res) => {
  res.json(vistaLuoghiOggetti);
});

// Endpoint per oggetti in un luogo specifico
app.get(BASE_PATH + '/api/luogo-oggetti', (req, res) => {
  const { idLuogo, idLingua } = req.query;
  if (!idLuogo || !idLingua) {
    return res.status(400).json({ error: 'Parametri idLuogo e idLingua richiesti' });
  }
  const oggetti = vistaLuoghiOggetti
    .filter(item => item.IDLuogo == idLuogo && item.IDLingua == idLingua)
    .map(item => ({ descrizione: item.DescrizioneOggetto }));
  res.json(oggetti);
});

// Endpoint di spegnimento "graceful" per pipeline/test (solo in ambiente di test)
if (process.env.NODE_ENV === 'test') {
  app.post(BASE_PATH + '/api/shutdown', async (req, res) => {
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
app.use(BASE_PATH, express.static(ROOT));

// Catch-all per SPA (deve essere l'ULTIMO!)
app.use(BASE_PATH, (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Server unico avviato su http://localhost:${PORT}/`);
});
