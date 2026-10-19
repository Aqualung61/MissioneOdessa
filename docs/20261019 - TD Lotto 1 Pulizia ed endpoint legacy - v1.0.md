# TD Lotto 1 — Pulizia, endpoint legacy e tsconfig (v1.4.2)

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — approvata da Mauro Giorgi il 2026-10-19 (decisioni D-L1-1..3 in §6) |
| Data | 2026-10-19 |
| Issue | #124 (endpoint legacy), #125 (tsconfig NodeNext), #126 (pulizia); `Refs` su tutte e tre |
| Destinazione | `release/v1.4.2` |
| Baseline | `release/v1.4.2` @ `1d8ea71` (lotto 0) |
| Modello consigliato | Fase 1A e 1B: Claude Sonnet 5.5, effort medio. Fase 0 e Fase 2: Claude Sonnet 5.5, effort basso |

## 1. Valutazione del rischio di regressione

**Livello: basso sul gioco, medio sul contratto HTTP (modifica voluta).** Il motore e il parser non cambiano. Cambiano le route: due endpoint spariscono e due diventano disponibili solo fuori produzione.

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Gioco | Nullo | Nessuna modifica a `engine.js`, `parser.js`, `turnEffects/`, dati JSON, frontend | Istantanea delle risposte, tracce, percorsi completi identici (criteri del piano) |
| Contratto HTTP | Medio, voluto | `POST /api/engine/set-location` e `POST /api/parser/parse` rispondono 404; `GET /api/parser/stats` e `POST /api/parser/reload` rispondono 404 in produzione | Il frontend non li usa (verificato su `web/`); in produzione i primi due sono già disabilitati (`DISABLE_LEGACY_ENDPOINTS=1` dal 2026-10-19); test dedicati |
| Test esistenti | Medio, atteso | 4 file di test usano gli endpoint rimossi | Modifiche dichiarate in §4, una per file, con lo stesso scopo del test originale |
| `tsconfig` | Basso | Cambia la risoluzione dei moduli per il typecheck | `npm run typecheck` e `npm run build` già verificati con NodeNext su `85edb5e` |
| Strumenti e documentazione | Basso | Script, `AGENTS.md`, README, `.env.example` | Revisione del diff |

## 2. Obiettivi

1. Rimuovere gli endpoint legacy e il loro meccanismo di disattivazione.
2. Rendere `stats` e `reload` del parser disponibili solo fuori produzione.
3. Migrare `tsconfig.json` a NodeNext.
4. Rimuovere codice e configurazione morti: `src/tests/`, `check:nav`, riferimenti obsoleti.
5. Allineare documentazione e configurazione di esempio.

**Fuori perimetro** (spostato rispetto al piano, con motivazione):
- **helper duplicati** (`hasFonteLuceAttiva`, `normalizeForComparison`): vivono dentro la closure di `createEngine` che il lotto 4a riorganizza. Deduplicarli ora toccherebbe `engine.js` due volte; si fanno nel lotto 4a;
- **parametro `dbPath` di `parseCommand`** e commenti correlati nelle route: lotto 2;
- **etichette "Stub"** e commenti SQLite in `engine.js` e `parser.js`: si correggono quando il lotto che possiede il file lo tocca (2 per il parser, 4a per il motore), per non aprire diff su file critici solo per commenti.

## 3. Soluzione

### 3.1 Endpoint legacy

| File | Modifica |
|---|---|
| `src/api/engineRoutes.js` | Rimuovere la route `POST /set-location` per intero (commento a riga 271 e route da riga 272 fino alla riga prima di `router.post('/save-client-state'` a riga 377, su `1d8ea71`), compreso l'uso di `DISABLE_LEGACY_ENDPOINTS`. Rimuovere anche `isTruthy` (riga 27), usata solo lì |
| `src/api/parserRoutes.js` | Rimuovere la route `POST /parse`, `markLegacy`, `legacyDisabledAsParseResult`, `isTruthy` e gli import non più usati (`parseCommand`, `validateCommandInput`) |
| `src/server.js` | Rimuovere `app.use(BASE_PATH + '/api/parser/parse', parsingLimiter)`. Gli altri limiter restano |
| `.env.example` | Rimuovere il blocco `DISABLE_LEGACY_ENDPOINTS` (commento compreso) |

Dopo la rimozione, i due percorsi rispondono come qualunque route inesistente: nel server reale con il catch-all (`404` con `web/404.html`), in un'app di test senza catch-all con il 404 predefinito di Express. Non si aggiunge un gestore 404 JSON per `/api/*`: sarebbe un cambio di comportamento per tutte le route inesistenti, fuori perimetro.

`validateCommandInput({ mode: 'parser' })` in `src/middleware/validation.js` resta invariato: lo usa `tests/api.validation.test.ts` con route proprie. La pulizia del middleware si valuta nel lotto 5.

### 3.2 `stats` e `reload` solo fuori produzione

In `src/api/parserRoutes.js`, un middleware applicato a entrambe le route:

