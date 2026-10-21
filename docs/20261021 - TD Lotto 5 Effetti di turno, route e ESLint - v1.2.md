# TD Lotto 5 — Effetti di turno, stato, route, `errorHandler` ed ESLint a `error` (v1.4.2)

| Campo | Valore |
|---|---|
| Issue | #63 (`Refs #63`), #123 (`Refs #123`) |
| Baseline | `release/v1.4.2` @ `e088e7c` (verificata il 2026-10-20: 515 passed, 17 skipped; typecheck ok; tracce motore `dfbe5a46…` e HTTP `db892c31…` rigenerate e identiche) |
| Riferimento | TD 0 v1.0 §4.1, §4.2, §4.6, §4.7, §4.8, §5; TD lotto 4a v1.0 (contesto, `helpers`); TD lotto 4b v1.0 (§2, fuori perimetro rinviato al 5) |
| Stato | v1.2, approvata il 2026-10-21 (v1.0 + emendamenti E-1…E-3 dopo la Fase 1A-1, E-4…E-7 dopo la Fase 1A-2, §11) |
| Modello | Fase 1A-1 (P0–P2): **Sonnet 5.5, effort medio**. Fase 1A-2 (P3–P4, motore): **Opus 5.5, effort medio** (alto se una rete fallisce due volte di seguito). Fase 1A-3 (P5): **Sonnet 5.5, effort medio**. Fase 1B: **Sonnet 5.5, effort medio**. Fase 2: **Sonnet 5.5, effort basso** |

---

## 1. Valutazione del rischio di regressione

**Medio-alto.** TD 0 stimava "medio" per effetti di turno e route; il perimetro reale è più ampio perché ESLint a `error` impone di sciogliere la closure di `createEngine` (838 righe) e di scomporre `setGameState` (complessità 30) ed `executeCommand` (32), che il lotto 4b ha rinviato qui. Il rischio è concentrato in P3–P4 (motore); P1–P2 sono a rischio basso.

| Rischio | Dove | Mitigazione |
|---|---|---|
| `gameState` riassegnato da `resetGameState`/`setGameState`: una funzione estratta che trattiene il vecchio oggetto legge uno stato superato | P4 | Contenitore unico `eng.state` letto a ogni accesso (§3.4, R1); nessuna funzione riceve `state` per chiusura |
| Default di `setGameState` cambiati per errore (`\|\|` → `??`, ramo `previous` senza `inDangerZone`, chiavi sconosciute del salvataggio non più conservate) | P3 | Trascrizione alla lettera (§3.3.2, R2–R5); caratterizzazione di `setGameState` su 9 salvataggi costruiti (P0) |
| Ordine degli effetti di turno o dei ricalcoli di `applyTurnEffects` | P3 | Ordine vincolante §4; `odessaGame.turnEffects` è lo stesso array `TURN_EFFECTS`; traccia del motore |
| Ordine delle chiavi nei corpi HTTP: la traccia HTTP ordina le chiavi e non lo vede | P2 | Test di caratterizzazione sull'ordine delle chiavi dei corpi (P0, §5.1 test 3) |
| `errorHandler`: ramo diverso per una combinazione non coperta (oggi 3 test) | P2 | Tabella delle decisioni caratterizzata sul baseline (P0, almeno 20 casi) prima del refactor |
| Ordine degli errori di `validateInterazioni` | P2 | Caratterizzazione dell'elenco completo su dati malformati (P0) |
| Eventi di debug del motore con forma diversa | P4 | Forma trascritta in §3.4.3; `tests/engine.debug.trace.test.ts` |
| Interruzione per limiti d'uso | tutti | Sei passaggi, punto di ripristino a test verdi a ogni passaggio, come nei lotti 4a e 4b |

Reti che devono restare **identiche** senza aggiornamenti: istantanea risposte (`97a62ceb…`, 88.151 voci), corpus del parser, `parse_full_baseline.json` (`e9ccc844…`), `vocabulary_baseline.json` (`24a962b1…`), traccia motore (`dfbe5a46…`), traccia HTTP (`db892c31…`), compatibilità salvataggi, caratterizzazione (esistente e nuova di P0), percorsi completi, 138 punti, `architecture.test.ts` (solo aggiunte di §5.2).

Unica modifica di comportamento ammessa: D-5-4 (default dei salvataggi incompleti), limitata ai casi che oggi finiscono in errore 500.

---

## 2. Obiettivi e perimetro

### 2.1 Nel perimetro (righe su `e088e7c`)

