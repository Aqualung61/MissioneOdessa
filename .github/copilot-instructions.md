# Copilot Instructions for Missione Odessa App

## Project Overview
- **Type:** Node.js/TypeScript app using SQLite (no ORM). Ready to switch to Postgres/MySQL with custom scripts.
- **Structure:**
  - `src/` – App code (entry: `src/server.js`)
  - `docs/` – Modeling notes, recommendations, and conventions
  - `.env` – DB path (default: `./db/odessa.db` via `ODESSA_DB_PATH`)

## Key Workflows
- **Install dependencies:** `npm install`
- **Run tests:** `npm test` or `npm run test:watch` (Vitest)
- **Run app:** `npm run dev`
- **Schema changes:** gestiti via DDL SQL in `ddl/` e documentati in `docs/`

## Modeling & Conventions
- **Schema** via DDL SQL (unique, FK, indici) e regole applicative.
- **Audit fields** (`createdAt`, `updatedAt`) consigliati su tabelle core.
- **Migrations:** nominare i file DDL in modo descrittivo (es. `core_entities`, `add_audit_fields`).
- **Seed data:** via script SQL o Node (`sqlite3`).
- **i18n:** Pattern: `Lingua` 1:N `Descrizione`; per multi-entità valutare tabella polimorfica o chiavi uniche composte.

## Testing & Quality
- **Tests in** `tests/` (Vitest). Cover entity creation, uniqueness, and relations.
- **Recommended:** Add tests for DB constraints and relations after each schema change.

## Integration & Extensibility
- **DB path:** configurabile con `ODESSA_DB_PATH`.
- **Switch DB provider:** valutare migrazione dati e adattare accesso (script ad hoc).
- **External tools:** DBeaver o DB Browser for SQLite per ispezione.

## Examples
- See `docs/raccomandazioni.md` for domain-specific modeling tips and next steps.
-- Esempi DDL: vedere `ddl/` se presente.

## Non-Obvious Patterns
- Usare trigger/app-logica per aggiornare `updatedAt`.
- Preferire costanti/valori enumerati per evitare magic numbers.
- Per soft deletes, aggiungere `deletedAt` (nullable).

---

For questions on conventions or unclear patterns, check `docs/` or ask for clarification in the repo.
