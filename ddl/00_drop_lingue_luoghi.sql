-- Drop tabelle Luoghi e Lingue (ordine sicuro)
-- ATTENZIONE: questa operazione cancella i dati delle due tabelle.
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "Luoghi";
DROP TABLE IF EXISTS "Lingue";
PRAGMA foreign_keys=ON;
