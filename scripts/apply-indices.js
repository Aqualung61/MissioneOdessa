// Apply DDL indices from ddl/indices_lexicon.sql to the configured DB
// Usage: node scripts/apply-indices.js [dbPath]

import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function main() {
  const dbPath = process.argv[2] || process.env.ODESSA_DB_PATH || './db/odessa.db';
  const ddlPath = path.resolve(process.cwd(), 'ddl', 'indices_lexicon.sql');
  if (!fs.existsSync(ddlPath)) {
    console.error('DDL file not found:', ddlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(ddlPath, 'utf8');
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    await db.exec('BEGIN');
    await db.exec(sql);
    await db.exec('COMMIT');
    console.log('Indices applied successfully to', dbPath);
  } catch (err) {
    await db.exec('ROLLBACK');
    console.error('Failed to apply indices:', err.message);
    process.exit(2);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(2);
});
