-- Superscript: crea e popola tutte le tabelle del DB Missione Odessa
-- Esegue in sequenza tutti i file di CREATE e INSERT

.read 01_create_Lingue.sql
.read 02_create_Piattaforme.sql
.read 03_create_Software.sql
.read 04_create_TipiLessico.sql
.read 05_create_TerminiLessico.sql
.read 06_create_VociLessico.sql
.read 07_create_LessicoSoftware.sql
.read 08_create_Luoghi.sql

.read 11_insert_Lingue.sql
.read 12_insert_Piattaforme.sql
.read 13_insert_Software.sql
.read 14_insert_TipiLessico.sql
.read 15_insert_TerminiLessico.sql
.read 16_insert_VociLessico.sql
.read 17_insert_LessicoSoftware.sql
.read 18_insert_Luoghi.sql
