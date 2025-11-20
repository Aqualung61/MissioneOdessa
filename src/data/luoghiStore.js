import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function loadLuoghi(dbPath) {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const luoghi = await db.all('SELECT * FROM Luoghi');
  await db.close();
  return luoghi;
}

export async function loadVistaLuoghiOggetti(dbPath) {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const vista = await db.all('SELECT * FROM vista_luoghi_oggetti');
  await db.close();
  return vista;
}
