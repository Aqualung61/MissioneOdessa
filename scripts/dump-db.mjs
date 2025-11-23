#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  // Dates and Buffers
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`;
  // Default string escaping
  const s = String(value).replace(/'/g, "''");
  return `'${s}'`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const dbPath = path.resolve(__dirname, '..', 'db', 'odessa.db');
  if (!fs.existsSync(dbPath)) {
    console.error(`Database non trovato: ${dbPath}`);
    process.exit(1);
  }

  const db = await open({ filename: dbPath, driver: sqlite3.Database });

  // Output folder: scrivi direttamente in ddl/
  const now = new Date();
  const outDir = path.resolve(__dirname, '..', 'ddl');
  ensureDir(outDir);

  const schemaFile = path.join(outDir, '01_schema_from_db.sql');
  const dataFile = path.join(outDir, '02_data_from_db.sql');

  // Read schema from sqlite_master
  const objects = await db.all(`
    SELECT type, name, tbl_name, sql
    FROM sqlite_master
    WHERE type IN ('table','index','trigger','view')
      AND name NOT LIKE 'sqlite_%'
    ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 ELSE 3 END, name;
  `);

  let schemaOut = [
    '-- Generated from db/odessa.db',
    `-- Date: ${now.toISOString()}`,
    'PRAGMA foreign_keys=OFF;',
  ];

  const tables = [];
  for (const obj of objects) {
    if (obj.type === 'table') tables.push(obj.name);
    if (obj.sql && obj.sql.trim()) {
      schemaOut.push(obj.sql.trim() + ';');
    } else {
      schemaOut.push(`-- NO SQL FOR ${obj.type.toUpperCase()} ${obj.name}`);
    }
  }

  fs.writeFileSync(schemaFile, schemaOut.join('\n') + '\n', 'utf8');

  // Dump data per table
  let dataOut = [
    '-- Data dump',
    `-- Date: ${now.toISOString()}`,
    'PRAGMA foreign_keys=OFF;',
    'BEGIN TRANSACTION;'
  ];

  for (const table of tables) {
    // Skip empty or mapping depending on need - we'll include all
    const cols = await db.all(`PRAGMA table_info(${JSON.stringify(table)});`);
    const colNames = cols.map(c => c.name);
    const rows = await db.all(`SELECT * FROM ${table};`);
    if (rows.length === 0) {
      dataOut.push(`-- ${table}: nessuna riga`);
      continue;
    }
    dataOut.push(`-- ${table}: ${rows.length} righe`);
    const columnsList = '(' + colNames.map(n => `"${n}"`).join(', ') + ')';
    for (const row of rows) {
      const values = colNames.map(n => sqlEscape(row[n])).join(', ');
      dataOut.push(`INSERT INTO "${table}" ${columnsList} VALUES (${values});`);
    }
  }

  dataOut.push('COMMIT;');
  fs.writeFileSync(dataFile, dataOut.join('\n') + '\n', 'utf8');

  await db.close();
  console.log('Dump completato in:', outDir);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
