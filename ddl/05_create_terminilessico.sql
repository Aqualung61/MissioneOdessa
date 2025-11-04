-- DDL: Tabella TerminiLessico
CREATE TABLE TerminiLessico (
    ID_Termine INTEGER PRIMARY KEY AUTOINCREMENT,
    Concetto TEXT NOT NULL,
    ID_TipoLessico INTEGER NOT NULL,
    FOREIGN KEY (ID_TipoLessico) REFERENCES TipiLessico(ID_TipoLessico)
);
