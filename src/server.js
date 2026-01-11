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
import { registerApiConfigRoutes } from './api/configRoute.js';
import { initOdessa } from './initOdessa.js';
import { resetGameState, initializeOriginalData } from './logic/engine.js';
import { loadMessaggiSistema } from './logic/systemMessages.js';
import { apiKeyAuth } from './middleware/auth.js';
import { apiLimiter, parsingLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
// import { azioni_setup } from './azioni_setup';

// Definizione __filename e __dirname per ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Leggi versione da package.json
const { version } = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json')));
console.log(`Missione Odessa - Versione: ${version}`);

// ...existing code...

const app = express();
// Se dietro reverse proxy (hosting), abilita trust proxy per IP reale.
if (process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      fontSrc: ["'self'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      imgSrc: ["'self'", "data:", "blob:"],
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
  // Carica messaggi di sistema dopo l'inizializzazione dei dati
  loadMessaggiSistema();
} catch (err) {
  console.error('Errore nel caricamento dati in memoria:', err.message);
  process.exit(1); // Esci se non riesci a caricare
}


// API: versione applicazione
app.get(BASE_PATH + '/api/version', apiLimiter, (req, res) => {
  res.json({ version });
});

// API: config (espone BASE_PATH al client)
registerApiConfigRoutes(app, { basePath: BASE_PATH, limiter: apiLimiter });

// API: init_odessa per test
app.get(BASE_PATH + '/init_odessa', async (req, res, next) => {
  try {
    await initOdessa();
    const tables = Object.keys(global.odessaData);
    const counts = {};
    tables.forEach(table => {
      counts[table] = global.odessaData[table].length;
    });
    res.json({ tables, counts });
  } catch (err) {
    return next(err);
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
// M3: CORS
// Se web app e API sono sullo stesso origin, CORS non è necessario.
// Abilita cross-origin solo se esplicitamente richiesto via whitelist.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (allowedOrigins.length > 0) {
  app.use(cors({
    origin: (origin, callback) => {
      // origin può essere undefined per richieste non-browser (curl/server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
  }));
}
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '1mb';
app.use(express.json({ limit: JSON_BODY_LIMIT, strict: true }));

// Gestione 413 / payload troppo grande
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    res.set('Cache-Control', 'no-store');
    return res.status(413).json({ ok: false, error: 'PAYLOAD_TOO_LARGE' });
  }
  return next(err);
});

// Auth (API key) per tutte le API sotto /api/*.
// Nota: /api/version e /api/config restano pubbliche perché definite prima.
app.use(BASE_PATH + '/api', apiKeyAuth());

// Rate limiting: generale su /api/* + più stretto su endpoint pesanti
app.use(BASE_PATH + '/api', apiLimiter);
app.use(BASE_PATH + '/api/parser/parse', parsingLimiter);
app.use(BASE_PATH + '/api/engine/execute', parsingLimiter);

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

// Catch-all per SPA (ultimo middleware "non-error").
app.use(BASE_PATH, (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

// M4: Error handler globale (sanitizza errori in produzione)
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server unico avviato su http://localhost:${PORT}/`);
});
