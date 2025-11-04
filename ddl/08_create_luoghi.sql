-- Creazione tabella Luoghi (nomi campi in italiano, con riferimento a Lingue)
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "Luoghi" (
	"ID" INTEGER NOT NULL UNIQUE,
	"IDLingua" INTEGER NOT NULL DEFAULT 1,
	"Nome" TEXT NOT NULL,
	"Descrizione" TEXT NOT NULL,
	"Piano" INTEGER NOT NULL,
	"Nord" INTEGER NOT NULL,
	"Est" INTEGER NOT NULL,
	"Ovest" INTEGER NOT NULL,
	"Sud" INTEGER NOT NULL,
	"Su" INTEGER NOT NULL,
	"Giu" INTEGER NOT NULL,
	"Affidabilita" TEXT NOT NULL,
	PRIMARY KEY("ID" AUTOINCREMENT),
	FOREIGN KEY ("IDLingua") REFERENCES "Lingue" ("ID")
);
