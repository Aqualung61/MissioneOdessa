-- Drop completo dello schema lessico allineato (idempotente)
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS LessicoSoftware;
DROP TABLE IF EXISTS Software;
DROP TABLE IF EXISTS VociLessico;
DROP TABLE IF EXISTS TerminiLessico;
DROP TABLE IF EXISTS TipiLessico;
DROP TABLE IF EXISTS Piattaforme;
PRAGMA foreign_keys=ON;
