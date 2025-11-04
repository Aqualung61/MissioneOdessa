# Data Modeling Notes

Il progetto utilizza direttamente SQLite senza ORM (Prisma rimosso). Queste note raccolgono le convenzioni e i prossimi passi per il modello dati.

## Workflow pratico
1. Schema DB: mantenuto tramite DDL SQL in `ddl/` e/o script applicativi. Il DB di default è `./db/odessa.db` (configurabile con `ODESSA_DB_PATH`).
2. Ispezione/modifica dati: usare DBeaver o DB Browser for SQLite puntando al file `db/odessa.db`.
3. Migrazioni: per cambi strutturali, aggiungere file SQL in `ddl/` con nomi descrittivi (es. `2025xxxx_add_audit_fields.sql`) e documentare i passaggi in `docs/`.

## Assunzioni
- SQLite per sviluppo locale. In futuro è possibile passare a Postgres/MySQL con script/migrazioni ad hoc e adattando l’accesso ai dati.

## Next steps
- Elencare entità e relazioni core (1:N, N:M) per Missione Odessa.
- Aggiungere vincoli base/unique (codici, email, chiavi composte) via DDL.
- Introdurre valori enumerativi a livello applicativo (costanti) e vincoli dove utile.
- Aggiungere campi di audit dove necessario (`createdAt`, `updatedAt`) e, se serve, soft delete (`deletedAt`).

## Audit fields
- createdAt: impostato alla creazione (DEFAULT CURRENT_TIMESTAMP o via applicativo)
- updatedAt: aggiornato a ogni modifica (trigger o via applicativo)
Applicati su: Utente, Lingua, Descrizione.
