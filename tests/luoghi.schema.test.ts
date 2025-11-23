import { describe, it, expect } from 'vitest';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DB = path.resolve(process.cwd(), 'db', 'odessa.db');

async function getTableInfo(table: string) {
  const db = await open({ filename: DB, driver: sqlite3.Database });
  try {
    const cols = await db.all(`PRAGMA table_info('${table}')`);
    return cols as Array<{ name: string; type: string; notnull: number; dflt_value: unknown; pk: number }>;
  } finally {
    await db.close();
  }
}

async function getTerminaleById(id: number) {
  const db = await open({ filename: DB, driver: sqlite3.Database });
  try {
    const row = await db.get(`SELECT Terminale FROM Luoghi WHERE ID = ?`, id);
    return row?.Terminale;
  } finally {
    await db.close();
  }
}

async function getCount(table: string) {
  const db = await open({ filename: DB, driver: sqlite3.Database });
  try {
    const row = await db.get(`SELECT COUNT(*) AS n FROM ${table}`);
    return row?.n as number;
  } finally {
    await db.close();
  }
}

describe('Schema Luoghi allineato (Terminale INTEGER, not null)', () => {
  it('colonna Terminale presente come INTEGER NOT NULL', async () => {
    const cols = await getTableInfo('Luoghi');
    const term = cols.find(c => c.name === 'Terminale');
    expect(term).toBeDefined();
    expect(term!.type.toUpperCase()).toBe('INTEGER');
    expect(term!.notnull).toBe(1);
  });

  it('conteggio righe coerente (>= 59)', async () => {
    const n = await getCount('Luoghi');
    expect(n).toBeGreaterThanOrEqual(59);
  });

  it('valori Terminale attesi su subset (8,40,54 = -1; altri = 0)', async () => {
    const t8 = await getTerminaleById(8);
    const t40 = await getTerminaleById(40);
    const t54 = await getTerminaleById(54);
    const t1 = await getTerminaleById(1);
    const t9 = await getTerminaleById(9);
    expect([t8, t40, t54]).toEqual([-1, -1, -1]);
    expect([t1, t9]).toEqual([0, 0]);
  });
});
