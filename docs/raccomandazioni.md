# Raccomandazioni per il data model (Missione Odessa)

Ultimo aggiornamento: 2025-10-30

Queste note sintetizzano le raccomandazioni operative emerse nell'avvio del progetto.

## Workflow consigliato
- Gestisci lo schema via DDL SQL in `ddl/` e/o script applicativi (SQLite).
- Per cambi strutturali, aggiungi file SQL descrittivi e documenta i passaggi in `docs/`.
- Esplora/modifica dati con DBeaver o DB Browser for SQLite sul file `db/odessa.db`.

## Scelte iniziali
- DB locale: SQLite per velocità. Quando serve, migrazione a Postgres/MySQL tramite script/migrazioni ad hoc.
- Campi di audit ovunque serva: `createdAt`, `updatedAt`. Già applicati a: `Utente`, `Lingua`, `Descrizione`.

## Vincoli e indici da aggiungere (proposti)
- Unicità:
  - `Lingua.descrizioneLingua` dovrebbe essere `@unique` (no duplicati).
  - `Utente.utente` dovrebbe essere `@unique` (username univoco).
- Indici suggeriti:
  - Indice su `Descrizione.linguaId` per query filtrate per lingua.
- Referential actions:
  - Valutare `onDelete: Restrict` (attuale) vs `Cascade` su `Descrizione -> Lingua` in base all'uso (eliminare una lingua cancella le descrizioni?).

## Modellazione i18n
- Pattern attuale: `Lingua` 1:N `Descrizione`.
- Se servono descrizioni per entità diverse, considerare una tabella polimorfica (es. `LocalizedText(entityType, entityId, linguaId, testo)`) oppure tabelle per-entità con composite unique `(entityId, linguaId)`.

## Tipi/enum e campi di stato
- `Utente.tipo`: definire un set di costanti a livello applicativo per evitare magic numbers (es. ADMIN, EDITOR, VIEWER).
- Stati di dominio ricorrenti: usare valori enumerati e validazioni a livello applicativo.

## Soft delete (opzionale)
- Aggiungere `deletedAt DateTime?` se serve mantenere lo storico senza hard delete.

## Dati di base (seed)
- Seed iniziale lingue (es. IT, EN, UKR). Opzioni:
  - Script app (TypeScript/Node) che usa `sqlite3`.
  - Oppure script SQL con insert idempotenti.

## Convenzioni e qualità
- Nominare le migration in modo descrittivo (già: `core_entities`, `add_audit_fields`).
- Test minimi:
  - Inserimento/lettura Utente e Lingua.
  - Vincoli di unicità (attesi errori su duplicati).
  - Relazione `Descrizione` ↔ `Lingua`.

## Prossimi passi operativi (proposti)
1. Introdurre `@unique` su `Lingua.descrizioneLingua` e `Utente.utente` + indice su `Descrizione.linguaId`.
2. Valutare `enum` per `Utente.tipo`.
3. Aggiungere un semplice seed per 2–3 lingue.
4. Aggiungere 2–3 test Vitest sui vincoli e relazioni.

Note: queste modifiche non rompono l'API pubblica e sono a basso rischio. Posso applicarle e aggiornare le migration quando vuoi.
