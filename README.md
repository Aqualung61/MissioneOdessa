# Missione Odessa App

Data-model-first scaffold with TypeScript + Prisma + SQLite.

## Quickstart

- Install deps (already done): `npm install`
- Generate client: `npm run generate`
- Apply schema to dev DB:
  - Iteration: `npm run db:push`
  - Migration (tracks history): `npm run db:migrate`
- Open Prisma Studio: `npm run studio`
- Run tests: `npm test` (or `npm run test:watch`)
- Run app: `npm run dev`

## Structure
- `src/` – app code
- `prisma/` – Prisma schema and migrations
- `docs/` – modeling notes
- `.env` – DATABASE_URL (SQLite file at `prisma/dev.db`)

## Switching DB Provider
Change `provider` and `DATABASE_URL` in `prisma/schema.prisma` and `.env` respectively, then run `npm run db:migrate`.