```js
function notInProduction(req, res, next) {
  if (process.env.NODE_ENV === 'production') return next('router');
  return next();
}
router.get('/stats', notInProduction, async (req, res, next) => { /* invariato */ });
router.post('/reload', notInProduction, async (req, res, next) => { /* invariato */ });
```

- Il controllo avviene **a ogni richiesta**, non al caricamento del modulo: i test possono cambiare `NODE_ENV` senza reimportare il router.
- `next('router')` esce dal router: la richiesta prosegue verso le route successive e finisce nel 404 come una route inesistente. Non si rivela che l'endpoint esiste.
- Il contenuto delle due route non cambia (compreso il campo `dbPathResolved`, che si rivede nel lotto 2).
- `heavyLimiter` su `/api/parser/reload` in `server.js` resta.

### 3.3 `tsconfig.json`

- `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`. Nessun `ignoreDeprecations`.
- `tsconfig.build.json` invariato.
- Verificato su `85edb5e`: `npm run typecheck` passa. Il `tsconfig.json` completo, che include i test e non è controllato in CI, aveva 653 errori con node10 e 805 con NodeNext. Non si correggono: il report di Fase 1A riporta il conteggio effettivo prima e dopo.
- Dopo la modifica, in VSCode: "TypeScript: Select TypeScript Version" → "Use Workspace Version" (indicazione per Mauro, nessun file).

### 3.4 Codice e configurazione morti

| Elemento | Azione |
|---|---|
| `src/tests/` (6 file: `api-test.js`, `db-populate.test.ts`, `index.ts`, `print-lingua-structure.ts`, `smoke.test.ts`, `sqlite-lingua-example.ts`) | Eliminare la cartella. Non è inclusa da Vitest, importa `sqlite3` e `sqlite` (non tra le dipendenze), nessun file la importa. Le esclusioni di `src/tests/**` in `tsconfig.build.json`, `eslint.config.js` e `vitest.config.ts` restano: senza oggetto ma innocue, e toglierle allargherebbe il diff |
| `src/git-sync.ts` e `src/git-sync.js` | Eliminare (D-L1-1). Script interattivo che esegue `git` (commit e push) da `src/`, non referenziato da nessun file né script npm. Le esclusioni `src/git-sync.*` in `eslint.config.js` e `vitest.config.ts` restano, come quelle di `src/tests/**` |
| `package.json`, script `check:nav` | Rimuovere (punta a `scripts/check-nav-voci.js`, eliminato in `766f12e`; il controllo è in `tests/lexicon.nav-voices.test.ts`) |
| `AGENTS.md` riga 75 (`npm run check:nav`) | Sostituire con: `Navigation vocabulary check: covered by tests/lexicon.nav-voices.test.ts (part of npm test).` |
| `AGENTS.md` riga 122 | Togliere `` `npm run check:nav`, `` dall'elenco |
| `.github/copilot-instructions.md` riga 24 | Togliere `DISABLE_RUN_TESTS` dall'esempio di flag |
| `eslint.config.js`, ignores globali | Aggiungere `'Claude decompiler/'` (cartella locale ignorata da git; oggi produce 45 avvisi in locale e nessuno in CI) |
| `scripts/smoke_i18n_http.mjs` | Rimuovere i passi `engine.set-location.24` e `parser.parse.legacy`. Il passo `execute.MOVE_PAINTING` resta: senza il posizionamento al luogo 24 il messaggio sarà diverso, ed è uno script di prova manuale |

`AGENTS.md` è un documento approvato: questa TD autorizza solo le due modifiche indicate.

### 3.5 Documentazione

| File | Modifica |
|---|---|
| `README.md`, sezione "Rate limiting API" | Togliere `POST /api/parser/parse` dagli endpoint con limiter stretto |
| `README.md`, sezione "Endpoint legacy (deprecati)" | Sostituire con una nota breve: gli endpoint `set-location` e `parser/parse` sono stati rimossi nella v1.4.2; l'input passa solo da `POST /api/engine/execute`; `GET /api/parser/stats` e `POST /api/parser/reload` sono disponibili solo con `NODE_ENV` diverso da `production`. La sottosezione "Limite turni (alba)" resta |
| `docs/release-notes/Unreleased.md` | Voci del lotto 1 nella sezione v1.4.2 |
| `RELEASE_NOTES.md` | Invariato (storico) |

## 4. Test

**Modifiche ai test esistenti** (dichiarate; nessun altro test esistente si modifica):

