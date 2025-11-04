-- DDL: Tabella Piattaforme
CREATE TABLE Piattaforme (
    ID_Piattaforma INTEGER PRIMARY KEY AUTOINCREMENT,
    NomePiattaforma TEXT NOT NULL UNIQUE
);