| # | Voce | Oggi |
|---|---|---|
| 1 | Effetti di turno nella definizione del gioco (TD 0 §4.6) | `engine.js` importa `applyAllTurnEffects` (riga 8, uso 467) |
| 2 | `prepareTurnContext`, `runPreExecutionChecks`, `applyTurnEffects`, `shouldConsumeTurn` → `core/turn.js` | `engine.js` 347–482; zone aperte lette da `game.config.luoghi.zoneAperte` (377, 458) |
| 3 | Stato: iniziale, caricamento, snapshot, dati originali → `core/state.js` | `engine.js` 90–156 e 213–278 (stato iniziale duplicato), 183–199, 207–296, 688–779, 831–889 |
| 4 | Luoghi e aiuto → `core/location.js`, `core/help.js` | `engine.js` 485–685, 781–829 |
| 5 | Conferme FINE/riavvio → `core/confirm.js` | `engine.js` 37–86 |
| 6 | Fiammiferi → `game/odessa/matches.js` | `engine.js` 927–965 |
| 7 | `executeCommand` scomposto, eventi di debug in un'unica funzione | `engine.js` 994–1095 (complessità 32, 87 righe) |
| 8 | `createEngine` ridotto a composizione (≤ 80 righe) | 21–1120 (838 righe) |
| 9 | Letterali di Odessa rimasti nel motore → regole del gioco | `openStates: { BOTOLA: false }` (91, 214), `'ENDING_PHASE_2_WAIT'` (710), fiammiferi nei default (715–716) |
| 10 | `getGameData()` ovunque (TD 0 §4.8) | letture dirette in `routes.js` (13, 26, 35, 50, 51), `linguaRoutes.js` (7), `parserRoutes.js` (15–17), `systemMessages.js` (7–8), `parser.js` (40), `gameOverEffect.js` (97), `server.js` (63), `configRoute.js` (26, forma `global?.odessaData?.Lingue`; E-1) |
| 11 | `errorHandler` scomposto | complessità 39 |
| 12 | Route: `/execute` (97 righe), `computeStatsFromState` (17), `/storia` (18); rango via regola del gioco; fine della doppia tabella dei dettagli di input non valido | `engineRoutes.js` 29–47, 108–121, 128–231; `routes.js` 32–46 |
| 13 | `gameOverEffect` (33), `validateInterazioni` (42), `mapParseErrorToUserMessage` (17) | |
| 14 | `getDirezioniLuogo` (profondità 5) | `engine.js` 629–685 |
| 15 | Default in `setGameState` per le collezioni mancanti (D-5-4); test con `flags.bastoneLiberato` già presente | nota di "Stato avanzamento" |
| 16 | Regole ESLint di complessità a `error`, `--max-warnings 0` (D-5-5) | `eslint.config.js`, 14 avvisi |

### 2.2 Fuori perimetro

- Spostamento dei file di `src/logic/turnEffects/` in `src/game/odessa/` (D-5-2).
- Forma generica dello stato (campi `timers`, `turn`, `narrativeState`… restano quelli di oggi, D-5-3).
- Testi fissi nel codice: `'Sconosciuto'` (snapshot, 884), `'💡 SUGGERIMENTO…'` (`victoryEffect.js` 120), etichette IT/EN dell'aiuto (543–597), mappa `capitalizeCommand`: alla lettera (§8).
- Default di `openStates` per i salvataggi che non lo contengono (§8).
- `web/`, contratto HTTP, formato di salvataggio, dati JSON, `MessaggiSistema.json`, `interactionSchema.js` come elenchi (`PREREQUISITE_TYPES`, `PREREQUISITE_REQUIRED_FIELDS`, `EFFECT_TYPES`): invariati. Cambia solo la struttura interna di `validateInterazioni`.
- Issue #129 e candidati dei lotti precedenti.

---

## 3. Soluzione

### 3.1 Moduli

```
src/logic/
  engine.js              facciata: createEngine(game = odessaGame) + 20 esportazioni invariate
  core/
    state.js             createInitialState, loadState (ex setGameState), snapshotState,
                         loadOriginalOggetti, oggettiPerLingua
    turn.js              shouldConsumeTurn, prepareTurnContext, runPreExecutionChecks, applyTurnEffects
    location.js          generaDescrizioneLuogoConOggetti, getDirezioniLuogo, setCurrentLocation
    help.js              capitalizeCommand, generateHelpMessage
    confirm.js           confirmEnd, confirmRestart
    execute.js           executeCommand, recordExecuteEvent
src/game/odessa/
  matches.js             consumaFiammifero, accendiFiammifero
  rules.js               + isDangerZone, initialOpenStates, deriveLoadedGuardTimer, deriveLoadedTimers
  index.js               + turnEffects
src/logic/turnEffects/   invariati come file e firme; gameOverEffect scomposto, getGameData()
```

I nomi sono vincolanti per `core/turn.js`, `core/state.js` e `game/odessa/matches.js` (citati dai test di §5.2); gli altri sono indicativi. `core/**` continua a non importare `src/game/**` (regola ESLint e `architecture.test.ts`).

### 3.2 Definizione del gioco

`odessaGame` aggiunge:

