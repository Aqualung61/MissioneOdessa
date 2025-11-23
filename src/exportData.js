// src/exportData.js
// Funzione per esportare i dati dal DB odessa.db in file JSON nella directory /data

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function init_data(dbPath) {
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

        let completed = 0;
        const total = tables.length;

        if (total === 0) {
          resolve();
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
            const filePath = path.join(__dirname, 'data-internal', `${tableName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
            completed++;
            if (completed === total) {
              resolve();
              db.close();
            }
          });
        });
      });
    });
  });
}