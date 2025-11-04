-- DDL: Tabella Lingue (allineata allo schema attuale di db/Odessa.db)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Lingue (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    IDLingua TEXT NOT NULL,
    Descrizione TEXT NOT NULL
);
