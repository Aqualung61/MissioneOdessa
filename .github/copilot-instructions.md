# Copilot Instructions for Missione Odessa App

## Project Overview
- **Type:** Data-model-first TypeScript app using Prisma ORM and SQLite (dev), ready for Postgres/MySQL.
- **Structure:**
  - `src/` – App code (entry: `src/index.ts`)
  - `prisma/` – Prisma schema (`schema.prisma`), migrations, and DB config
  - `docs/` – Modeling notes, recommendations, and conventions
  - `.env` – DB connection string (default: SQLite at `prisma/dev.db`)

## Key Workflows
- **Install dependencies:** `npm install`
- **Generate Prisma client:** `npm run generate`
- **Apply schema to DB:**
  - Fast iteration: `npm run db:push`
  - Migration (history): `npm run db:migrate`
- **Open Prisma Studio:** `npm run studio`
- **Run tests:** `npm test` or `npm run test:watch` (Vitest)
- **Run app:** `npm run dev`

## Modeling & Conventions
- **Edit models in** `prisma/schema.prisma`. Use `@unique`, `@relation`, and enums for domain logic.
- **Audit fields** (`createdAt`, `updatedAt`) are required on all core tables.
- **Migrations:** Name descriptively (e.g., `core_entities`, `add_audit_fields`).
- **Seed data:** Add via migration SQL or TypeScript script using Prisma Client.
- **i18n:** Pattern: `Lingua` 1:N `Descrizione`. For multi-entity localization, consider a polymorphic table or composite unique keys.

## Testing & Quality
- **Tests in** `tests/` (Vitest). Cover entity creation, uniqueness, and relations.
- **Recommended:** Add tests for DB constraints and relations after each schema change.

## Integration & Extensibility
- **Switch DB provider:** Change `provider` and `DATABASE_URL` in `prisma/schema.prisma` and `.env`, then run `npm run db:migrate`.
- **External tools:** Use Prisma Studio or DBeaver for DB inspection.

## Examples
- See `docs/raccomandazioni.md` for domain-specific modeling tips and next steps.
- Example migration: `prisma/migrations/20251029194338_add_audit_fields/migration.sql` shows audit field pattern.

## Non-Obvious Patterns
- Use `@updatedAt` for auto-updating timestamps.
- Prefer `enum` for domain types (e.g., user roles) to avoid magic numbers.
- For soft deletes, add `deletedAt DateTime?` (nullable).

---

For questions on conventions or unclear patterns, check `docs/` or ask for clarification in the repo.
