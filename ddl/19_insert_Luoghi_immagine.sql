-- Inserisce un record di test in Luoghi_immagine con un'immagine BLOB
-- NOTA: Per SQLite, il BLOB si inserisce con comando .import o usando x'...' se binario in esadecimale
-- Qui si usa il comando .parameter e .read da shell sqlite3

-- Esempio per shell sqlite3:
-- .parameter set :img_blob "$(cat ../images/Atrio palazzo Gauleiter.png | base64)"
-- INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (1, 1, :img_blob, 0);

-- Alternativa: inserimento diretto da shell (PowerShell)
-- sqlite3 test-results/odessatest.db "INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (1, 1, readfile('images/Atrio palazzo Gauleiter.png'), 0);"

-- SQL puro (non funzionante senza comando esterno):
-- INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (1, 1, X'...', 0);

-- Per uso diretto in shell sqlite3:
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio)
VALUES (1, 1, 'Atrio palazzo Gauleiter.png', 0);

-- Insert dummy image for all other Luoghi (ID 2..59)
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (2, 2, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (3, 3, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (4, 4, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (5, 5, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (6, 6, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (7, 7, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (8, 8, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (9, 9, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (10, 10, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (11, 11, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (12, 12, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (13, 13, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (14, 14, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (15, 15, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (16, 16, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (17, 17, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (18, 18, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (19, 19, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (20, 20, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (21, 21, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (22, 22, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (23, 23, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (24, 24, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (25, 25, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (26, 26, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (27, 27, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (28, 28, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (29, 29, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (30, 30, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (31, 31, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (32, 32, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (33, 33, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (34, 34, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (35, 35, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (36, 36, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (37, 37, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (38, 38, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (39, 39, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (40, 40, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (41, 41, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (42, 42, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (43, 43, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (44, 44, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (45, 45, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (46, 46, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (47, 47, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (48, 48, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (49, 49, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (50, 50, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (51, 51, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (52, 52, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (53, 53, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (54, 54, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (55, 55, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (56, 56, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (57, 57, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (58, 58, 'dummy.png', 0);
INSERT INTO Luoghi_immagine (ID, ID_luoghi, Immagine, Buio) VALUES (59, 59, 'dummy.png', 0);
