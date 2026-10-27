// src/initOdessa.js
// Funzione per caricare i dati dai file JSON in src/data-internal in memoria come strutture dati

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lista delle tabelle (corrispondenti ai file JSON)
// 'Azioni' non è più una tabella (sostituita da SBLOCCA_DIREZIONE in Interazioni)
const tableNames = [
  'Interazioni',
  'Introduzione',
  'Storia',
  'LessicoSoftware',
  'Lingue',
  'Luoghi',
  'LuoghiLogici',
  'MessaggiFrontend',
  'MessaggiSistema',
  'Oggetti',
  'Piattaforme',
  'Software',
  'TerminiLessico',
  'TipiLessico',
  'VociLessico',
];

/**
 * Legge tutte le tabelle JSON di `src/data-internal/` e le pubblica in `global.odessaData`.
 * Tutto o niente: se una tabella manca o non è leggibile lancia un errore e non pubblica nulla.
 * @returns {Promise<Object>} le tabelle, per nome
 */
export async function initOdessa() {
  const odessaData = {};
  const failures = [];

  for (const tableName of tableNames) {
    const filePath = path.join(__dirname, 'data-internal', `${tableName}.json`);
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      odessaData[tableName] = JSON.parse(data);
    } catch (err) {
      console.error(`Errore nel caricamento ${tableName}:`, err.message);
      failures.push(`${tableName}.json (${err.message})`);
    }
  }

  // Tutto o niente: con tabelle mancanti il gioco non deve partire con dati incompleti.
  if (failures.length > 0) {
    throw new Error(`Impossibile caricare le tabelle obbligatorie: ${failures.join('; ')}`);
  }

  global.odessaData = odessaData;
  return odessaData;
}
