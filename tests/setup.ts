// tests/setup.ts
// Inizializza global.odessaData per i test, caricando i dati dai file JSON come nel server

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lista delle tabelle (corrispondenti ai file JSON)
// DEPRECATED 2025-12-31: 'Azioni' rimosso da tableNames (sistema sostituito da SBLOCCA_DIREZIONE)
const tableNames = ['Introduzione', 'LessicoSoftware', 'Lingue', 'Luoghi', 'Luoghi_immagine', 'Oggetti', 'Piattaforme', 'Software', 'TerminiLessico', 'TipiLessico', 'VociLessico'];

const odessaData = {};

for (const tableName of tableNames) {
  const filePath = path.join(__dirname, '..', 'src', 'data-internal', `${tableName}.json`);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    odessaData[tableName] = JSON.parse(data);
  } catch (err) {
    console.error(`Errore nel caricamento ${tableName} in setup test:`, err.message);
    // Continua con le altre tabelle
  }
}

global.odessaData = odessaData;
