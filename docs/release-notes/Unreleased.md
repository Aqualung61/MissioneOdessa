# Missione Odessa – Release Notes (Unreleased)

Data: TBA
Branch: main

## Sintesi
Piccole rifiniture alla configurazione di build e test, idempotenza completa dello script etichette e chiarimenti di workflow per il board.

## Modifiche
- Build/TypeScript
  - Aggiunto `tsconfig.build.json` per compilare solo le sorgenti applicative (esclude i test).
  - Script `build` aggiornato per usare `tsconfig.build.json` (risolve TS6059 su test fuori da `rootDir`).
- Test/Vitest
  - Aggiunto `vitest.config.ts` con include espliciti per `tests/**/*.test.ts` e `src/tests/**/*.test.ts`.
  - Esclusi esplicitamente `src/tests/e2e/**` oltre ai pattern E2E generici.
- Tooling/Script
  - `scripts/issue-board-setup.ps1`: aggiornamento etichette esistenti con `gh label edit` (idempotenza completa di colore/descrizione).
  - `package.json`: rimozione prefisso `npx` dai dev scripts dove non necessario.
- Documentazione
  - `docs/issue-board-plan.md`: chiarito il linking PR ↔ issue (campo “Linked issues” / keyword "Fixes #<id>") e tradotto "Definition of Done" → "Definizione di Completamento".

## Quality gates
- Build: PASS
- Test (Vitest): PASS (8 file, 29 test)

## Note
Nessuna migrazione DB richiesta; modifiche non breaking.