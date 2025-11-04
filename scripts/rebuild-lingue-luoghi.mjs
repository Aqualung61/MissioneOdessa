#!/usr/bin/env node
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  let dbPath = path.resolve(process.cwd(), './db/Odessa.db');
  let includeLexiconAligned = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '-d' || a === '--db') && args[i + 1]) {
      dbPath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    } else if (a === '--lexicon-aligned') {
      includeLexiconAligned = true;
    }
  }
  return { dbPath, includeLexiconAligned };
}

async function execFile(db, filePath) {
  const sql = await fs.readFile(filePath, 'utf8');
  process.stdout.write(`-- Eseguo: ${path.basename(filePath)}\n`);
  await db.exec(sql);
}

async function main() {
  const { dbPath, includeLexiconAligned } = parseArgs();
  try {
    await fs.access(dbPath);
  } catch {
    console.error(`DB non trovato: ${dbPath}`);
    process.exit(1);
  }

  const ddlDir = path.resolve(__dirname, '../ddl');
  const sequence = [
    '00_drop_lingue_luoghi.sql',
    '01_create_lingue.sql',
    '10_popola_lingue.sql',
    '08_create_luoghi.sql',
    '14_popola_luoghi.sql',
  ];

  if (includeLexiconAligned) {
    sequence.push('29_drop_lexicon_aligned.sql');
    sequence.push('31_create_piattaforme_aligned.sql');
    sequence.push('30_create_lexicon_schema_aligned.sql');
    sequence.push('32_popola_comandi_stopword_aligned.sql');
    sequence.push('33_popola_software_aligned.sql');
    sequence.push('37_popola_nouns_aligned.sql');
    sequence.push('34_mappa_voci_a_software_aligned.sql');
    sequence.push('35_unifica_sinonimi_osservare.sql');
    sequence.push('36_add_indexes_aligned.sql');
    sequence.push('38_create_view_nouns.sql');
  }

  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    await db.exec('PRAGMA foreign_keys=ON;');
    for (const f of sequence) {
      const p = path.join(ddlDir, f);
      await execFile(db, p);
    }
  } finally {
    await db.close();
  }
  process.stdout.write('Completato: ricostruzione di Lingue e Luoghi eseguita con successo.' + (includeLexiconAligned ? ' (lessico allineato incluso)' : '') + '\n');
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