| Campo | Valore |
|---|---|
| `turnEffects` | `TURN_EFFECTS` importato da `src/logic/turnEffects/index.js` (**stesso array**, non una copia) |
| `rules.isDangerZone(state)` | `CONFIG.luoghi.zoneAperte.includes(state.currentLocationId)` |
| `rules.initialOpenStates()` | `{ BOTOLA: false }` (oggetto nuovo a ogni chiamata) |
| `rules.deriveLoadedGuardTimer(newState)` | riga 708–710 alla lettera |
| `rules.deriveLoadedTimers(newState)` | IIFE 712–722 alla lettera |

`TURN_EFFECTS` e `applyAllTurnEffects` restano esportati da `turnEffects/index.js` (li usano i test); `applyAllTurnEffects` resta com'è. Il motore non lo usa più: `core/turn.js` itera `game.turnEffects`.

### 3.3 Stato — `core/state.js`

#### 3.3.1 Stato iniziale

`createInitialState(game, idLingua)` restituisce l'oggetto di righe 213–278 con `openStates: game.rules.initialOpenStates()` e `Oggetti: []`; **stesso ordine delle chiavi**. Lo stato della costruzione del motore (90–156) è `createInitialState(game, 1)`: le due copie sono identiche salvo la lingua (verificato). I commenti per campo si conservano una volta sola.

`resetGameState(idLingua = 1)` resta nella facciata come composizione, con questa sequenza invariata (207–296):
1. `console.log('Inizializzazione gameState con lingua:', idLingua)`;
2. `resetEngineDebugTrace()`;
3. se `eng.originalOggetti` è vuoto → `initializeOriginalData()`;
4. `eng.state = createInitialState(game, idLingua)`;
5. oggetti della lingua dalla cache `globalThis.__odessaOriginalOggetti` (o `eng.originalOggetti` se la cache non è un array), filtro per `IDLingua` uguale, `null` o `undefined`, copia profonda, stesso messaggio di log; altrimenti `[]`.

`initializeOriginalData` mantiene la doppia memoria (variabile per motore + cache su `globalThis`) e il log `'Dati originali salvati: …'`.

#### 3.3.2 Caricamento — `loadState(newState, game)`

Restituisce il nuovo stato; la facciata fa `eng.state = loadState(newState, game)`. Il corpo è 689–778 scomposto in funzioni di supporto (`loadPunteggio`, `loadTurn`, `loadTurnCurrent`, `loadTurnPrevious`), **con queste regole**:

| Regola | Contenuto |
|---|---|
| R2 | Ordine di costruzione invariato: `...newState`, poi `awaitingEndConfirm`, `visitedPlaces`, `Oggetti`, `flags`, `punteggio`, `guardTimer`, `timers`, `turn`; poi `delete unusefulCommandsCounter`. Le chiavi sconosciute del salvataggio restano |
| R3 | Operatori alla lettera: `\|\| 0`, `\|\| false`, `\|\| null`, `=== true`; nessuna sostituzione con `??` |
| R4 | Ramo "salvataggio senza `turn`" (755–775): `previous` **senza** `inDangerZone`, come oggi. Non va uniformato |
| R5 | `flags`, `guardTimer`, `timers` dalle regole del gioco (`deriveLoadedFlags`, `deriveLoadedGuardTimer`, `deriveLoadedTimers`), che ricevono `newState` |
| R6 | D-5-4: dopo `...newState` e prima di `awaitingEndConfirm`, i default `interazioniEseguite`, `direzioniSbloccate`, `direzioniToggle`, `sequenze` (§3.3.4) |

#### 3.3.3 Snapshot — `snapshotState(state, data, version)`

Righe 832–888 alla lettera, stesso ordine delle chiavi, `currentLocationName` con ripiego `'Sconosciuto'`, `timestamp` calcolato qui, `version` = `appVersion` passato dalla facciata.

#### 3.3.4 Default dei salvataggi incompleti (D-5-4)

