-- Esempio di popolamento TerminiLessico e VociLessico per verbi di azione
-- (ID_TipoLessico per VERBO_AZIONE = 1, da TipiLessico)
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('PRENDERE', 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('PRENDI', 1, 1);
-- Aggiungi qui tutti i verbi di azione e le relative voci

-- Esempio per comando di sistema
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('INVENTARIO', 3);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('INVENTARIO', 2, 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('COSA', 2, 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('?', 2, 1);

-- Esempio per stopword
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('ARTICOLO_DET', 5);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('IL', 3, 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('LO', 3, 1);
-- Continua con tutti gli articoli e stopword

-- Esempio per sostantivi (da popolare con elenco completo)
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('LAMPADA', 4);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('LAMPADA', 4, 1);
-- Continua con tutti i sostantivi

-- Esempio per navigazione
INSERT INTO TerminiLessico (Concetto, ID_TipoLessico) VALUES ('NORD', 2);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('NORD', 5, 1);
INSERT INTO VociLessico (Voce, ID_Termine, ID_Lingua) VALUES ('N', 5, 1);
-- Continua con tutte le direzioni e abbreviazioni

-- Esempio bridge software
INSERT INTO LessicoSoftware (ID_Software, ID_Voce) VALUES (1, 1);
-- Continua per tutte le voci supportate dal software
