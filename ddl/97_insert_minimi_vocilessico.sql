-- Inserimento voci minime mancanti in VociLessico per odessatest.db
-- Sostituisci gli ID_Termine con quelli effettivi del tuo DB
-- ID_Lingua=1 (italiano)

-- Azioni
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('ESAMINA', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='ESAMINARE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('OSSERVA', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='ESAMINARE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('GUARDA', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='ESAMINARE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('APRI', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='APRIRE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('CHIUDI', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='CHIUDERE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('POSA', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='LASCIARE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('LASCIA', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='LASCIARE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('DORMI', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='DORMIRE'), 1);

-- Sistema
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('SALVA', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='SALVARE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('SAVE', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='SALVARE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('CARICA', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='CARICARE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('LOAD', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='CARICARE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('?', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='?'), 1);

-- Navigazione
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('SU', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='SU'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('SALI', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='SU'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('ALTO', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='SU'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('GIÙ', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='GIÙ'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('SCENDI', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='GIÙ'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('BASSO', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='GIÙ'), 1);

-- Oggetti
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('BADILE', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='BADILE'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('BOTOLA', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='BOTOLA'), 1);

-- Stopword
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('IL', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='ARTICOLO_DET'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('LO', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='ARTICOLO_DET'), 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('LA', (SELECT ID_Termine FROM TerminiLessico WHERE Concetto='ARTICOLO_DET'), 1);
