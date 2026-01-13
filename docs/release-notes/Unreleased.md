# Missione Odessa – Release Notes (Unreleased)

Data: TBA
Branch: main

## Sintesi
Pulizia del progetto e allineamento runtime/documentazione: rimossi i test E2E/Playwright e il relativo test-runner via API, semplificato l’entrypoint (`index.html`) e consolidati script/CSS del frontend.

## Modifiche
- Build/TypeScript
  - Aggiunto `tsconfig.build.json` per compilare solo le sorgenti applicative (esclude i test).
  - Script `build` aggiornato per usare `tsconfig.build.json` (risolve TS6059 su test fuori da `rootDir`).
- Test/Vitest
  - Vitest resta l’unico runner di test previsto (CLI).
  - Rimossi Playwright/E2E e qualunque integrazione di esecuzione test via endpoint.
- Tooling/Script
  - `scripts/issue-board-setup.ps1`: aggiornamento etichette esistenti con `gh label edit` (idempotenza completa di colore/descrizione).
  - `package.json`: rimozione prefisso `npx` dai dev scripts dove non necessario.
- Frontend
  - `index.html`: redirect automatico verso `web/odessa_intro.html` con lingua forzata a 1 e gestione `file://` → `http://localhost:3001`.
  - `web/odessa_intro.html`: script estratto in `web/js/odessa_intro.js` (con `window.basePath`).
  - `web/js/odessa1.js` rinominato in `web/js/odessa_main.js` e riferimenti aggiornati.
  - CSS inline consolidato in `web/css/base.css` e `web/css/odessa_main.css`.
- Documentazione
  - Allineati i documenti tecnici a rimozione Playwright/test runner e rinomina `odessa1.js` → `odessa_main.js`.
  - Tracking: aggiornata la roadmap con link alle issue GitHub (incl. release-readiness: ESLint complexity/refactor, #63).

## Quality gates
- Build: PASS
- Test (Vitest): PASS

## Note
Nessuna migrazione DB richiesta; modifiche non breaking.