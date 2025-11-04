-- Indici raccomandati per performance e coerenza
PRAGMA foreign_keys=ON;

-- Luoghi: ricerca per lingua e nome
CREATE INDEX IF NOT EXISTS IX_Luoghi_Lingua ON Luoghi(IDLingua);
CREATE INDEX IF NOT EXISTS IX_Luoghi_Nome ON Luoghi(Nome);

-- LessicoSoftware: velocizza join/filter
CREATE INDEX IF NOT EXISTS IX_LessicoSoftware_Voce ON LessicoSoftware(VoceID);
CREATE INDEX IF NOT EXISTS IX_LessicoSoftware_Software ON LessicoSoftware(SoftwareID);

-- Lingue: garantisce unicità del codice lingua logico
CREATE UNIQUE INDEX IF NOT EXISTS UX_Lingue_IDLingua ON Lingue(IDLingua);
