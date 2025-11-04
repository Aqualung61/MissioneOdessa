-- Popolamento Lingue (idempotente)
-- Allineato allo schema attuale: (ID, IDLingua, Descrizione)
INSERT OR IGNORE INTO Lingue (IDLingua, Descrizione) VALUES ('IT', 'Italiano');
-- Aggiungi altre lingue se necessario, es.:
-- INSERT OR IGNORE INTO Lingue (IDLingua, Descrizione) VALUES ('EN','Inglese');
