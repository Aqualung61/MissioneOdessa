import path from 'path';
import { init_data } from '../src/exportData.js';

const dbPath = process.env.ODESSA_DB_PATH || path.join(process.cwd(), 'db', 'odessa.db');

init_data(dbPath).then(() => {
  console.log('Esportazione dati completata. File JSON generati in src/data-internal');
}).catch(err => {
  console.error('Errore durante l\'esportazione:', err.message);
  process.exit(1);
});