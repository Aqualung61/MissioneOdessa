import { describe, it, expect } from 'vitest';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DB = path.resolve(process.cwd(), 'db', 'odessa.db');

async function getNavVoices(): Promise<Array<{ Concetto: string; Voce: string }>> {
  const db = await open({ filename: DB, driver: sqlite3.Database });
  try {
    const rows = await db.all(
      `SELECT tl.Concetto AS Concetto, vl.Voce AS Voce
       FROM TipiLessico t
       JOIN TerminiLessico tl ON tl.ID_TipoLessico = t.ID_TipoLessico
       JOIN VociLessico vl ON vl.ID_Termine = tl.ID_Termine
       WHERE t.NomeTipo = 'NAVIGAZIONE' AND vl.ID_Lingua = 1`
    );
    return rows as Array<{ Concetto: string; Voce: string }>;
  } finally {
    await db.close();
  }
}

describe('Lessico NAVIGAZIONE: voci base presenti (LinguaID=1)', () => {
  it('include NORD, EST, SUD, OVEST, SU, GIÙ in VociLessico', async () => {
    const rows = await getNavVoices();
    const voices = new Set(rows.map(r => r.Voce.toUpperCase()));
    const required = ['NORD','EST','SUD','OVEST','SU','GIÙ'];
    for (const v of required) {
      expect(voices.has(v)).toBe(true);
    }
  });
});
