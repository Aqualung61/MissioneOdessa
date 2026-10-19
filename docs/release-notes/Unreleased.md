# Missione Odessa – Release Notes (Unreleased)

Data: TBA
Branch: `release/v1.4.2`

## v1.4.2 — lotto 0: rete di caratterizzazione

### Sintesi
Refactor del motore, lotto 0: rete di caratterizzazione, nessuna modifica al gioco.

### Modifiche
- Traccia dello stato del motore (42 scenari, 895 passi) e traccia HTTP (8 scenari, 312 richieste) confrontate con fixture registrati sulla v1.4.1, per fissare il comportamento attuale prima del refactor (#63).
- Compatibilità dei salvataggi v1.4.1: formato di salvataggio e caricamento invariati, verificati su un salvataggio al passo 91 del percorso completo IT.
- Test di caratterizzazione sui rami non coperti del motore (azioni, interazioni, stato), del parser e degli effetti di turno, prima che il refactor li tocchi.
- Regole ESLint di complessità in modalità avviso su `src/**/*.js` (passo 1 della #63); strumento di copertura (`npm run test:coverage`) e misure di base per confrontare i lotti successivi.
- Nessun file in `src/` o `web/` modificato: il gioco in produzione resta identico alla v1.4.1.

## v1.4.2 — lotto 1: pulizia ed endpoint legacy

### Sintesi
Rimozione degli endpoint legacy del motore e del parser, limitazione di `GET /api/parser/stats`/`POST /api/parser/reload` fuori produzione, migrazione di `tsconfig.json` a NodeNext, pulizia di codice e configurazione morti. Nessuna modifica al motore, al parser o ai dati di gioco.

### Modifiche
- Rimossi `POST /api/engine/set-location` e `POST /api/parser/parse` (il frontend non li usava): rispondono come qualunque route inesistente. Rimosso il meccanismo `DISABLE_LEGACY_ENDPOINTS` (header `Deprecation`/`Sunset` compresi) (#124).
- `GET /api/parser/stats` e `POST /api/parser/reload` disponibili solo con `NODE_ENV` diverso da `production` (#124).
- `tsconfig.json` migrato da `module`/`moduleResolution` `node10` a `NodeNext` (#125).
- Rimossi `src/tests/` (file morti, dipendenza `sqlite3` non installata), `src/git-sync.ts`/`.js` (script interattivo non referenziato), lo script `check:nav` e i riferimenti correlati (#126).
- Documentazione e configurazione di esempio aggiornate di conseguenza (README, `.env.example`, `AGENTS.md`).

## v1.4.2 — lotto 2: parser (scomposizione e nuova firma)

### Sintesi
Riscritto l'interno di `src/logic/parser.js` (complessità 38 e 53 su `3c1a379`): nuova funzione `parseInput(input, gameState)` senza il parametro `dbPath`, `ensureVocabulary` e la pipeline di analisi scomposte in funzioni sotto le soglie ESLint. Comportamento invariato, protetto da una nuova istantanea completa del parser (12.966 casi) e del vocabolario (217 token IT, 151 EN).

### Modifiche
- Nuova `parseInput(input, gameState = null)`; `parseCommand(dbPath, input, gameState)` resta come involucro `@deprecated` (#63).
- `ensureVocabulary` scomposta in 8 funzioni di modulo (`lexiconSource`, `loadLexiconRows`, `mapTipoToCommandType`, `normalizeForComparison`, `buildLocalizedNounConcepts`, `buildActionCanonicalConcepts`, `buildTokenMap`, `applyCanonicalForms`); pipeline di `parseInput` in passi (`validateRawInput`, `tokenize`, `parseSingleToken`, `parseCompoundNoun`, `parseTwoTokens`) con costruttori di risultato condivisi per CARICA e per ACTION+nome (#63).
- `src/api/engineRoutes.js` e `scripts/measure-session-memory.mjs` passati a `parseInput`; rimosso il campo `dbPathResolved` da `GET /api/parser/stats` e i commenti SQLite/`dbPath` obsoleti (#63, #126).
- Nuove istantanee protette: `tests/parser.full.test.ts` (ParseResult completo, 12.966 casi + 10 input non stringa) e `tests/parser.vocabulary.test.ts` (vocabolario IT/EN).

## Quality gates
- Build: PASS
- Test (Vitest): PASS (477 passed, 17 skipped)
- Lint: PASS (uscita 0) — 12 avvisi `complexity`, 7 `max-lines-per-function`, 3 `max-depth` in `src/` (da 14/9/3 prima del lotto 2)

## Note
- Dopo il deploy della v1.4.2, eliminare la variabile `DISABLE_LEGACY_ENDPOINTS` da Railway (impostata a `1` il 2026-10-19 come misura provvisoria, non più necessaria).
- Dettagli completi (copertura prima/dopo, rami residui, candidati issue, misure, tempi): vedi i report delle issue #63 (lotti 0 e 2) e #124/#125/#126 (lotto 1).