| Campo | Default se `undefined` o `null` | Oggi, con il campo assente |
|---|---|---|
| `interazioniEseguite` | `[]` | `TypeError` alla prima interazione non ripetibile (`core/interactions.js:214`) o a `CARICA` alla pesa (`weight.js:24`) → 500 |
| `direzioniToggle` | `{}` | `TypeError` a `PREMI PULSANTE` / `RUOTA SEDILE` e nel prerequisito `DIREZIONE_APERTA` |
| `sequenze` | `{}` | `TypeError` alla combinazione della cassaforte |
| `direzioniSbloccate` | `{}` | nessun errore (l'effetto lo crea al primo uso); il default rende lo stato uniforme |

Un valore presente, anche di tipo errato, non si tocca. Lo snapshot non cambia: già oggi restituisce `[]`/`{}` per i campi assenti. Nessun effetto su salvataggi completi (v1.4.0, v1.4.1, tracce).

### 3.4 Motore — contenitore unico e facciata

#### 3.4.1 Contenitore

```js
// dentro createEngine
const eng = { game, state: null, originalOggetti: [] };
eng.state = createInitialState(game, 1);
```

- **R1**: ogni funzione estratta riceve `eng` (o `eng.state` letto al momento della chiamata) e non conserva riferimenti allo stato tra due chiamate. `getGameState()` restituisce `eng.state`.
- `helpers` (TD 4a §3.2, TD 4b §3.1) si crea una volta per motore, come oggi, con le stesse 11 chiavi nello stesso ordine; ogni voce legge `eng.state` a ogni chiamata. `cercaEseguiInterazione` continua a creare il contesto a ogni chiamata.
- Le 20 funzioni dell'API restano con la stessa firma e semantica (`async` dove oggi è `async`: `enterLocation`, `executeCommandAsync`); `createEngine` restituisce un oggetto con le stesse 20 chiavi nello stesso ordine.
- Se `createEngine` supera 80 righe, l'oggetto API si costruisce in una funzione di modulo `buildEngineApi(eng, helpers)`; nessuna deroga ESLint.

#### 3.4.2 Turno — `core/turn.js`

| Funzione | Righe | Note |
|---|---|---|
| `shouldConsumeTurn(parseResult)` | 347–359 | generica |
| `prepareTurnContext(state, game, parseResult)` | 375–409 | `inDangerZone` = `game.rules.isDangerZone(state)`; `hasLight` = `game.rules.hasActiveLight(state)` |
| `runPreExecutionChecks(state, parseResult)` | 424–436 | messaggio con `getSystemMessage(…, state.currentLingua)` |
| `applyTurnEffects(state, game, result, parseResult)` | 448–482 | ordine di §4; effetti da `game.turnEffects` con la firma `(gameState, result, parseResult)` |

La facciata espone `prepareTurnContext(parseResult)`, `applyTurnEffects(result, parseResult)` ecc. con le firme di oggi.

#### 3.4.3 Esecuzione — `core/execute.js`

`executeCommand(eng, helpers, parseResult)` con la sequenza di 994–1095 invariata; i tre blocchi di debug diventano una funzione `recordExecuteEvent`. Forma degli eventi **alla lettera**:

| `kind` | Chiavi, in ordine |
|---|---|
| `EXECUTE_COMMAND_BLOCKED` | `kind`, `parse`, `result {accepted, resultType}`, `before`, `after` |
| `EXECUTE_COMMAND` | `kind`, `parse`, `consumesTurn`, `result {accepted, resultType}`, `delta {score, totalTurnsConsumed, turnsInDangerZone, awaitingRestart}`, `before`, `after` |

`debugBefore` si calcola prima della validazione, come oggi; nessun evento per `parseResult` assente o non valido.

#### 3.4.4 Luoghi, aiuto, conferme, fiammiferi

Alla lettera, con `gameState` → stato letto da `eng`. In `getDirezioniLuogo` la ricerca della destinazione del toggle (659–676) diventa `toggleDestination(data, lingua, idLuogo, direzione)`, che restituisce `undefined` se l'interazione non esiste (e in quel caso la direzione **resta quella del luogo**, come oggi: nessuna assegnazione). `setCurrentLocation` mantiene i due eventi `SET_CURRENT_LOCATION` con le stesse chiavi (con `isTerminal` solo nel primo). `consumaFiammifero`/`accendiFiammifero` in `game/odessa/matches.js` ricevono `(state, config)`.

### 3.5 Effetti di turno

- `gameOverEffect`: un elenco ordinato di controlli `GAME_OVER_CHECKS = [lampAbandoned, darkness, terminalLocation, openArea, guardArrest, dawn]`; ognuno restituisce `{ messageKey, reason }` oppure `null`; il primo non nullo chiama `setGameOver`. I due rami che oggi assegnano i campi a mano (lampada, luogo terminale) li assegnano nello stesso ordine di `setGameOver` (verificato): diventano `setGameOver`. Guardia iniziale (`awaitingRestart \|\| ended`) invariata. `global.odessaData.Luoghi` → `getGameData().Luoghi`.
- Gli altri effetti: nessuna modifica (non hanno avvisi); restano `CONFIG` importato da `game/odessa/config.js` (TD 0 A7).

### 3.6 Dati statici — `getGameData()` (TD 0 §4.8)

Tutte le letture di voce 10 di §2.1 passano a `getGameData()`, con lo stesso momento di lettura (a ogni richiesta o chiamata, mai in cache a livello di modulo; `loadMessaggiSistema` legge alla chiamata come oggi). I commenti che citano il global si riformulano (`config.js` 3–4, `parser.js` 2, 36–38, 193, `engineRoutes.js` 276), così il test di §5.2 resta una ricerca testuale semplice.

### 3.7 Route e middleware

| File | Intervento |
|---|---|
| `errorHandler.js` | Scomposto in `isInvalidJsonBody`, `handleInvalidJson`, `logServerError`, `resolveHttpStatus`, `sendApiError`/`sendNonApiError`. Sequenza invariata: JSON malformato (avviso, `headersSent` → `next`, non-API → testo 400, API → `no-store` + JSON) → log di errore → `headersSent` → `next` → CORS 403 (anche fuori da `/api`) → stato (`number` tra 400 e 599, altrimenti 500) → non-API testo → `/api/parser` busta `IsValid` → busta standard. Oggetti di log con le stesse chiavi (compreso `message: undefined` in produzione) |
| `engineRoutes.js` `/execute` | Funzione `withState(engine, payload)` che aggiunge `state`, `ui`, `stats` **in coda**, nello stesso ordine; i cinque rami restano distinti e con le chiavi di oggi nello stesso ordine (§5.1 test 3) |
| `engineRoutes.js` `computeStatsFromState` | conteggi con una funzione `countOf`; rango con `odessaGame.rules.rankKey(score)` (D-5-6); rimossi gli import di `rankKeyFor` e `CONFIG` |
| `engineRoutes.js` `mapInvalidInputDetailsToI18nKey` | sostituita da `invalidInputMessageKey(details)` esportata da `messages.js` (D-5-7) |
| `messages.js` | `mapParseErrorToUserMessage` con tabelle `codice → chiave` e `dettaglio → chiave`; casi con parametro (`SYNTAX_NOUN_UNKNOWN`) e `NONE`/sconosciuto → `''` invariati |
| `routes.js` `/storia` | elenco ordinato `[campoRisposta, campoDati]` → stesso oggetto, stesso ordine, stesso ripiego `''` |
| `interactionSchema.js` | `validateInterazioni` scomposta in `checkRecord`, `checkPunteggio`, `checkLanguagePair`; stessi messaggi nello stesso ordine; elenchi esportati invariati |

### 3.8 ESLint (D-5-5)

```js
complexity: ['error', 15],
'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
'max-depth': ['error', 4],
```

Soglie e perimetro (`src/**/*.js`) invariati. Script `lint`: `eslint . --max-warnings 0`. Nessun `eslint-disable` per queste tre regole in `src/`: una deroga necessaria richiede un emendamento della TD (E-n) con motivo, e il commento `// eslint-disable-next-line <regola> -- TD Lotto 5 E-n`.

---

## 4. Ordini vincolanti

**`executeCommand`**: debug "prima" → `parseResult` assente → non valido (messaggio di `mapParseErrorToUserMessage` o generico) → `prepareTurnContext` → controlli preliminari (se bloccato: effetti di turno solo se consuma turno, evento `BLOCKED`, ritorno) → `dispatch` con contesto nuovo → se consuma turno: `applyTurnEffects`, evento, ritorno → altrimenti evento e ritorno.

**`prepareTurnContext`**: `previous` da `current` (con i ripieghi di oggi) → `consumesTurn`, `hasLight`, `inDangerZone` → `current` (5 chiavi in quest'ordine) → `globalTurnNumber += 1` → `totalTurnsConsumed += 1` se consuma.

**`applyTurnEffects`**: `hasLight` ricalcolata → `inDangerZone` ricalcolata → `movedThisTurn` → effetti nell'ordine `match, torch, darkness, intercept, dawn, guard, gameOver, victory`.

**`gameOverEffect`**: lampada abbandonata → buio → luogo terminale → zona aperta → guardia → alba.

---

## 5. Test

### 5.1 Caratterizzazione nuova (P0, scritta e verde sul baseline **prima** di ogni refactor; poi protetta)

| # | File | Contenuto |
|---|---|---|
| 1 | `tests/characterization.errorhandler.test.ts` | Tabella di almeno 20 casi con `req`/`res`/`next` finti, in produzione e no: JSON malformato su `/api/...` e fuori, con e senza `headersSent`; errore generico, `status` 404, 418, 700, `'404'` stringa; `/api/parser` con e senza messaggio; CORS su `/api` e fuori; non-API 404 e 500; `err` `undefined`; `req` senza `originalUrl`. Per ogni caso: stato, corpo, intestazioni impostate, `next` chiamato e con cosa, argomenti di `console.warn`/`console.error` (uguaglianza profonda) |
| 2 | `tests/characterization.state.test.ts` | `setGameState` su 9 salvataggi costruiti: fixture v1.4.1; senza `turn`; `turn` senza `current`/`previous`; senza `timers`; `timers` senza `matchesLeft` con fiammiferi presenti e consumati; senza `punteggio`; `flags.bastoneLiberato` già `true` e già `false` (nota del lotto 4a); `ENDING_PHASE_2_WAIT` senza `guardTimer`; `unusefulCommandsCounter` e una chiave sconosciuta. **Tutti con le quattro collezioni di §3.3.4 presenti.** Confronto con `tests/fixtures/state/state_load_lotto5.json` generato sul baseline: `getGameState()` serializzato con chiavi nell'ordine d'inserimento (`Set` → array), più `getGameStateSnapshot()` senza `timestamp`/`version`. Più `createInitialState` per IT ed EN dopo `resetGameState` |
| 3 | `tests/characterization.http-keys.test.ts` | Ordine ricorsivo delle chiavi dei corpi (non i valori) per: `/execute` nei cinque rami (input non valido dal validatore, `input` non stringa, attesa FINE, errore di parsing, comando valido), `/stats`, `/state`, `load-client-state` 409 e 200, `save-client-state`. Atteso scritto nel test, ricavato sul baseline |
| 4 | `tests/characterization.routes.test.ts` | Fuori produzione: `GET /api/lingue`, `GET /api/parser/stats`, `POST /api/parser/reload`; `GET /api/storia?id=1&lingua=2` e `id=999`; `GET /api/introduzione?lingua=2`. Corpo e stato |
| 5 | `tests/characterization.schema.test.ts` | `validateInterazioni` su un insieme di record malformati che produce **ogni** messaggio dell'elaboratore almeno una volta (chiave non ammessa, tipo di prerequisito, campo obbligatorio, chiave del prerequisito, `risposta` non stringa, tipo di effetto, `punteggio` di tipo errato e con riferimento inesistente, id mancante in una lingua, tipi di prerequisito ed effetto diversi, risposta in una sola lingua, punteggio diverso): elenco completo, nell'ordine, uguale all'atteso scritto nel test |

Il generatore della fixture del test 2 si consegna in `Claude decompiler/` (non nel repository), come i generatori dei lotti 0 e 2. I cinque test rientrano nei protetti per nome (`tests/characterization.*.test.ts`); `tests/fixtures/state/**` si aggiunge all'elenco dei protetti.

### 5.2 Test nuovi o estesi (P1–P5)

| File | Contenuto |
|---|---|
| `tests/gameData.access.test.ts` | Nessun file di `src/` fuori da `src/logic/core/gameData.js` e `src/initOdessa.js` contiene `global.odessaData`, `globalThis.odessaData` o `global['odessaData']` (ricerca testuale, regex `global(This)?\s*(\?\.\|\.)\s*odessaData\|global(This)?\s*(\?\.)?\s*\[\s*['"]odessaData` (E-1); un caso del test verifica che la forma `global?.odessaData?.X` venga riconosciuta) |
| `tests/state.load-defaults.test.ts` | D-5-4: per ciascuna delle quattro collezioni, un salvataggio senza il campo si carica con il default e il comando che oggi fallisce (interazione non ripetibile, `PREMI PULSANTE` al 44, passo della combinazione) risponde senza eccezioni; un valore presente non viene sostituito; lo snapshot coincide con quello di oggi |
| `tests/architecture.test.ts` | Aggiunte: 7. `odessaGame.turnEffects === TURN_EFFECTS`; 8. `core/turn.js` e `core/state.js` non contengono `zoneAperte`, `BOTOLA`, `ENDING_PHASE`, `fiammiferi` (ricerca testuale); 9. `createEngine` restituisce le 20 chiavi nell'ordine di oggi. Nessun'altra modifica |

### 5.3 Test esistenti

Nessuna modifica. In particolare: `tests/unit/turn-system.test.ts` (56 usi delle funzioni di turno tramite l'API), `tests/unit/turn-effects-registry.test.ts`, `tests/unit/gameover-effect.test.ts`, `tests/api.errorhandler.test.ts`, `tests/engine.debug.trace.test.ts`, `tests/engine.terminal.test.ts` (`enterLocation`), `tests/interazioni.schema.test.ts`, `tests/parse.error-taxonomy.i18n.test.ts`.

---

## 6. Passaggi

Ogni passaggio si chiude con `npm test`, `npm run lint`, `npm run typecheck` verdi, le reti di §1 identiche (tracce con i test `trace.*`) e un punto di ripristino.

| Passaggio | Fase | Contenuto |
|---|---|---|
| P0 | 1A-1 | Test di §5.1 sul baseline; misure di partenza (§7 AC-7, AC-9) |
| P1 | 1A-1 | `getGameData()` ovunque (§3.6), `tests/gameData.access.test.ts`; `gameOverEffect` (§3.5); `odessaGame.turnEffects` (solo il campo, il motore lo usa in P3) |
| P2 | 1A-1 | `errorHandler`, `messages.js`, `engineRoutes.js`, `routes.js`, `interactionSchema.js` (§3.7) |
| P3 | 1A-2 | `core/state.js`, `core/turn.js`, regole nuove (§3.2), D-5-4 con `tests/state.load-defaults.test.ts` |
| P4 | 1A-2 | `core/location.js`, `core/help.js`, `core/confirm.js`, `core/execute.js`, `game/odessa/matches.js`, contenitore `eng`, `createEngine` ≤ 80 righe |
| P5 | 1A-3 | ESLint a `error` e `--max-warnings 0`; estensioni di `architecture.test.ts`; misure finali |

Se in P0 un test di caratterizzazione non si riesce a scrivere verde sul baseline, ci si ferma e si segnala: non si adatta l'atteso al codice nuovo.

---

## 7. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | File toccati: `src/logic/engine.js`, nuovi file di §3.1, `src/logic/turnEffects/gameOverEffect.js`, `src/game/odessa/{index,rules}.js`, `src/api/{engineRoutes,routes,linguaRoutes,parserRoutes,configRoute}.js`, `src/middleware/errorHandler.js`, `src/logic/{messages,systemMessages,parser,interactionSchema}.js`, `src/game/odessa/config.js` (solo commento), `src/logic/core/interactions.js` (solo il commento della riga 38, E-6), `src/server.js` (solo il log), `eslint.config.js`, `package.json` (solo lo script `lint`), test e fixture di §5.1–§5.2; in Fase 2 `docs/` e `Unreleased.md` |
| AC-2 | Reti di §1 identiche; 138 punti; salvataggi v1.4.0 e v1.4.1 compatibili |
| AC-3 | `npm run lint` uscita 0 con 0 avvisi; le tre regole a `error`; `git grep -nE "eslint-disable.*(complexity\|max-lines-per-function\|max-depth)" -- src` vuoto |
| AC-4 | `npm run typecheck`, `npm run build`, `npm test` verdi; test esistenti non modificati (salvo §5.2) |
| AC-5 | `tests/gameData.access.test.ts` verde |
| AC-6 | `git grep -nE "BOTOLA\|ENDING_PHASE\|zoneAperte\|fiammiferi\|turnEffects/" -- src/logic/engine.js src/logic/core` vuoto |
| AC-7 | Tempi di `npm test` e `responses.snapshot.test.ts` entro +10% (misura alternata); memoria per sessione attiva (`node --expose-gc scripts/measure-session-memory.mjs`) non oltre 12,7 KB + 10% |
| AC-8 | `tests/characterization.http-keys.test.ts` verde senza modifiche dopo P0 |
| AC-9 | Copertura righe e rami di `src/` (`npm run test:coverage`) non inferiore alla misura di P0 |
| AC-10 | Report di ogni fase su file in `Claude decompiler/`, con tabella prima/dopo di complessità e righe delle 14 funzioni oggi segnalate |

---

## 8. Decisioni (approvate il 2026-10-20)

| ID | Decisione | Proposta | Alternativa scartata e motivo |
|---|---|---|---|
| D-5-1 | Closure di `createEngine` | Sciogliere: funzioni di modulo con contenitore `eng` (§3.4) | Deroga ESLint su `createEngine`: lascia la closure di 838 righe, che è il principale ostacolo alla separazione motore/gioco (TD 0 §4.1) |
| D-5-2 | File degli effetti di turno | Restano in `src/logic/turnEffects/`; il motore li riceve da `odessaGame.turnEffects` | Spostamento in `src/game/odessa/`: i test (anche protetti, es. `characterization.turneffects.test.ts`) importano dai percorsi attuali; servirebbero file di rimando. Da rivalutare con il secondo gioco |
| D-5-3 | Forma dello stato | Resta in `core/state.js` com'è; valori e derivazioni di Odessa dalle regole (§3.2) | Stato generico + estensione del gioco: cambia la costruzione dello stato, rischio senza beneficio nella v1.4.2 |
| D-5-4 | Default delle collezioni nei salvataggi incompleti | Sì, per le quattro collezioni di §3.3.4; eccezione dichiarata al vincolo 7 di TD 0 | Lasciare il 500: mantiene un errore server su input accettato dal validatore. `openStates` escluso (il default sarebbe un'ipotesi sullo stato della botola) |
| D-5-5 | Blocco in CI | Tre regole a `error`, soglie invariate, `--max-warnings 0` nello script `lint` | Solo `error` sulle tre regole: gli altri avvisi (oggi zero, anche in `tests/` e `web/`) tornerebbero ad accumularsi senza blocco |
| D-5-6 | Rango nelle statistiche | `odessaGame.rules.rankKey` (stessa funzione del comando `PUNTI`) | `rankKeyFor` + `CONFIG` in `engineRoutes.js`: due punti d'ingresso alla stessa regola |
| D-5-7 | Dettagli di input non valido | Una sola tabella in `messages.js` | Tabelle in due file: oggi identiche, possono divergere |
| D-5-8 | Fase 1A in tre sessioni (Sonnet, Opus, Sonnet) | Opus solo per P3–P4 | Tutto Opus: costo maggiore su passaggi meccanici; tutto Sonnet: il motore è la parte con R1–R6 |

---

## 9. Candidati issue (non si correggono nel lotto)

- `openStates` assente in un salvataggio → errore a `APRI BOTOLA` (D-5-4, escluso).
- Testi italiani fissi nel codice: `currentLocationName` `'Sconosciuto'` anche in inglese; ripiego `'💡 SUGGERIMENTO…'` in `victoryEffect.js` (oggi irraggiungibile: il messaggio di Ferenc è sempre presente).
- `torchEffect.js`: due rami identici (torcia posata / esaurita); semplificabile senza cambiare il comportamento, fuori dagli avvisi.

---

## 10. Prova manuale (Mauro, `localhost:3001`)

1. Partita breve: `guarda`, `prendi`, `inventario`, `punti` (rango coerente con il punteggio), `aiuto` in IT ed EN.
2. Buio e zona aperta: posare la torcia e muoversi (avviso, poi morte); fermarsi due comandi in una zona aperta (arresto); `si` al riavvio.
3. `fine` → `no` → `fine` → `si` → `no` (partita terminata).
4. Salvataggio a metà partita, ricarica in una nuova scheda, prosecuzione con un'interazione (es. `premi pulsante` al 44).
5. Salvataggio IT in partita EN → messaggio di errore (comportamento noto, candidato issue).
6. `F12`: nessun errore in console; risposta di `/api/engine/execute` con le chiavi nell'ordine abituale.

---

## 11. Emendamenti

### 11.1 v1.1 (2026-10-20, dopo la Fase 1A-1)

| ID | Origine | Emendamento |
|---|---|---|
| E-1 | Report 1A-1, A-1 | `src/api/configRoute.js:26` legge `global?.odessaData?.Lingue`: sfuggito al catalogo di §2.1 (ricerca senza la forma `?.`). Entra nel perimetro (§2.1 voce 10, AC-1) e si sostituisce con `getGameData()?.Lingue`, mantenendo la tolleranza ai dati assenti. La regex di `tests/gameData.access.test.ts` (§5.2) riconosce anche `?.`. Si esegue in **P5** |
| E-2 | Report 1A-1, A-6 | `withState(engine, payload, state)`: lo snapshot già calcolato è un parametro (evita una seconda chiamata a `getGameStateSnapshot()` e mantiene i due snapshot distinti del ramo di errore di parsing). Sostituisce la firma indicativa di §3.7 |
| E-3 | Report 1A-1, A-7 | Test 2 di §5.1: 9 gruppi, 11 salvataggi (due gruppi con due varianti: fiammiferi presenti/consumati; `bastoneLiberato` `true`/`false`) |

Candidati issue aggiunti a §9 dal report 1A-1: ramo "input non stringa" di `POST /execute` irraggiungibile via HTTP (il validatore lo intercetta prima); `errorHandler` in produzione restituisce `INTERNAL_ERROR` anche per un 404 su `/api`; fuori da `/api` uno stato diverso da 404 restituisce il testo "Internal Server Error" con lo stato originale; un `err.message` non stringa, fuori produzione, finisce nel campo `error`.

### 11.2 v1.2 (2026-10-21, dopo la Fase 1A-2)

| ID | Origine | Emendamento |
|---|---|---|
| E-4 | Report 1A-2, B-1 | Regola aggiuntiva `rules.initialMatches()` (restituisce `CONFIG.regole.fiammiferiIniziali`), usata da `createInitialState` per `timers.matchesLeft`: risolve la contraddizione tra §3.3.1 (valore dalla configurazione) e §5.2 punto 8 / AC-6 (nessun riferimento ai fiammiferi in `core/`). Si aggiunge all'elenco di §3.2 |
| E-5 | Report 1A-2, B-2 | Le chiavi dell'API di `createEngine` e le esportazioni di modulo di `engine.js` sono **21**, non 20 (conteggio di TD 0 §5.1 e di questa TD errato, codice invariato). §3.4.1 e §5.2 punto 9: 21 chiavi nell'ordine di `e088e7c` |
| E-6 | Report 1A-2, B-3 | Il commento di `src/logic/core/interactions.js:38` («…es. fiammiferi finiti») si riformula senza la parola (es. «messaggi aggiuntivi degli effetti»); il file entra in AC-1 solo per quel commento. Si esegue in **P5**. AC-6 resta invariato |
| E-7 | Report 1A-2, B-7 | Fedeltà di `getDirezioniLuogo`: oggi, trovata l'interazione `TOGGLE_DIREZIONE`, la direzione riceve `effetto.destinazione` **anche se `undefined`**; con `toggleDestination` che restituisce `undefined` in entrambi i casi la differenza esiste per dati futuri (non con quelli attuali). `toggleDestination` restituisce l'effetto trovato (o `null`) e il chiamante assegna `effetto.destinazione` come oggi. Si esegue in **P5**, con il test nuovo `tests/location.toggle.test.ts` (interazione `TOGGLE_DIREZIONE` con `destinazione` assente e toggle aperto → direzione `undefined`, come oggi; interazione assente → direzione del luogo invariata); il test entra in AC-1 |

Accettati senza emendamento (report 1A-2): B-4 (un solo ripristino effettivo di P4), B-6 (firme `confirmRestart(eng, risposta, resetGameState)`, `loadOriginalOggetti(current, data)`, `debugStateSnapshot` in `core/state.js`), B-8 (lettura di `eng.state` all'inizio di funzioni che non riassegnano lo stato), B-9 (alias negli import della facciata).
