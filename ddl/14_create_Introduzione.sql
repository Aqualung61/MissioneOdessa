-- 14_create_Introduzione.sql
-- Crea la tabella Introduzione per testi introduttivi multilingua

CREATE TABLE IF NOT EXISTS Introduzione (
    ID INTEGER PRIMARY KEY NOT NULL,
    IDLingua INTEGER NOT NULL,
    Testo TEXT NOT NULL,
    FOREIGN KEY (IDLingua) REFERENCES Lingue(ID)
);
