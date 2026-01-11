// src/initOdessa.js
// Funzione per caricare i dati dai file JSON in src/data-internal in memoria come strutture dati

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lista delle tabelle (corrispondenti ai file JSON)
// DEPRECATED 2025-12-31: 'Azioni' rimosso (sostituito da SBLOCCA_DIREZIONE in Interazioni)
const tableNames = ['Interazioni', 'Introduzione', 'Storia', 'LessicoSoftware', 'Lingue', 'Luoghi', 'LuoghiLogici', 'MessaggiFrontend', 'MessaggiSistema', 'Oggetti', 'Piattaforme', 'Software', 'TerminiLessico', 'TipiLessico', 'VociLessico'];

export async function initOdessa() {
  const odessaData = {};

  for (const tableName of tableNames) {
    const filePath = path.join(__dirname, 'data-internal', `${tableName}.json`);
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      odessaData[tableName] = JSON.parse(data);
      if (tableName === 'Luoghi') {
        const luogo59 = odessaData[tableName].find(l => l.ID === 59);
        console.log(`[initOdessa] Luoghi.json caricato da: ${filePath}`);
        console.log(`[initOdessa] Luogo 59 Est dal file:`, luogo59?.Est);
      }
    } catch (err) {
      console.error(`Errore nel caricamento ${tableName}:`, err.message);
      // Continua con le altre tabelle
    }
  }

  global.odessaData = odessaData;
  return odessaData;
}