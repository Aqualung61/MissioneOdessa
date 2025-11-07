// Quick check: verify base navigation voices exist in VociLessico for LinguaID=1
// Required voices: NORD, EST, SUD, OVEST, SU, GIÙ
// Usage: node scripts/check-nav-voci.js [dbPath]

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

function removeDiacritics(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function main() {
  const dbPath = process.argv[2] || './db/Odessa.db';
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    const rows = await db.all(
      `SELECT t.NomeTipo AS Tipo, tl.ID AS TermineID, tl.Concetto AS Concetto, vl.Voce AS Voce
       FROM TipiLessico t
       JOIN TerminiLessico tl ON tl.TipoID = t.ID
       JOIN VociLessico vl ON vl.TermineID = tl.ID
       WHERE t.NomeTipo = 'NAVIGAZIONE' AND vl.LinguaID = 1`
    );
    const voices = new Set(rows.map(r => r.Voce.toUpperCase()));
    const required = ['NORD','EST','SUD','OVEST','SU','GIÙ'];
    const report = required.map(v => ({ voce: v, present: voices.has(v) }));
    // Also compute normalized view to show equivalence for GIÙ
  const voicesNoAcc = new Set(Array.from(voices).map(removeDiacritics));

    const allPresent = report.every(r => r.present);
    console.log('NAV voices (LinguaID=1) in VociLessico for Tipo=NAVIGAZIONE:');
    console.table(rows.reduce((acc, r) => {
      acc.push({ Concetto: r.Concetto, Voce: r.Voce });
      return acc;
    }, []));
    console.log('\nRequired voices check:');
    console.table(report);
    console.log('All required present:', allPresent);
    if (!allPresent) {
      // Give a hint if only diacritics mismatch
      const missing = report.filter(r => !r.present).map(r => r.voce);
      const missingNoAccOk = missing.every(m => voicesNoAcc.has(removeDiacritics(m)));
      if (missingNoAccOk) {
        console.log('\nNote: All required voices are present ignoring diacritics. Parser tolerates missing accents.');
      }
      process.exitCode = 1;
    }
  } finally {
    await db.close();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(2);
});
