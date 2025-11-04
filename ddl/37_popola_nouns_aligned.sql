-- Popola NOUN (sostantivi) dal set SME, in schema allineato
-- Idempotente: non duplica concetti o voci esistenti
PRAGMA foreign_keys=ON;

-- Assicura l'esistenza del tipo NOUN
INSERT OR IGNORE INTO TipiLessico (ID, NomeTipo) VALUES (4, 'NOUN');

-- Helper per ottenere TipoID
WITH tipo AS (
  SELECT ID AS TipoID FROM TipiLessico WHERE NomeTipo='NOUN'
)
-- Inserisci concetti se non esistono (senza usare VALUES per max compatibilità)
INSERT INTO TerminiLessico (Concetto, TipoID)
SELECT v.Concetto, tipo.TipoID
FROM (
  SELECT 'LAMPADA' AS Concetto
  UNION ALL SELECT 'FIAMMIFERO'
  UNION ALL SELECT 'TORCIA'
  UNION ALL SELECT 'FERMACARTE'
  UNION ALL SELECT 'SCOMPARTO'
  UNION ALL SELECT 'FOGLIO'
  UNION ALL SELECT 'QUADRO'
  UNION ALL SELECT 'CASSAFORTE'
  UNION ALL SELECT 'MANOPOLA'
  UNION ALL SELECT 'MEDAGLIONE'
  UNION ALL SELECT 'ARAZZO'
  UNION ALL SELECT 'FORMA'
  UNION ALL SELECT 'STATUETTA'
  UNION ALL SELECT 'NICCHIA'
  UNION ALL SELECT 'BADILE'
  UNION ALL SELECT 'BASTONE'
  UNION ALL SELECT 'SEDILE'
  UNION ALL SELECT 'FASCICOLO'
  UNION ALL SELECT 'PULSANTE'
  UNION ALL SELECT 'MACERIE'
  UNION ALL SELECT 'PESO'
  UNION ALL SELECT 'PESA'
  UNION ALL SELECT 'BOTOLA'
  UNION ALL SELECT 'DOSSIER'
  UNION ALL SELECT 'DOCUMENTI'
) AS v
JOIN tipo
WHERE NOT EXISTS (
  SELECT 1 FROM TerminiLessico tl
  WHERE tl.Concetto = v.Concetto AND tl.TipoID = tipo.TipoID
);

-- Inserisci le voci italiane (LinguaID=1) per ciascun concetto
WITH tipo AS (
  SELECT ID AS TipoID FROM TipiLessico WHERE NomeTipo='NOUN'
), terms AS (
  SELECT tl.ID, tl.Concetto FROM TerminiLessico tl
  JOIN tipo ON tl.TipoID = tipo.TipoID
)
INSERT INTO VociLessico (Voce, TermineID, LinguaID)
SELECT terms.Concetto AS Voce, terms.ID AS TermineID, 1 AS LinguaID
FROM terms
WHERE NOT EXISTS (
  SELECT 1 FROM VociLessico vl
  WHERE vl.Voce = terms.Concetto AND vl.LinguaID = 1
);
