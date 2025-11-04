-- Crea vista NOUNS basata sullo schema allineato (NOUN)
-- Colonne: VoceID, Voce, TermineID, Concetto, LinguaID
CREATE VIEW IF NOT EXISTS NOUNS AS
SELECT
  vl.ID       AS VoceID,
  vl.Voce     AS Voce,
  tl.ID       AS TermineID,
  tl.Concetto AS Concetto,
  vl.LinguaID AS LinguaID
FROM VociLessico vl
JOIN TerminiLessico tl ON tl.ID = vl.TermineID
JOIN TipiLessico t     ON t.ID = tl.TipoID
WHERE t.NomeTipo = 'NOUN';
