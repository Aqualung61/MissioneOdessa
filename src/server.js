// src/server.js
// Entry point: avvio server Express, carica dati in memoria e monta API/statico


import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import apiRoutes from './api/routes.js';
import linguaRoutes from './api/linguaRoutes.js';
import parserRoutes from './api/parserRoutes.js';
import engineRoutes from './api/engineRoutes.js';
import { initOdessa } from './initOdessa.js';
import { resetGameState, initializeOriginalData } from './logic/engine.js';
import { loadMessaggiSistema } from './logic/systemMessages.js';
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
const BASE_PATH = process.env.BASE_PATH || '';
console.log(`Base path: ${BASE_PATH || 'root'}`);

// Carica tutto il DB in memoria
try {
  await initOdessa();
  console.log('Dati caricati in memoria con tabelle:', Object.keys(global.odessaData).join(', '));
  // Salva copia immutabile dei dati originali
  initializeOriginalData();
  // Inizializza gameState con log per Step 1
  resetGameState();
} catch (err) {
  console.error('Errore nel caricamento dati in memoria:', err.message);
  process.exit(1); // Esci se non riesci a caricare
}


// API: versione applicazione
app.get(BASE_PATH + '/api/version', (req, res) => {
  res.json({ version });
});

// API: init_odessa per test
app.get(BASE_PATH + '/init_odessa', async (req, res) => {
  try {
    await initOdessa();
    const tables = Object.keys(global.odessaData);
    const counts = {};
    tables.forEach(table => {
      counts[table] = global.odessaData[table].length;
    });
    res.json({ tables, counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
app.use(express.json());

// API (devono venire PRIMA dello statico!)
app.use(BASE_PATH + '/api', apiRoutes);
app.use(BASE_PATH + '/api/lingue', linguaRoutes);
app.use(BASE_PATH + '/api/parser', parserRoutes);
app.use(BASE_PATH + '/api/engine', engineRoutes);

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

const server = app.listen(PORT, async () => {
  console.log(`Server unico avviato su http://localhost:${PORT}/`);
  // Carica messaggi di sistema dopo l'inizializzazione dei dati
  await initOdessa();
  loadMessaggiSistema();
});
