// src/initOdessa.js
// Funzione per caricare tutto il DB odessa.db in memoria come strutture dati

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initOdessa(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Ottieni lista tabelle
      db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
        if (err) {
          reject(err);
          return;
        }

        const odessaData = {};
        let completed = 0;
        const total = tables.length;

        if (total === 0) {
          global.odessaData = odessaData;
          resolve(odessaData);
          db.close();
          return;
        }

        tables.forEach(table => {
          const tableName = table.name;
          db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            odessaData[tableName] = rows;
            completed++;
            if (completed === total) {
              global.odessaData = odessaData;
              resolve(odessaData);
              db.close();
            }
          });
        });
      });
    });
  });
}