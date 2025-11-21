-- Crea la tabella Luoghi_immagine con chiave primaria, foreign key e campo Buio
CREATE TABLE Luoghi_immagine (
    ID INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    ID_luoghi INTEGER NOT NULL,
    Immagine TEXT NOT NULL,
    Buio INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (ID_luoghi) REFERENCES Luoghi(ID)
);
