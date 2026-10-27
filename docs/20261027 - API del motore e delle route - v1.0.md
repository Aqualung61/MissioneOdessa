# API del motore e delle route — v1.0, 2026-10-27

Stato: descrizione del codice su `main` (merge della PR #169). Ogni affermazione rimanda a una riga di codice (`file:riga`) o a un test; ciò che non si può verificare in questo modo non è riportato. Il comportamento di riferimento è il codice: se cambia, questo documento si aggiorna.

I numeri di riga valgono per `main` al momento della pubblicazione e possono spostarsi con modifiche successive: fa fede il simbolo citato.

## 1. Motore

### 1.1 `createEngine`

`createEngine(game = odessaGame)` (`src/logic/engine.js`) crea un motore con stato proprio. Il contenitore interno è `eng = { game, state, originalOggetti }` e `eng.state` viene riassegnato da `resetGameState` e `setGameState`, quindi le funzioni lo rileggono a ogni chiamata. Restituisce 21 funzioni (`enterLocation`, `executeCommandAsync`, `confirmEnd`, `confirmRestart`, `initializeOriginalData`, `getGameState`, `resetGameState`, `shouldConsumeTurn`, `hasFonteLuceAttiva`, `prepareTurnContext`, `runPreExecutionChecks`, `applyTurnEffects`, `generateHelpMessage`, `generaDescrizioneLuogoConOggetti`, `getOggetti`, `getDirezioniLuogo`, `setGameState`, `setCurrentLocation`, `getGameStateSnapshot`, `toCommandDTO`, `executeCommand`).

Lo stesso modulo esporta le stesse 21 funzioni come API di modulo, che delegano a un motore di default creato all'importazione (`defaultEngine`). Il server le usa per l'avvio (`src/server.js`: `initializeOriginalData`, `resetGameState`); le route usano invece il motore della sessione (§2.1). Descrizione, parametri e valori restituiti di ciascuna funzione sono nel JSDoc di `src/logic/engine.js`.

### 1.2 Esecuzione di un comando

`executeCommand(parseResult)` (`src/logic/core/execute.js`) esegue, nell'ordine:

1. rifiuto di un `parseResult` assente o non valido (`rejectInvalidParse`);
2. `prepareTurnContext`;
3. `runPreExecutionChecks`: se il comando è bloccato, risponde con l'errore e, se il comando consuma turno, applica comunque gli effetti di turno;
4. `dispatch` dei gestori di verbo (`game.verbHandlers`) con un contesto nuovo (`createContext`);
5. se il comando consuma turno (NAVIGATION o ACTION; non SYSTEM): `applyTurnEffects`.

Il contesto (`src/logic/core/context.js`) contiene `state`, `game`, `msg(key, params)` (messaggio di sistema nella lingua corrente) e `helpers`.

### 1.3 Contratto di `odessaGame`

Un gioco è un oggetto con questi campi (`@typedef OdessaGame` in `src/game/odessa/index.js`):

| Campo | Contenuto | Usato da |
| --- | --- | --- |
| `id` | identificatore del gioco | — |
| `config` | configurazione (`CONFIG`, letta da `src/data-internal/Configurazione.json` e congelata) | stato iniziale, regole, gestori, effetti |
| `verbHandlers` | elenco ordinato di gestori `{ id, types, match?, run }`; vince il primo che restituisce un risultato non nullo | `dispatch` (`src/logic/core/dispatch.js`) |
| `prerequisiteTypes` | registro `tipo → (req, ctx) => boolean` | `verificaPrerequisiti` (`src/logic/core/interactions.js`) |
| `effectTypes` | registro `tipo → (effetto, ctx, env) => info \| undefined` | `applicaEffetti` (`src/logic/core/interactions.js`) |
| `turnEffects` | elenco ordinato di effetti `(gameState, result, parseResult)` | `applyTurnEffects` (`src/logic/core/turn.js`) |
| `rules` | `awardMystery`, `toggleResponseVerbs`, `sequence`, `hasActiveLight`, `deriveLoadedFlags`, `rankKey`, `isDangerZone`, `initialMatches`, `initialOpenStates`, `deriveLoadedGuardTimer`, `deriveLoadedTimers` | `core/interactions.js`, `core/state.js`, `core/turn.js`, `core/handlers/system.js`, `engineRoutes.js` |

Un tipo di prerequisito o di effetto che non è tra le chiavi proprie del registro è trattato come sconosciuto: il prerequisito non è soddisfatto, l'effetto non fa nulla, con un avviso una sola volta per tipo (`src/logic/core/interactions.js`, `warnUnknownTypeOnce`). Le funzioni di `rules` sono elencate in `src/game/odessa/rules.js`; i test `tests/architecture.test.ts` e `tests/interactions.registry.test.ts` verificano la coerenza degli elenchi e dei registri.

## 2. Route

### 2.1 Comportamento comune

- **Montaggio** (`src/server.js`): `BASE_PATH` (variabile d'ambiente, vuoto per default) precede tutti i percorsi sotto indicati.
- **Pubbliche** (prima dell'autenticazione): `GET /api/version` (riga 78) e `GET /api/config` (`registerApiConfigRoutes`, riga 83).
- **Autenticazione** (riga 126, `src/middleware/auth.js`): tutte le altre route sotto `/api` richiedono l'intestazione `X-API-Key` uguale a `API_KEY`. Senza chiave valida: 401 `{ ok: false, error: 'UNAUTHORIZED' }`. In produzione senza `API_KEY`: 500 `SERVER_MISCONFIGURED`. Con `API_AUTH_DISABLED` truthy l'autenticazione è saltata; fuori produzione senza `API_KEY` anche. Test: `tests/api.auth.test.ts`.
- **Limiti di frequenza** (righe 129-131, `src/middleware/rateLimiter.js`): 120 richieste al minuto su `/api`, 30 su `/api/engine/execute`, 5 su `/api/parser/reload`. Risposta al superamento: `{ ok: false, error: 'RATE_LIMITED' }`. `RATE_LIMIT_DISABLED` li disattiva. Test: `tests/api.ratelimit*.test.ts`.
- **Corpo JSON** (righe 112-121): limite `JSON_BODY_LIMIT` (predefinito `1mb`); oltre il limite 413 `{ ok: false, error: 'PAYLOAD_TOO_LARGE' }` con `Cache-Control: no-store`.
- **Sessioni** (`src/middleware/sessionContext.js`, applicato a `/api/engine/*` e a `GET /api/luogo-oggetti`): le intestazioni `X-Session-Id` e `X-Game-Id` (UUID) identificano sessione e partita; se mancano o non sono UUID validi il server ne genera di nuove. Entrambe sono sempre restituite nelle intestazioni della risposta. Ogni sessione ha un proprio motore (`createEngine`), con lingua iniziale 1. Limiti: 200 sessioni (`SESSION_MAX_SESSIONS`, evizione della meno recente), inattività 6 h (`SESSION_IDLE_TTL_MS`), durata massima 24 h (`SESSION_ABSOLUTE_TTL_MS`). Test: `tests/api.engine.multisession.isolation.test.ts`.
- **Errori non gestiti** (`src/middleware/errorHandler.js`, riga 166 di `server.js`): corpo sanificato, in produzione senza `err.message`. JSON malformato: 400 `{ ok: false, error: 'INVALID_JSON' }`; origine non ammessa da CORS: 403 `CORS_NOT_ALLOWED`; sotto `/api/parser`: `{ IsValid: false, Error: 'INTERNAL' }` (o `NOT_FOUND` con stato 404); altrimenti `{ ok: false, error: 'INTERNAL_ERROR' }` con stato 500 o quello dell'errore; fuori da `/api` testo `Not Found` / `Internal Server Error`. Test: `tests/api.errorhandler.test.ts`, `tests/characterization.errorhandler.test.ts`.
- **CORS**: attivo solo se `ALLOWED_ORIGINS` contiene almeno un'origine (`server.js` righe 97-110).
- **Route inesistenti**: statico dalla radice del repository (`express.static(ROOT)`, riga 158), poi 404 con `web/404.html` (righe 161-163).

### 2.2 Elenco

| Metodo | Percorso | Sessione | Descrizione |
| --- | --- | --- | --- |
| GET | `/api/version` | no | versione dell'applicazione |
| GET | `/api/config` | no | `basePath` e lingue |
| GET | `/api/lingue` | no | tabella `Lingue` |
| GET | `/api/frontend-messages/:lingua` | no | messaggi dell'interfaccia |
| GET | `/api/introduzione` | no | testo di presentazione |
| GET | `/api/storia` | no | testi della pagina storia |
| GET | `/api/luoghi` | no | tutti i luoghi |
| GET | `/api/luogo-oggetti` | sì | oggetti presenti in un luogo |
| GET | `/api/ping` | no | `{ pong: true }` |
| POST | `/api/engine/execute` | sì | esegue un comando |
| GET | `/api/engine/state` | sì | snapshot dello stato |
| POST | `/api/engine/reset` | sì | nuova partita |
| POST | `/api/engine/save-client-state` | sì | salvataggio |
| POST | `/api/engine/load-client-state` | sì | caricamento |
| GET | `/api/engine/direzioni/:idLuogo` | sì | direzioni di un luogo |
| GET | `/api/engine/stats` | sì | statistiche e rango |
| GET | `/api/parser/stats` | no | diagnostica del lessico (non in produzione) |
| POST | `/api/parser/reload` | no | ricarica il vocabolario (non in produzione) |
| POST | `/api/shutdown` | no | spegne il server (solo `NODE_ENV=test`) |
| GET | `/` e statico | no | file della radice del repository |

Rimosse e non più raggiungibili: `POST /api/engine/set-location` e `POST /api/parser/parse` rispondono come qualunque route inesistente (test: `tests/api.legacy.endpoints.removed.test.ts`).

### 2.3 Dettaglio

**`GET /api/version`** (`server.js:78`) — risposta: `{ version }` dalla versione di `package.json` (`src/version.js`).

**`GET /api/config`** (`src/api/configRoute.js:40`) — risposta: `{ basePath, lingue: [{ ID, IDLingua, Descrizione }] }`. `basePath` è `BASE_PATH` normalizzato: `/` oppure `/sottocartella/` con barra finale (`normalizeBasePath`). Se `BASE_PATH` è impostato, la route è registrata anche sotto `BASE_PATH` (righe 42, 47). Test: `tests/api.config.test.ts`.

**`GET /api/lingue`** (`src/api/linguaRoutes.js:7`) — risposta: l'array `Lingue` dei dati, o `[]`.

**`GET /api/frontend-messages/:lingua`** (`src/api/routes.js:8`) — `:lingua` deve essere 1 o 2, altrimenti 400 `{ ok: false, error: 'Lingua non valida (1=IT, 2=EN)' }`. Risposta: `{ ok: true, messages, count }` con i `MessaggiFrontend` della lingua.

**`GET /api/introduzione`** (`routes.js:24`) — query `id` e `lingua` (interi, predefiniti 1). Risposta: `{ testo }`, stringa vuota se la riga non esiste.

**`GET /api/storia`** (`routes.js:44`) — query `id` e `lingua` (predefiniti 1). Risposta: `{ testo1, testo2, labelLinks, labelDocumenti, autoreLine, genereLine, piattaformaLine }`, ciascuno stringa vuota se assente. Test: `tests/characterization.routes.test.ts`.

**`GET /api/luoghi`** (`routes.js:53`) — risposta: l'array dei luoghi (tutte le lingue), ciascuno con `Immagine` (o `null`) e `Buio` (o `0`) presi da `LuoghiLogici`.

**`GET /api/luogo-oggetti`** (`routes.js:68`) — query `idLuogo` e `idLingua` obbligatori, altrimenti 400 `{ error: 'Parametri idLuogo e idLingua richiesti' }`. Risposta: array `[{ descrizione }]` degli oggetti dello stato della sessione con quel luogo e quella lingua e `Attivo >= 1`.

**`GET /api/ping`** (`routes.js:85`) — risposta: `{ pong: true }`.

**`POST /api/engine/execute`** (`src/api/engineRoutes.js:169`; test: `tests/api.engine.execute.contract.test.ts`, `tests/api.validation.test.ts`, `tests/characterization.http-keys.test.ts`)
- Corpo: `{ input: string }`. L'input è ripulito dagli spazi ai bordi; è non valido se non è una stringa (`NOT_A_STRING`), è vuoto (`EMPTY_INPUT`), ha lunghezza fuori da 1-500 (`LENGTH_OUT_OF_RANGE`) o contiene caratteri di controllo (`CONTROL_CHARS`) (`src/middleware/validation.js`).
- Input non valido: 400 `{ ok: false, error: 'INVALID_INPUT', details, userMessage, parseResult, command: null, engine: null, state, ui, stats }`.
- Se lo stato è in attesa di conferma FINE (`awaitingEndConfirm`) o di riavvio (`awaitingRestart`) il parser è saltato e l'input è letto come SI/NO (`confirmEnd`, `confirmRestart`): 200 `{ ok: true, parseResult: null, command: null, engine, state, ui, stats }`.
- Comando non riconosciuto dal parser: 200 `{ ok: false, parseResult, command: null, engine: null, error, userMessage, state, ui, stats }` (non è un 400: `sendParseError` in `engineRoutes.js`).
- Comando valido: 200 `{ ok: true, parseResult, command, engine, state, ui, stats }`. `command` è il DTO di `toCommandDTO`; `engine` è il risultato del motore normalizzato (`accepted`, `resultType`, `message` stringa, `turnMessages` array, `gameOver` booleano, più i campi dei gestori).
- `state` è lo snapshot dello stato; `ui` è `{ location: { id, name }, direzioni, availableDirections }`; `stats` è `{ visitedPlaces, interactions, mysteries, score, rank, rankKey }`. Con `ENGINE_DEBUG` attivo si aggiunge `debug`.

**`GET /api/engine/state`** (`engineRoutes.js:205`) — risposta: `{ ok: true, state }`.

**`POST /api/engine/reset`** (`engineRoutes.js:217`) — corpo: `{ idLingua }` (opzionale; senza valore la lingua è 1). Genera un nuovo `X-Game-Id` (`setGameId`), azzera lo stato. Risposta: `{ ok: true, state }`.

**`POST /api/engine/save-client-state`** (`engineRoutes.js:233`) — corpo: `{ luoghi: [...] }`; se `luoghi` non è un array, 400 `{ ok: false, error: 'Invalid luoghi data' }`. Risposta: `{ gameState, odessaData: { Luoghi, Oggetti }, timestamp, version }` con intestazione `Content-Disposition: attachment; filename="MissioneOdessa_Save_<AAAAMMGG_hhmmss>.json"`.

**`POST /api/engine/load-client-state`** (`engineRoutes.js:267`; test: `tests/api.engine.load.language-mismatch.test.ts`, `tests/saves.compat.test.ts`)
- Validazione (`validateSaveData`): il corpo, `gameState` e `odessaData` devono essere oggetti semplici; `odessaData.Luoghi` un array di oggetti semplici, al massimo 500; `odessaData.Oggetti`, se presente, un array di oggetti semplici, al massimo 5000. Altrimenti 400 `{ ok: false, error: 'Invalid save data', details }` con `details` uno tra `BODY_NOT_OBJECT`, `GAMESTATE_INVALID`, `ODESSADATA_INVALID`, `LUOGHI_NOT_ARRAY`, `LUOGHI_TOO_LARGE`, `OGGETTI_NOT_ARRAY`, `OGGETTI_TOO_LARGE`, `LUOGHI_ITEMS_INVALID`, `OGGETTI_ITEMS_INVALID`.
- Se la lingua del salvataggio e quella della sessione sono entrambe 1 o 2 e diverse: 409 `{ ok: false, error: 'LANGUAGE_MISMATCH', saveLanguage, sessionLanguage }` e nessuna modifica. Altri valori di lingua non bloccano il caricamento.
- Successo: `setGameState(gameState)`, cache del vocabolario azzerata, risposta `{ ok: true, message: 'Stato ripristinato' }`.

**`GET /api/engine/direzioni/:idLuogo`** (`engineRoutes.js:313`) — `:idLuogo` intero, altrimenti 400 `{ ok: false, error: 'Invalid location ID' }`. Risposta: `{ ok: true, direzioni, messages: [] }`; non fa avanzare i turni.

**`GET /api/engine/stats`** (`engineRoutes.js:331`) — risposta: `{ ok: true, visitedPlaces, interactions, mysteries, score, rank, rankKey }`, con il rango calcolato dalla stessa regola del comando PUNTI.

**Errore comune alle route `/api/engine/*`**: se la sessione non ha un motore, 500 `{ ok: false, error: 'ENGINE_SESSION_MISSING' }` (`engineRoutes.js:22`).

**`GET /api/parser/stats`** (`src/api/parserRoutes.js:14`) — non in produzione. Risposta: `{ byType: [{ Tipo, Termini, Voci }] }`. **`POST /api/parser/reload`** (`parserRoutes.js:37`) — non in produzione; svuota la cache del vocabolario, lo ricostruisce, risponde `{ ok: true }`. In produzione entrambe escono dal router e rispondono 404 (`parserRoutes.js:8`; test: `tests/api.legacy.endpoints.removed.test.ts`).

**`POST /api/shutdown`** (`server.js:141`) — registrata solo con `NODE_ENV=test`. Risponde `{ ok: true }`, poi chiude il server e termina il processo dopo 50 ms.

**`GET /`** — con `BASE_PATH` impostato reindirizza a `BASE_PATH + '/'` (`server.js:87`); altrimenti, e per ogni altro file, serve la radice del repository (riga 158).

### 2.4 Nota su `GET /api/config`

In `src/api/configRoute.js` la registrazione compare due volte (righe 40 e 45), ma in rami alternativi dello stesso `if`: la riga 40 vale quando è passato un limitatore (come fa `server.js`, riga 82), la riga 45 quando non lo è. Le righe 42 e 47 registrano la stessa route anche sotto `BASE_PATH`.

## 3. Debito di accoppiamento motore → Odessa

Il motore è generico nell'interfaccia (`createEngine(game)`) ma oggi dipende da Odessa in questi punti. È una descrizione dello stato attuale; non propone interventi.

- **`src/logic/engine.js`** fissa `odessaGame` come gioco predefinito (`createEngine(game = odessaGame)`, motore di default creato all'importazione) e importa `consumaFiammifero` e `accendiFiammifero` da `src/game/odessa/matches.js`, esposti ai gestori come `helpers`.
- **`src/logic/parser.js`** legge la `CONFIG` di Odessa (`import { CONFIG } from '../game/odessa/config.js'`).
- **`src/logic/turnEffects/`**: 7 effetti su 8 importano `game/odessa/*` (`darknessEffect`, `dawnEffect`, `gameOverEffect`, `guardEffect`, `interceptEffect`, `torchEffect`, `victoryEffect`: `CONFIG`; `torchEffect` anche `rules.js`). Solo `matchEffect` non importa nulla da `game/odessa`. Per questo la cartella è trattata come parte di Odessa.
- **`src/api/engineRoutes.js`** importa `odessaGame` (riga 12) e ne usa `rules.rankKey` per il rango.
- **`src/logic/core/gameData.js` e `src/logic/core/state.js`** usano nomi di Odessa: `global.odessaData` (dati statici) e la chiave `__odessaOriginalOggetti` su `globalThis` (copia dei dati originali, `ORIGINAL_OGGETTI_KEY`). Anche `src/middleware/validation.js` e `engineRoutes.js` usano il campo `odessaData` nel formato dei salvataggi.
- **Direzione invertita del registro degli effetti**: `odessaGame.turnEffects` è lo stesso array `TURN_EFFECTS` esportato da `src/logic/turnEffects/index.js`, che importa gli effetti, e questi importano a loro volta `game/odessa/config.js` e `rules.js`. Non c'è un ciclo statico (gli effetti non importano `game/odessa/index.js`), ma la dipendenza va dal motore al gioco invece che dal gioco al motore.
- `src/logic/core/**` non importa da `src/game/**`: lo verifica `tests/architecture.test.ts`.

Nessun test usa un gioco diverso da `odessaGame` (vedi `tests/README.md`).
