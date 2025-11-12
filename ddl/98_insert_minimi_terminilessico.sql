-- Inserimento record minimi mancanti in TerminiLessico per odessatest.db
-- Sostituisci gli ID_TipoLessico con quelli effettivi del tuo DB

-- Azioni
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('ESAMINARE', 1);
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('APRIRE', 1);
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('CHIUDERE', 1);
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('LASCIARE', 1);
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('DORMIRE', 1);

-- Sistema
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('SALVARE', 3);
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('CARICARE', 3);
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('?', 3);

-- Navigazione
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('SU', 2);
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('GIÙ', 2);

-- Oggetti
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('BADILE', 4);
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('BOTOLA', 4);

-- Stopword
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('ARTICOLO_DET', 5);
