# Raccomandazioni per il data model (Missione Odessa)

Ultimo aggiornamento: 2025-10-30

Queste note sintetizzano le raccomandazioni operative emerse nell'avvio del progetto.

## Workflow consigliato
- Modifica modelli in `prisma/schema.prisma`.
- Itera velocemente con `npm run db:push`; quando il cambio è stabile, usa `npm run db:migrate` (traccia la storia) e `npm run generate`.
- Esplora/modifica dati con `npm run studio` (Prisma Studio) o DBeaver su `prisma/dev.db`.

## Scelte iniziali
- DB locale: SQLite per velocità. Quando serve, migrazione a Postgres/MySQL cambiando `datasource` e `DATABASE_URL` + nuove migration.
- Campi di audit ovunque serva: `createdAt` (default now), `updatedAt` (@updatedAt). Già applicati a: `Utente`, `Lingua`, `Descrizione`.

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
- `Utente.tipo`: convertire in `enum` Prisma per evitare magic numbers (es. ADMIN, EDITOR, VIEWER).
- Stati di dominio ricorrenti: usare `enum` + validazioni a livello applicativo.

## Soft delete (opzionale)
- Aggiungere `deletedAt DateTime?` se serve mantenere lo storico senza hard delete.

## Dati di base (seed)
- Seed iniziale lingue (es. IT, EN, UKR). Opzioni:
  - Script app (TypeScript) che usa Prisma Client.
  - Oppure migration SQL con insert idempotenti.

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
