#!/usr/bin/env node
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'node:path';

const DB = path.resolve(process.cwd(), 'db', 'odessa.db');

const qTypes = `
SELECT t.NomeTipo AS Tipo, COUNT(DISTINCT tl.ID) AS Termini, COUNT(vl.ID) AS Voci
FROM TipiLessico t
LEFT JOIN TerminiLessico tl ON tl.TipoID = t.ID
LEFT JOIN VociLessico vl ON vl.TermineID = tl.ID AND vl.LinguaID = 1
GROUP BY t.NomeTipo
ORDER BY t.NomeTipo;
`;

const qNouns = `
SELECT COUNT(*) AS NounTerms
FROM TerminiLessico tl
JOIN TipiLessico t ON t.ID = tl.TipoID AND t.NomeTipo = 'NOUN';
`;

const qNounsVoices = `
SELECT COUNT(*) AS NounVoices
FROM VociLessico vl
JOIN TerminiLessico tl ON tl.ID = vl.TermineID
JOIN TipiLessico t ON t.ID = tl.TipoID AND t.NomeTipo = 'NOUN'
WHERE vl.LinguaID = 1;
`;

const db = await open({ filename: DB, driver: sqlite3.Database });
try {
  const byType = await db.all(qTypes);
  const { NounTerms } = await db.get(qNouns);
  const { NounVoices } = await db.get(qNounsVoices);
  console.log({ DB, byType, NounTerms, NounVoices });
} finally {
  await db.close();
}
