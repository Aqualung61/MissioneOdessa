# TD Lotto 0 — Rete di caratterizzazione e misure di base (v1.4.2)

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — approvata da Mauro Giorgi il 2026-10-19 |
| Data | 2026-10-19 |
| Issue | #63 (`Refs #63`, lotto 0 di 5) |
| Destinazione | `release/v1.4.2`, da creare da `main` @ `85edb5e` in Fase 2 |
| Baseline | `main` @ `85edb5e` (v1.4.1) |
| Modello consigliato | Fase 1A: Claude Sonnet 5.5, effort medio. Fase 1B (test di caratterizzazione): Claude Opus 5.5, effort alto. Fase 2: Claude Sonnet 5.5, effort basso |

## 1. Valutazione del rischio di regressione

**Livello: nullo sul gioco, basso sul progetto.** Nessun file in `src/` né in `web/` cambia. Cambiano solo test, dati di test, configurazione di ESLint e Vitest, `package.json` (una dipendenza di sviluppo e uno script) e `.gitignore`.

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Gioco in produzione | Nullo | Nessuna modifica a codice o dati del gioco | Diff limitato all'elenco di §6 |
| Suite e CI | Basso | Circa 1.200 comandi in più (traccia del motore ~1,7 s, traccia HTTP ~1 s su Node 22); nuovi test di caratterizzazione | Tempo della suite misurato prima e dopo (§3.7); CI su Node 18.20.x e 20.x deve passare |
| Dipendenze | Basso | `@vitest/coverage-v8` come dipendenza **di sviluppo**, versione esatta `4.0.5` (uguale a `vitest` nel lockfile) | Nessuna dipendenza di produzione; diff del lockfile limitato al pacchetto e alle sue dipendenze |
| Lint | Basso | Le nuove regole sono avvisi: `npm run lint` resta con uscita 0 | Numero di avvisi registrato come baseline |
| Falsi allarmi futuri | Medio, voluto | La traccia confronta ogni passo: qualunque cambiamento di stato o di risposta la fa fallire | È lo scopo. Nessuna modalità di aggiornamento automatico (§3.3) |

## 2. Obiettivi

