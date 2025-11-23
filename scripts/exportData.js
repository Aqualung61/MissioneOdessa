// Script per esportare i dati dal DB odessa.db in file JSON in src/data-internal
// Comando per eseguire: node scripts/exportData.js
// Dopo modifiche al DB, rieseguire questo script per aggiornare i JSON.

import path from 'path';
import { init_data } from '../db/exportData.js';

const dbPath = process.env.ODESSA_DB_PATH || path.join(process.cwd(), 'db', 'odessa.db');

init_data(dbPath).then(() => {
  console.log('Esportazione dati completata. File JSON generati in src/data-internal');
}).catch(err => {
  console.error('Errore durante l\'esportazione:', err.message);
  process.exit(1);
});