# Data Modeling Notes

This project is modeled data-first using Prisma. Workflow:

1. Define models in `prisma/schema.prisma`.
2. Generate client and apply schema to the dev DB:
   - `npm run generate`
   - `npm run db:migrate` (or `npm run db:push` for quick iterations)
3. Inspect/edit data via:
   - Prisma Studio: `npm run studio`
   - DBeaver (open `prisma/dev.db`)

## Assumptions (to refine together)
- Start with SQLite for local iterations; we can switch to Postgres/MySQL by changing the datasource and URL.
- Placeholder `Example` model exists only to create the initial migration; replace with the real entities when ready.

## Next steps
- List the core entities and relationships (1:N, N:M) for Missione Odessa.
- Add basic constraints/uniqueness (e.g., codes, email uniqueness, composite keys).
- Add enums for domain states where applicable.
- Add audit fields where needed (createdAt, updatedAt, by-user), soft deletes if required.

## Audit fields
- createdAt: impostato automaticamente alla creazione
- updatedAt: aggiornato automaticamente a ogni modifica
Applicati su: Utente, Lingua, Descrizione.
