-- Crea tabella Piattaforme (schema allineato, semplice anagrafica)
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS Piattaforme (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  Nome TEXT NOT NULL UNIQUE
);
