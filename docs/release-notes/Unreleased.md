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

## v1.4.2 — lotto 3: configurazione di gioco

### Sintesi
I parametri specifici di Odessa (ID di luoghi e oggetti con ruolo speciale, regole numeriche, insiemi lessicali, punteggio e ranghi) sono stati spostati da letterali sparsi nel codice a un unico file dati, `src/data-internal/Configurazione.json`, caricato da un modulo dedicato. Comportamento invariato, protetto dalle reti esistenti e da una nuova suite di test sulla configurazione.

### Modifiche
- Nuovo `src/data-internal/Configurazione.json` (versionato, convalidato all'avvio) con le sezioni `luoghi`, `oggetti`, `regole`, `punteggio`, `lessico` (#63).
- Nuovo caricatore generico `src/logic/core/gameConfig.js` (`loadGameConfig`, validazione di schema e delle chiavi richieste, congelamento in profondità, `rankKeyFor`) e `src/game/odessa/config.js` (`CONFIG` di Odessa, caricato all'importazione del modulo; un file mancante o non valido impedisce l'avvio del server con un messaggio esplicito).
- Sostituiti in `src/logic/engine.js`, `src/logic/parser.js`, `src/api/engineRoutes.js` e nei 7 moduli di `src/logic/turnEffects/` i letterali specifici di Odessa (luogo iniziale, barriera, pesa, cassaforte, zone aperte, passaggio crollato, movimenti bloccati con testo dedicato, macerie esaminabili, torcia/lampada/fiammiferi/badile/documenti, limiti e timer, punteggi, ranghi, verbi bloccati al buio e senza oggetto) con letture da `CONFIG` (#63, #123).
- Rimossa la cascata locale `computeRankKey` di `engineRoutes.js`, sostituita dalla funzione condivisa `rankKeyFor`.
- Nuova `tests/gameConfig.test.ts`: caricamento e congelamento di `CONFIG`, validazione (chiave di primo livello e chiave annidata mancante, ID non intero, `versione` errata), coerenza di tutti gli ID e le chiavi di messaggio citati in `Configurazione.json` con i dati reali (`Luoghi.json`, `Oggetti.json`, `MessaggiSistema.json`, `TerminiLessico.json`), equivalenza di `rankKeyFor` con la cascata per ogni punteggio da 0 a 140.
- Nessuna modifica a `src/initOdessa.js`: la configurazione non passa da `global.odessaData`, indipendente dall'ordine di inizializzazione.

## v1.4.2 — lotto 4a: contesto, dispatch e gestori di verbo

### Sintesi
`executeCommandLegacy` (complessità 155) è sostituita da un contesto di esecuzione, un `dispatch` e 27 gestori di verbo in ordine di precedenza vincolante. Comportamento invariato, protetto dalle reti esistenti (istantanea risposte, tracce motore e HTTP, parser, salvataggi, caratterizzazione, percorsi completi con 138 punti).

### Modifiche
- Nuovi moduli generici in `src/logic/core/` (`gameData`, `context`, `dispatch`, `command`, `handlers/*`) e specifici in `src/game/odessa/` (`index`, `rules`, `handlers/*`): `createEngine(game = odessaGame)`, API di `engine.js` invariata (#63).
- Le letture di `global.odessaData` in `engine.js` passano da `getGameData()`; `hasFonteLuceAttiva` unificata in `rules.hasActiveLight` (riesportata da `torchEffect.js`); derivazione dei flag dei salvataggi in `rules.deriveLoadedFlags`.
- Rimosso codice morto: casi `SU/GIU/GIÙ` della mappa direzioni e stub `default` di SYSTEM.
- Nuova regola ESLint `no-restricted-imports` (error) su `src/logic/core/**` verso `**/game/**`; nuovo `tests/architecture.test.ts` (dipendenze, ordine dei gestori, copertura del lessico, equivalenza `createEngine()`/`createEngine(odessaGame)`).

## v1.4.2 — lotto 4b: interazioni

### Sintesi
`verificaPrerequisiti` (complessità 23), `applicaEffetti` (21), `cercaEseguiInterazione` (30, 103 righe) e `assegnaPunteggioMistero` escono da `engine.js`: un ciclo generico in `core/` e registri di prerequisiti ed effetti nel gioco. Comportamento invariato, protetto da istantanea delle risposte, tracce motore e HTTP, salvataggi, caratterizzazione e percorsi completi (138 punti).

### Modifiche
- Nuovo `src/logic/core/interactions.js` (ricerca ed esecuzione delle interazioni, sequenze, punteggio di interazione, risultato) e, in `src/game/odessa/`, i registri `interactions/prerequisites.js` (8 tipi) e `interactions/effects.js` (9 tipi), `scoring.js` (punteggio dei misteri) e le regole `toggleResponseVerbs` e `sequence` in `rules.js` (#63).
- La ricerca nei registri usa `Object.hasOwn`: un tipo che coincide con una proprietà ereditata (es. `toString`) produce l'avviso di tipo sconosciuto come prima.
- `warnUnknownTypeOnce` spostata in `core/` (stesso testo e stessa memoria per processo); `getNestedProperty`, `setNestedProperty`, `consumaFiammifero` esposte ai gestori tramite `helpers`.
- Nuovo `tests/interactions.registry.test.ts`: chiavi dei registri uguali a quelle di `interactionSchema.js` in entrambe le direzioni, voci tutte funzioni, verbi con risposta di apertura/chiusura coerenti con i dati, tipi ereditati.
- Anomalia nota trascritta senza correzione: il completamento della combinazione della cassaforte conta come "mistero risolto" (D-4b-4).

## Quality gates
- Build: PASS
- Test (Vitest): PASS (507 passed, 17 skipped prima del lotto 4b; 515 passed, 17 skipped dopo, incluso `tests/interactions.registry.test.ts`)
- Lint: PASS (uscita 0) — 8 avvisi `complexity`, 5 `max-lines-per-function`, 1 `max-depth` in `src/` (da 11/6/3 prima del lotto 4b; nessun avviso nei file nuovi)

## Note
- Dopo il deploy della v1.4.2, eliminare la variabile `DISABLE_LEGACY_ENDPOINTS` da Railway (impostata a `1` il 2026-10-19 come misura provvisoria, non più necessaria).
- Dettagli completi (copertura prima/dopo, rami residui, candidati issue, misure, tempi): vedi i report delle issue #63 (lotti 0, 2 e 3) e #124/#125/#126 (lotto 1).
