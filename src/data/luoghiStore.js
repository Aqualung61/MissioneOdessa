import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function loadLuoghi(dbPath) {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const luoghi = await db.all('SELECT * FROM Luoghi');
  await db.close();
  return luoghi;
}
