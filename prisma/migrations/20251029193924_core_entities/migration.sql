/*
  Warnings:

  - You are about to drop the `Example` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Example";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Utente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utente" TEXT NOT NULL,
    "tipo" INTEGER NOT NULL,
    "attivo" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "Lingua" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descrizioneLingua" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Descrizione" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "linguaId" INTEGER NOT NULL,
    "descrizione" TEXT NOT NULL,
    CONSTRAINT "Descrizione_linguaId_fkey" FOREIGN KEY ("linguaId") REFERENCES "Lingua" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
