-- Script di integrazione sinonimi e mapping canonici per odessatest.db
-- TipiLessico: SISTEMA=3, NAVIGAZIONE=2

-- TerminiLessico (ID_Termine, Concetto, ID_TipoLessico)
INSERT INTO TerminiLessico VALUES(11,'SALVARE',3);
INSERT INTO TerminiLessico VALUES(12,'CARICARE',3);
INSERT INTO TerminiLessico VALUES(13,'ALTO',2);
INSERT INTO TerminiLessico VALUES(14,'BASSO',2);

-- VociLessico (ID_Voce, Voce, ID_Termine, ID_Lingua)
INSERT INTO VociLessico VALUES(18,'SALVA',11,1);
INSERT INTO VociLessico VALUES(19,'SAVE',11,1);
INSERT INTO VociLessico VALUES(20,'CARICA',12,1);
INSERT INTO VociLessico VALUES(21,'LOAD',12,1);
INSERT INTO VociLessico VALUES(22,'SU',13,1);
INSERT INTO VociLessico VALUES(23,'SALI',13,1);
INSERT INTO VociLessico VALUES(24,'ALTO',13,1);
INSERT INTO VociLessico VALUES(25,'GIÙ',14,1);
INSERT INTO VociLessico VALUES(26,'SCENDI',14,1);
INSERT INTO VociLessico VALUES(27,'BASSO',14,1);

-- Mapping canonico: SU/SALI/ALTO → ALTO, GIÙ/SCENDI/BASSO → BASSO
-- (il mapping avviene tramite il campo Concetto e la logica di parser)

-- NB: Aggiornare ID_Voce se già presenti voci con questi ID
-- NB: Se la tabella ha AUTOINCREMENT, si può omettere l'ID_Voce e lasciare che venga generato
