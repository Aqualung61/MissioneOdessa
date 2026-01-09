# Copilot Instructions for Missione Odessa App

## Project Overview
- **Type:** Node.js/TypeScript app with backend Express, frontend statico e API REST basata su dati JSON statici (caricati in memoria).
- **Structure:**
  - `src/` – App code (entry: `src/server.js`)
  - `docs/` – Note, review e documentazione
  - `.env` – variabili opzionali (es. `PORT`, `BASE_PATH`, flag security)

## Key Workflows
- **Install dependencies:** `npm install`
- **Run tests:** `npm test` or `npm run test:watch` (Vitest)
- **Run app:** `npm run dev`
- **Dati applicativi:** in `src/data-internal/` (JSON). Per modifiche, aggiornare i file e validare con `npm test`.

## Modeling & Conventions
- **i18n:** Pattern: `Lingua` 1:N `Descrizione`.
- **Validazione input API:** preferire whitelist/range e limiti di payload (vedi `.env.example`).

## Testing & Quality
- **Tests in** `tests/` (Vitest). Coprono API e invarianti principali.

## Integration & Extensibility
- **Deploy pubblico:** usare i flag in `.env.example` (es. `API_AUTH_DISABLED`, `DISABLE_RUN_TESTS`, `TRUST_PROXY`).

## Examples
- See `docs/raccomandazioni.md` for domain-specific modeling tips and next steps.
-- Nota: cartelle/artefatti legacy di DB possono esistere in repo, ma l'app runtime usa dati JSON.

## Non-Obvious Patterns
- Usare trigger/app-logica per aggiornare `updatedAt`.
- Preferire costanti/valori enumerati per evitare magic numbers.
- Per soft deletes, aggiungere `deletedAt` (nullable).

---

For questions on conventions or unclear patterns, check `docs/` or ask for clarification in the repo.
