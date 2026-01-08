# Linee guida DDL e migrazioni (SQLite)

Queste linee guida definiscono come gestire schema e dati tramite file SQL in `ddl/`.
Prisma è stato rimosso: lo schema è mantenuto con DDL versionati e applicati in ordine.

## Obiettivi
- Ordine deterministico di applicazione (repeatable e idempotente ove possibile)
- Sicurezza: evitare rotture dei dati; transazioni dove sensato
- Tracciabilità: ogni modifica ha un file e una breve nota

## Nomenclatura file
- Usa prefissi ordinabili alfabeticamente per definire la sequenza di applicazione.
  - Esempi accettati:
    - `01_create_lingue.sql`, `02_add_descrizioni.sql`, `03_add_indexes.sql`
    - Oppure timestamp: `20251104_1015_add_audit_fields.sql`
- Non rinumerare file già committati: aggiungi un nuovo file con il prossimo indice/prefisso.
- Nel nome usa verbi descrittivi (create/add/alter/drop) e soggetto chiaro.

## Struttura raccomandata del file SQL
- Abilita vincoli e usa transazioni:
  - `PRAGMA foreign_keys = ON;`
  - `BEGIN TRANSACTION; ... COMMIT;`
- Rendi le operazioni idempotenti quando possibile:
  - `CREATE TABLE IF NOT EXISTS ...`
  - `CREATE INDEX IF NOT EXISTS idx_nome ON ...`
  - Evita `DROP TABLE` irreversibili; preferisci `ALTER` o migrazioni additive.
- Audit fields: valuta `createdAt`, `updatedAt`:
  - `createdAt` con `DEFAULT (datetime('now'))` oppure via applicazione
  - `updatedAt` tramite trigger o aggiornato dall'applicazione
- Esempio di pattern:

```sql
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- Tabelle
CREATE TABLE IF NOT EXISTS Lingua (
  id INTEGER PRIMARY KEY,
  codice TEXT NOT NULL UNIQUE,
  descrizioneLingua TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_lingua_codice ON Lingua (codice);

COMMIT;
```

## File di seed
- Mantieni i seed separati dai DDL strutturali:
  - Prefissi suggeriti: `seed_` oppure suffissi: `_seed.sql`
  - Esempio: `10_seed_lingue.sql`
- I seed devono essere idempotenti (usa `INSERT OR IGNORE` o verifica prima di inserire).

## Applicazione delle migrazioni
- Ordine di applicazione: alfabetico/lessicografico dei nomi file.
- Applica sempre su un backup o in ambiente di test prima della produzione.
- Variabile d'ambiente del DB: `ODESSA_DB_PATH` (default `./db/odessa.db`).
- Strumenti suggeriti:
  - CLI (es. `sqlite3`)
  - Script Node dedicato (`sqlite3`/`better-sqlite3`) che legge `ddl/` e applica in ordine

## Rollback
- Non garantito per tutte le migrazioni. Se necessario, affianca un file `*-down.sql` con istruzioni di ripristino sicure.
- Evita `DROP` in produzione senza piano di rollback e backup confermato.

## Checklist PR di migrazione
- [ ] Nome file chiaro e ordinabile
- [ ] Transazione e `PRAGMA foreign_keys = ON`
- [ ] Operazioni idempotenti dove possibile
- [ ] Nessuna perdita dati non necessaria; piano di migrazione dati se serve
- [ ] Test minimo: avvio app + query chiave ok, vincoli coerenti
- [ ] Documentazione aggiornata se cambia il modello (link a questo file se utile)

## Postgres/MySQL (in futuro)
- Per il passaggio a DB server-based:
  - Preparare script di creazione schema equivalenti
  - Definire mapping tipi e vincoli
  - Script di migrazione dati da SQLite
  - Adattare l’accesso ai dati nell’applicazione
