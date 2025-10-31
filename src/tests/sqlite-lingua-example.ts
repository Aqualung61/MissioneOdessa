
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function main() {
  // Connessione al database SQLite usando la variabile d'ambiente
  const dbPath = process.env.ODESSA_DB_PATH;
  if (!dbPath) {
    throw new Error('ODESSA_DB_PATH non impostato nelle variabili d\'ambiente');
  }
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Esempio: stampa tutte le righe della tabella Lingue
  const rows = await db.all('SELECT * FROM Lingue');
  console.log('Lingue:', rows);

  // Chiudi la connessione
  await db.close();
}

main().catch((err) => {
  console.error('Errore durante la lettura del DB:', err);
});
