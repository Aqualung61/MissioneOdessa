/*
  Warnings:

  - You are about to drop the column `linguaId` on the `Descrizione` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Descrizione" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descrizione" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Descrizione" ("createdAt", "descrizione", "id", "updatedAt") SELECT "createdAt", "descrizione", "id", "updatedAt" FROM "Descrizione";
DROP TABLE "Descrizione";
ALTER TABLE "new_Descrizione" RENAME TO "Descrizione";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
