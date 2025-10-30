/*
  Warnings:

  - Added the required column `updatedAt` to the `Descrizione` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Lingua` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Utente` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Descrizione" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "linguaId" INTEGER NOT NULL,
    "descrizione" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Descrizione_linguaId_fkey" FOREIGN KEY ("linguaId") REFERENCES "Lingua" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Descrizione" ("descrizione", "id", "linguaId") SELECT "descrizione", "id", "linguaId" FROM "Descrizione";
DROP TABLE "Descrizione";
ALTER TABLE "new_Descrizione" RENAME TO "Descrizione";
CREATE TABLE "new_Lingua" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descrizioneLingua" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Lingua" ("descrizioneLingua", "id") SELECT "descrizioneLingua", "id" FROM "Lingua";
DROP TABLE "Lingua";
ALTER TABLE "new_Lingua" RENAME TO "Lingua";
CREATE TABLE "new_Utente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utente" TEXT NOT NULL,
    "tipo" INTEGER NOT NULL,
    "attivo" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Utente" ("attivo", "id", "tipo", "utente") SELECT "attivo", "id", "tipo", "utente" FROM "Utente";
DROP TABLE "Utente";
ALTER TABLE "new_Utente" RENAME TO "Utente";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
