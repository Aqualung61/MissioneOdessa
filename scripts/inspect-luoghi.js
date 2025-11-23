// Prints schema for Luoghi table from db/odessa.db (ESM)
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function run() {
  try {
    const db = await open({ filename: 'db/odessa.db', driver: sqlite3.Database });
    const cols = await db.all("PRAGMA table_info('Luoghi')");
    const fks = await db.all("PRAGMA foreign_key_list('Luoghi')");
    console.log(JSON.stringify({ cols, fks }, null, 2));
    await db.close();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();