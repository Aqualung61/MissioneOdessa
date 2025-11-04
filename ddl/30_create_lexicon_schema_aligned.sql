-- Crea schema lessico allineato al DB attuale (usa Lingue.ID esistente)
PRAGMA foreign_keys=ON;

-- TipiLessico
CREATE TABLE IF NOT EXISTS TipiLessico (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  NomeTipo TEXT NOT NULL UNIQUE
);

-- TerminiLessico (concetti)
CREATE TABLE IF NOT EXISTS TerminiLessico (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  Concetto TEXT NOT NULL,
  TipoID INTEGER NOT NULL,
  FOREIGN KEY (TipoID) REFERENCES TipiLessico(ID)
);
CREATE INDEX IF NOT EXISTS IX_TerminiLessico_Tipo ON TerminiLessico(TipoID);

-- VociLessico (stringhe per lingua)
CREATE TABLE IF NOT EXISTS VociLessico (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  Voce TEXT NOT NULL,
  TermineID INTEGER NOT NULL,
  LinguaID INTEGER NOT NULL,
  FOREIGN KEY (TermineID) REFERENCES TerminiLessico(ID),
  FOREIGN KEY (LinguaID) REFERENCES Lingue(ID)
);
CREATE UNIQUE INDEX IF NOT EXISTS UX_VociLessico_VoceLingua ON VociLessico(Voce, LinguaID);
CREATE INDEX IF NOT EXISTS IX_VociLessico_Termine ON VociLessico(TermineID);
CREATE INDEX IF NOT EXISTS IX_VociLessico_Lingua ON VociLessico(LinguaID);

-- Software (giochi)
CREATE TABLE IF NOT EXISTS Software (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  Nome TEXT NOT NULL UNIQUE
);

-- LessicoSoftware (associazione M:N tra voci e software)
CREATE TABLE IF NOT EXISTS LessicoSoftware (
  SoftwareID INTEGER NOT NULL,
  VoceID INTEGER NOT NULL,
  PRIMARY KEY (SoftwareID, VoceID),
  FOREIGN KEY (SoftwareID) REFERENCES Software(ID),
  FOREIGN KEY (VoceID) REFERENCES VociLessico(ID)
);