| File | Azione | Motivo |
|---|---|---|
| `tests/api.parser.parse.contract.test.ts` (5 test) | Eliminare | Contratto di un endpoint rimosso |
| `tests/api.legacy.endpoints.disabled.test.ts` (2 test) | Eliminare e sostituire con `tests/api.legacy.endpoints.removed.test.ts` | Il meccanismo di disattivazione non esiste più |
| `tests/api.engine.navigation.http.test.ts` (5 posizionamenti con `set-location`) | Sostituire il solo posizionamento iniziale: snapshot reale (`GET /api/engine/state`) con `currentLocationId` e `visitedPlaces` modificati, caricato con `POST /api/engine/load-client-state` (`odessaData: { Luoghi: [] }`). Asserzioni invariate. Se un caso dipendeva dall'"ingresso" nel luogo eseguito da `set-location` (per esempio il luogo terminale), posizionarsi nel luogo adiacente e raggiungerlo con un comando di movimento via `/execute`, mantenendo le stesse asserzioni finali | Stesso scopo del test, senza l'endpoint rimosso |
| `tests/api.engine.multisession.isolation.test.ts` | Sostituire `set-location` con movimenti reali: sessione A `e` (→ 2), sessione B `e`, `e` (→ 3). Asserzioni invariate | Idem |
| `tests/characterization.engine.state.test.ts` (protetto) | Solo il commento che rimanda a un file di `Claude decompiler/`: sostituirlo con il riferimento alla TD del lotto 0 in `docs/` | Riferimento a un file fuori dal repository |

**Nuovi test** — `tests/api.legacy.endpoints.removed.test.ts`:
1. `POST /api/engine/set-location` → 404;
2. `POST /api/parser/parse` → 404;
3. con `NODE_ENV=production`: `GET /api/parser/stats` e `POST /api/parser/reload` → 404;
4. con `NODE_ENV` diverso da `production`: `GET /api/parser/stats` → 200 con `byType`; `POST /api/parser/reload` → 200 `{ ok: true }`;
5. `NODE_ENV` ripristinato dopo ogni test.

App di test: `express.json()`, router `/api/engine` e `/api/parser`, nessun catch-all (404 predefinito di Express).

**Invariati e da rieseguire**: istantanea delle risposte (SHA `97a62ceb…`), corpus del parser, tracce del motore e HTTP, percorsi completi, compatibilità dei salvataggi, caratterizzazione.

## 5. Criteri di accettazione

| # | Criterio |
|---|---|
| AC-1 | Nessuna modifica in `src/logic/`, `src/data-internal/`, `web/` |
| AC-2 | Istantanea delle risposte, corpus, `engine_trace.json`, `http_trace.json` invariati e i rispettivi test passano senza modifiche |
| AC-3 | Nessun riferimento residuo a `set-location`, `parser/parse`, `DISABLE_LEGACY_ENDPOINTS`, `check:nav`, `check-nav-voci`, `DISABLE_RUN_TESTS` fuori da `docs/`, `RELEASE_NOTES.md` e `tests/api.legacy.endpoints.removed.test.ts` (ricerca testuale nel report) |
| AC-4 | `tests/api.legacy.endpoints.removed.test.ts` passa |
| AC-5 | `tsconfig.json` con NodeNext; `npm run typecheck` e `npm run build` PASS; conteggio errori di `npx tsc -p tsconfig.json --noEmit` prima e dopo, nel report |
| AC-6 | `npm run lint` uscita 0; avvisi attesi 14 `complexity`, 9 `max-lines-per-function`, 3 `max-depth` (la route `set-location` rimossa valeva 16 di complessità e 81 righe); ogni altro scostamento va spiegato |
| AC-7 | `npm test` PASS; il numero di test cala solo per i file eliminati di §4 e cresce per quelli nuovi; nessun nuovo skip |
| AC-8 | Prova manuale su `localhost:3001` (§7) |
| AC-9 | Diff limitato ai file di §3 e §4 |

## 6. Decisioni (approvate il 2026-10-19)

| # | Decisione | Esito |
|---|---|---|
| D-L1-1 | `src/git-sync.ts` / `.js` | **Eliminati.** Recuperabili dalla storia git (`git show e6bf84f:src/git-sync.ts`) |
| D-L1-2 | Risposta degli endpoint rimossi | **404 come qualunque route inesistente**: nel server reale la pagina `web/404.html` del catch-all, nei test il 404 di Express. Nessun 410 permanente, nessun 404 JSON dedicato |
| D-L1-3 | Helper duplicati, `dbPath`, commenti "Stub" e SQLite | **Rinviati** ai lotti 2 (parser) e 4a (motore). Nota per il lotto 2: `parseCommand(null, …)` è chiamata in 27 file di test, quasi tutti protetti; la rimozione di `dbPath` va progettata con un involucro compatibile che lasci invariati i test protetti |
| — | Etichette delle issue | `type:chore` al posto di `type:feature` per #63, #124, #125, #126; `area:api` al posto di `area:engine` per #124; `documentation` in più per #126. Applicate nella Fase 1A di HO-19 |

## 7. Prova manuale (Mauro, `localhost:3001`)

1. `npm run dev`: partita breve (movimento, prendi, inventario, salva, carica).
2. `curl.exe -s -o NUL -w "%{http_code}" -X POST http://localhost:3001/api/engine/set-location` → `404`.
3. `curl.exe -s http://localhost:3001/api/parser/stats` → JSON con `byType`.
4. Riavvio con `$env:NODE_ENV="production"; npm start` (con `API_AUTH_DISABLED=1` se `API_KEY` non è impostata in locale): `curl.exe -s -o NUL -w "%{http_code}" http://localhost:3001/api/parser/stats` → `404`; il gioco funziona.
5. Ripristino: `Remove-Item Env:NODE_ENV`.
