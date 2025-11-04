-- Unifica i sinonimi GUARDA/OSSERVA sullo stesso concetto (OSSERVARE)
PRAGMA foreign_keys=ON;

-- Porta la voce 'GUARDA' al TermineID del concetto 'OSSERVARE'
UPDATE VociLessico
SET TermineID = (SELECT ID FROM TerminiLessico WHERE Concetto = 'OSSERVARE')
WHERE Voce = 'GUARDA' AND LinguaID = 1
  AND EXISTS (SELECT 1 FROM TerminiLessico WHERE Concetto = 'OSSERVARE');

-- Rimuovi il concetto 'GUARDARE' se non ha più voci associate
DELETE FROM TerminiLessico
WHERE Concetto = 'GUARDARE'
  AND ID NOT IN (SELECT DISTINCT TermineID FROM VociLessico);
