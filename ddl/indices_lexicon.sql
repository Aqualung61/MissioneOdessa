-- Indici consigliati per tabelle di lessico (SQLite)
-- Sicuri e idempotenti con IF NOT EXISTS

-- Join e filtri frequenti
CREATE INDEX IF NOT EXISTS idx_TerminiLessico_TipoID ON TerminiLessico (TipoID);
CREATE INDEX IF NOT EXISTS idx_VociLessico_TermineID ON VociLessico (TermineID);
CREATE INDEX IF NOT EXISTS idx_VociLessico_LinguaID ON VociLessico (LinguaID);

-- Ricerca voci per lingua
CREATE INDEX IF NOT EXISTS idx_VociLessico_Lingua_Voce ON VociLessico (LinguaID, Voce);
