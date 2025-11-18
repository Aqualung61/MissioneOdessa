-- Creazione della tabella Oggetti
-- Tabella per gli oggetti del gioco, con riferimento alla lingua

CREATE TABLE IF NOT EXISTS Oggetti (
    ID INTEGER NOT NULL UNIQUE,
    IDLingua INTEGER NOT NULL,
    Oggetto TEXT NOT NULL,
    Attivo NUMERIC NOT NULL DEFAULT 0,
    PRIMARY KEY(ID AUTOINCREMENT),
    FOREIGN KEY(IDLingua) REFERENCES Lingue(ID)
);