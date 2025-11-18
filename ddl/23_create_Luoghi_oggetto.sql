-- Creazione della tabella Luoghi_oggetto
-- Tabella di associazione molti-a-molti tra Oggetti, Luoghi e Lingue

CREATE TABLE Luoghi_oggetto (
    IDOggetto INTEGER NOT NULL REFERENCES Oggetti(ID),
    IDLuogo INTEGER NOT NULL REFERENCES Luoghi(ID),
    IDLingua INTEGER NOT NULL REFERENCES Lingue(ID),
    PRIMARY KEY (IDOggetto, IDLuogo, IDLingua)
);