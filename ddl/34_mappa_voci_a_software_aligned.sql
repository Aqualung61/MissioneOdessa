-- Mappa tutte le voci italiane (LinguaID=1) al Software 'Missione Odessa'
PRAGMA foreign_keys=ON;

INSERT OR IGNORE INTO LessicoSoftware (SoftwareID, VoceID)
SELECT S.ID AS SoftwareID, V.ID AS VoceID
FROM VociLessico V
JOIN Software S ON S.Nome = 'Missione Odessa'
WHERE V.LinguaID = 1;
