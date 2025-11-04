-- Popolamento Lingue (idempotente)
-- Allineato allo schema attuale: (ID, IDLingua, Descrizione)
INSERT OR IGNORE INTO Lingue (IDLingua, Descrizione) VALUES ('IT', 'Italiano');
INSERT OR IGNORE INTO Lingue (IDLingua, Descrizione) VALUES ('EN', 'English');