1. **Traccia dello stato del motore**: 42 scenari, 895 passi; dopo ogni comando, risposta e stato confrontati con un fixture registrato sulla v1.4.1.
2. **Traccia HTTP**: 8 scenari, 312 richieste attraverso i router di produzione; stato HTTP e corpo della risposta confrontati con un fixture.
3. **Compatibilità dei salvataggi v1.4.1**: un salvataggio prodotto dalla v1.4.1 si carica e la partita si completa; il formato di salvataggio prodotto oggi coincide con quello registrato.
4. **Test di caratterizzazione** sui rami non coperti del motore e del parser, prima che il refactor li tocchi.
5. **Regole ESLint di complessità** in modalità avviso (passo 1 della #63).
6. **Strumento di copertura** e **misure di base** per confrontare i lotti successivi.

Non sono obiettivi: correggere difetti trovati (si registrano, §3.4), cambiare test esistenti, toccare `web/`.

## 3. Soluzione

### 3.1 Materiale fornito (in `Claude decompiler/`, da non committare)

| File | Uso |
|---|---|
| `engine_trace.json` | Fixture della traccia del motore, **da copiare senza modifiche** in `tests/fixtures/trace/` |
| `http_trace.json` | Fixture della traccia HTTP, **da copiare senza modifiche** in `tests/fixtures/trace/` |
| `save_v141_full_it_step91.json` | Salvataggio v1.4.1 al passo 91 del percorso completo IT, nel formato di `POST /api/engine/save-client-state`, **da copiare senza modifiche** in `tests/fixtures/trace/` |
| `scenarios.mjs` | Definizione degli scenari, **da copiare senza modifiche** in `tests/testUtils/traceScenarios.mjs` |
| `gen_trace.mjs`, `gen_http_trace.mjs` | Generatori di riferimento: specifica eseguibile dell'algoritmo di §3.2. Restano fuori dal repository |
| `gen_responses.mjs` | Script di verifica dell'istantanea delle risposte (uso mio, §7). Resta fuori dal repository |

SHA-256 dei file forniti (fixture generati su `85edb5e`, riprodotti identici in Node 18, 20 e 22 e dentro Vitest):

| File | SHA-256 |
|---|---|
| `engine_trace.json` | `dfbe5a46f811bd8cc1c664eea646ff3e90f865ecdd1b13e216ae4a6a2743ab81` |
| `http_trace.json` | `db892c311dadd6360a4c91b01e5a2521315262b128e51d121618ddac1e858b17` |
| `save_v141_full_it_step91.json` | `0a79e4ead45ed9f330891452ff0781bd9bbf0e0f1193cb9f02d7c432e896abbe` |
| `scenarios.mjs` (→ `traceScenarios.mjs`) | `74ece5aba97345a3762a22e6437dd68da72671e385d4bfade56424de6f594b18` |

Prima di copiarli, verificare lo SHA-256 di ciascun file (`Get-FileHash -Algorithm SHA256` in PowerShell). Se non coincide, fermarsi e segnalarlo.

### 3.2 Generazione della traccia nei test — `tests/testUtils/trace.ts`

Porta in TypeScript l'algoritmo dei due generatori di riferimento, senza cambiarne il risultato. Esporta:

- `generateEngineTrace(): Promise<Trace>`;
- `generateHttpTrace(): Promise<Trace>`.

Regole, tutte presenti nei generatori di riferimento:

1. **Solo API pubblica**: `initOdessa`, `loadMessaggiSistema`, `ensureVocabulary`, `parseCommand`, `createEngine` (con `initializeOriginalData` e `resetGameState`), `getGameState`, `getGameStateSnapshot`, `setGameState`, `executeCommand`; per HTTP i router `engineRoutes.js` e `routes.js` ed `errorHandler`, montati su un'app Express in-process. Nessun accesso a funzioni interne.
2. **Motore nuovo per scenario** (`createEngine()`), mai l'istanza di default del modulo.
3. **Normalizzazione**: dallo snapshot si tolgono `timestamp` e `version`; nel corpo HTTP gli stessi campi da corpo, `state` e `gameState`.
4. **JSON canonico**: chiavi ordinate; `Set` e `Map` come array/oggetti; funzioni e `undefined` omessi.
5. **Per ogni passo**: `parse` (riassunto), `result` (canonico), `state` (vista compatta), `sha` (SHA-256 del canonico di `{parsed, result, state}`; per HTTP di `{status, body}`). La vista compatta serve a leggere le differenze; lo `sha` intercetta tutto il resto.
6. **Variabili d'ambiente** degli scenari (`GAME_MAX_TURNS_CONSUMED`) impostate solo durante lo scenario e poi ripristinate.
7. **Scenari** letti da `traceScenarios.mjs` per il motore. Gli scenari HTTP sono definiti in `trace.ts` copiando quelli di `gen_http_trace.mjs`, nello stesso ordine e con gli stessi input.

Criterio: `generateEngineTrace()` e `generateHttpTrace()` devono produrre, passo per passo, gli stessi valori dei fixture forniti. Non è richiesto che il file serializzato sia identico byte per byte.

### 3.3 Test della traccia

| File | Contenuto |
|---|---|
| `tests/trace.engine.test.ts` | Genera la traccia del motore e la confronta con `engine_trace.json`: stesso numero di scenari e passi; per ogni passo `input`, `parse`, `result`, `state`, `sha` uguali. Su differenza: scenario, passo, input, campo, valore prima e dopo (prime 20 differenze) |
| `tests/trace.http.test.ts` | Lo stesso per `http_trace.json` |

- Nessuna modalità di aggiornamento (niente variabile tipo `UPDATE_TRACE`). Nella v1.4.2 la traccia non si rigenera; se in futuro servirà, la modalità si aggiunge con una TD.
- Timeout esteso come in `responses.snapshot.test.ts`.
- Intestazione con riferimento a questa TD e alle regole di manutenzione, come nei test protetti esistenti.

### 3.4 Compatibilità dei salvataggi — `tests/saves.compat.test.ts`

1. **Formato invariato**: una partita portata al passo 91 di `full_it` e salvata con `POST /api/engine/save-client-state` (`luoghi: []`) produce un corpo uguale a `save_v141_full_it_step91.json`, esclusi `timestamp` e `version` (anche dentro `gameState`).
2. **Caricamento v1.4.1 dal motore**: `setGameState(save.gameState)` su un motore nuovo, poi i passi 92–147 di `full_it`: vittoria, punteggio 138, 147 turni.
3. **Caricamento v1.4.1 via HTTP**: `POST /api/engine/load-client-state` con il fixture in una sessione IT, poi i passi 92–147 via `/execute`: stesso esito.

Il caricamento del salvataggio v1.4.0 è già coperto da `timers.original.test.ts` (TB-19) e dallo scenario `S-ripresa-v140` della traccia.

### 3.5 Test di caratterizzazione — `tests/characterization.*.test.ts`

Scopo: fissare il comportamento attuale dei rami che il refactor toccherà e che oggi nessun test esercita.

**Copertura di partenza** (suite esistente, misurata il 2026-10-19 con `@vitest/coverage-v8` 4.0.5):

| File | Righe | Rami | Rami non coperti |
|---|---|---|---|
| `src/logic/engine.js` | 95,8% | 82,1% | 161 su 899 |
| `src/logic/parser.js` | 99,3% | 88,5% | 21 su 183 |
| `src/api/engineRoutes.js` | 61,8% | 54,5% | — |
| `src/api/routes.js` | 0% | 0% | — |

Rami non coperti di `engine.js` per funzione: `setGameState` 23, `verificaPrerequisiti` 4, `applicaEffetti` 8, `cercaEseguiInterazione` 2, `executeCommandLegacy` 36, `executeCommand` 24 (in gran parte la traccia di debug), altre funzioni 64. La traccia del lotto 0 da sola copre il 76% dei rami di `engine.js`: sommata alla suite, la copertura sale, ma va misurata.

**Obiettivi di copertura dei rami** (suite completa, lotto 0 incluso):

| Ambito | Obiettivo |
|---|---|
| `engine.js` complessivo | ≥ 90% |
| `executeCommandLegacy`, `cercaEseguiInterazione`, `verificaPrerequisiti`, `applicaEffetti`, `setGameState`, `executeCommand` | ≥ 90% ciascuna, oppure ramo residuo elencato con motivo |
| `parser.js` | ≥ 92% |
| `src/logic/turnEffects/*` | ≥ 90% ciascuno |
| `engineRoutes.js`, `routes.js` | ≥ 80% righe (la traccia HTTP ne copre la maggior parte) |

**Regole**:
1. Si usa il gioco reale: `parseCommand` + `executeCommand` o la rete HTTP. Lo stato di partenza si costruisce con comandi o con `setGameState` partendo da uno snapshot reale; non si chiamano funzioni interne.
2. Ogni test verifica il comportamento osservabile: `resultType`, messaggio (tramite chiave con `getSystemMessage`, non testo scritto a mano), campi di stato rilevanti.
3. Ogni test indica nel nome la funzione e il ramo (per esempio `executeCommandLegacy — SCAVA senza nome nel luogo 32 senza badile`).
4. Un ramo irraggiungibile o difensivo non si forza: si elenca nel report con il motivo.
5. **Se un test rivela un comportamento che sembra un difetto, il test fissa il comportamento attuale** e il caso va nel report come "candidato issue". Nessuna correzione.
6. La traccia di debug (`ENGINE_DEBUG=1`): un test per evento (`EXECUTE_COMMAND`, `EXECUTE_COMMAND_BLOCKED`), con la variabile ripristinata a fine test.

### 3.6 ESLint e copertura

**`eslint.config.js`**: nuovo blocco, solo per `src/**/*.js` (esclusi `src/tests/**`):

```js
{
  files: ['src/**/*.js'],
  ignores: ['src/tests/**'],
  rules: {
    complexity: ['warn', 15],
    'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
    'max-depth': ['warn', 4],
  },
},
```

`web/` resta escluso per decisione (complessità del frontend in una issue separata). `npm run lint` deve restare con uscita 0. Valori attesi, misurati da me con le stesse soglie: 15 funzioni sopra la complessità in `src/`, 10 sopra la lunghezza, 3 sopra la profondità. Il report di Fase 1B riporta il conteggio effettivo e segnala ogni scostamento.

**Copertura**:
- `package.json`: `@vitest/coverage-v8` in `devDependencies`, versione esatta `4.0.5`; script `"test:coverage": "vitest run --coverage"`.
- `vitest.config.ts`: blocco `coverage` con `provider: 'v8'`, `include: ['src/**/*.js']`, `exclude: ['src/tests/**', 'src/git-sync.*']`, `reporter: ['text', 'json-summary']`, `reportsDirectory: 'coverage'`. Attivo solo con `--coverage`: `npm test` non cambia.
- `.gitignore`: aggiungere `coverage/`.
- La CI non cambia.

### 3.7 Misure di base (report di Fase 1B, non committato)

| Misura | Come | Valore di riferimento (mio, Node 22, 2026-10-19) |
|---|---|---|
| Suite | `npm test` | 443 passed, 17 skipped, ~35 s |
| Copertura | `npm run test:coverage` | §3.5; tabella completa per file nel report |
| Complessità | `npx eslint src` | §3.6 e tabella del piano |
| Memoria per sessione | `node --expose-gc scripts/measure-session-memory.mjs` | 12,7 KB attiva, 0,36 KB dopo il rilascio |
| Generazione dell'istantanea | durata del test `responses.snapshot.test.ts` | ~8 s fuori da Vitest |
| Generazione delle tracce | durata dei due test di traccia | ~1,7 s motore, ~1 s HTTP |
| File protetti | SHA-256 dell'elenco di §5 | — |

Le misure valgono sulla macchina locale (Windows); vanno riportate con la versione di Node usata.

## 4. Test esistenti

**Nessun test esistente si modifica.** Il lotto aggiunge solo file. Qualunque test esistente che fallisce in Fase 1A è un'anomalia da segnalare, non da correggere.

## 5. File protetti dopo il merge

Si aggiungono all'elenco attuale (percorsi completi, `scoring.max`, `timers.original`, `matches`, `puzzles.r7`, corpus del parser, istantanea delle risposte, controllo della lingua):

- `tests/testUtils/**` (compreso `responseSnapshot.ts`, il generatore dell'istantanea);
- `tests/fixtures/trace/**`;
- `tests/trace.engine.test.ts`, `tests/trace.http.test.ts`, `tests/saves.compat.test.ts`;
- `tests/characterization.*.test.ts`.

Nei lotti successivi si modificano solo se la TD del lotto lo dichiara, con motivazione per ogni file.

## 6. Diff atteso

| File | Tipo |
|---|---|
| `tests/fixtures/trace/engine_trace.json`, `http_trace.json`, `save_v141_full_it_step91.json` | nuovi, copiati |
| `tests/testUtils/traceScenarios.mjs` | nuovo, copiato |
| `tests/testUtils/trace.ts` | nuovo |
| `tests/trace.engine.test.ts`, `tests/trace.http.test.ts`, `tests/saves.compat.test.ts` | nuovi |
| `tests/characterization.*.test.ts` | nuovi (uno o più file) |
| `eslint.config.js` | blocco aggiunto |
| `vitest.config.ts` | blocco `coverage` aggiunto |
| `package.json`, `package-lock.json` | dipendenza di sviluppo e script |
| `.gitignore` | `coverage/` |
| `docs/20261019 - TD Lotto 0 Rete di caratterizzazione - v1.0.md`, `docs/20261019 - TD 0 Architettura motore e regole - v1.0.md` | TD approvate |
| `docs/release-notes/Unreleased.md` | sezione v1.4.2 avviata |

Nessun altro file. In particolare nessun file in `src/`, `web/`, `tests/fixtures/walkthrough/`, `tests/fixtures/parser/`, `tests/fixtures/responses/`.

## 7. Criteri di accettazione

| # | Criterio |
|---|---|
| AC-1 | I tre fixture e `traceScenarios.mjs` hanno gli SHA-256 di §3.1 |
| AC-2 | `trace.engine.test.ts` e `trace.http.test.ts` passano senza modifiche ai fixture, su Node 20 in locale e in CI su 18.20.x e 20.x |
| AC-3 | `saves.compat.test.ts` passa |
| AC-4 | Obiettivi di copertura di §3.5 raggiunti, oppure rami residui elencati con motivo |
| AC-5 | `npm run lint` uscita 0; avvisi di complessità contati e confrontati con §3.6 |
| AC-6 | `npm run typecheck`, `npm run build`, `npm test` PASS; nessun test esistente modificato o saltato in più |
| AC-7 | Istantanea delle risposte invariata: SHA `97a62ceb94fa5a895e763e2d82b838a2d53fb480bda9a522ab53f1849b443170`, 88.151 voci |
| AC-8 | Diff limitato a §6 |
| AC-9 | Report con misure di §3.7, rami residui e candidati issue |

**Verifica indipendente (mia, sulla PR)**: worktree della PR, `npm ci`, suite completa; rigenerazione delle tracce con i generatori di riferimento e confronto degli SHA; rigenerazione dell'istantanea con `gen_responses.mjs`; SHA dei file protetti; lettura dei test di caratterizzazione per verificare che fissino il comportamento e non lo correggano.

## 8. Fasi

- **Fase 1A** (prerequisito: OneDrive in pausa): §3.1–§3.4 e §3.6. Esecuzione di `lint`, `typecheck`, `build`, `npm test`. Classificazione S/R di eventuali test falliti, senza toccarli. Stop e report.
- **Fase 1B** (dopo la mia conferma): §3.5 e §3.7; report con copertura, rami residui, candidati issue, misure.
- **Prova manuale**: non necessaria per il gioco (nessuna modifica a runtime). Facoltativa: avvio su `localhost:3001` e una partita breve, per escludere effetti di `package.json`.
- **Fase 2** (dopo la mia conferma):
  1. creare `release/v1.4.2` da `origin/main` (`85edb5e`) e pubblicarlo;
  2. ramo `issue-63/lotto-0-rete` da `release/v1.4.2`;
  3. commit dei file di §6 aggiunti uno per uno (mai `git add .`);
  4. PR con `--base release/v1.4.2`, corpo con `Refs #63` e il riepilogo del report.

## 9. Limiti noti

- La traccia copre 42 scenari scelti sulle regole e sui rami a rischio, non tutte le combinazioni di stato. Gli altri presidi restano: istantanea delle risposte (88.151 voci in 7 punti della partita), corpus del parser, percorsi completi.
- La traccia HTTP non registra le intestazioni; il lotto 1 cambierà proprio quelle legacy (`Deprecation`, `Sunset`), che non vanno quindi fissate.
- Comportamenti caratterizzati che potrebbero essere difetti, emersi generando la traccia (da registrare, non da correggere nella v1.4.2):
  - dopo FINE → sì → no, la partita risulta `ENDED` ma i comandi successivi vengono eseguiti normalmente (scenari `H-fine-e-termina`, `H-morte-e-riavvio`);
  - durante l'attesa di conferma, una risposta non riconosciuta restituisce `ERROR` con messaggio vuoto (`H-fine-e-riavvio`, passi 4 e 9).
