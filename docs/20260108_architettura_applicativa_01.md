# Missione Odessa — Architettura Applicativa (Snapshot 2026-01-11)

Questo documento descrive l’architettura **corrente** dell’app Missione Odessa (v1.3.1-beta, 11 gen 2026), con focus su:
- server Node.js/Express e routing con `BASE_PATH`
- modello dati **JSON in-memory** (niente DB runtime)
- game engine (stato in memoria + turn effects)
- frontend statico (pagine HTML + JS) e chiamate API

> Nota: esiste già un documento generale “storico” (ora archiviato) in `docs/obsolete/architettura-applicazione.md`. Questo file è uno **snapshot datato** e allineato al codice corrente.

---

## 1) Vista d’insieme

### 1.1 Diagramma architetturale (alto livello)

```mermaid
graph TB
  subgraph Client["Browser"]
    Index["index.html"]
    Storia["web/odessa_storia.html"]
    Intro["web/odessa_intro.html"]
    Main["web/odessa_main.html"]
    Boot["web/js/bootstrap.js"]
    IndexRedirect["web/js/index-redirect.js"]
    SEO["web/js/seo-i18n.js"]
    StoriaJS["web/js/odessa_storia.js"]
    JS["web/js/odessa_main.js"]
    I18N["web/js/i18n.js"]
  end

  subgraph Server["Node.js (Express)"]
    Srv["src/server.js"]

    subgraph Routers["API Routers"]
      R1["src/api/routes.js<br/>(utility + contenuti)"]
      R2["src/api/linguaRoutes.js"]
      R3["src/api/parserRoutes.js"]
      R4["src/api/engineRoutes.js"]
    end

    subgraph Logic["Business Logic"]
      Init["src/initOdessa.js<br/>(load JSON -> global)"]
      Parser["src/logic/parser.js<br/>(REQ01 parser)"]
      Engine["src/logic/engine.js<br/>(game engine)"]
      Turn["src/logic/turnEffects/<br/>(middleware)"]
      SysMsg["src/logic/systemMessages.js"]
    end
  end

  subgraph Data["Static Data"]
    JSON["src/data-internal/*.json"]
  end

  subgraph Memory["In-Memory Runtime"]
    Global["global.odessaData<br/>(tabelle JSON)"]
    GS["gameState<br/>(singleton)"]
    Cache["vocabCache<br/>(parser)"]
  end

  Index -->|redirect| Storia
  Index --> Boot
  Index --> IndexRedirect
  Storia --> Boot
  Storia --> SEO
  Storia --> StoriaJS
  Intro --> Boot
  Main --> Boot
  Intro -->|fetch| Srv
  Main -->|fetch| Srv
  Storia -->|fetch| Srv
  JS -->|fetch API| Srv
  StoriaJS -->|fetch API| Srv

  Srv --> R1
  Srv --> R2
  Srv --> R3
  Srv --> R4

  Srv -->|startup| Init
  Init --> JSON
  Init --> Global

  R3 --> Parser
  Parser --> Global
  Parser --> Cache

  R4 --> Engine
  Engine --> GS
  Engine --> Global
  Engine --> Turn
  SysMsg --> Global

  Srv -.->|static| Intro
  Srv -.->|static| Storia
  Srv -.->|static| Main
  Srv -.->|static| JS
  Srv -.->|static| StoriaJS
  Srv -.->|static| SEO
```

### 1.2 Principi chiave

- **Dati**: caricati da file JSON in `src/data-internal/` e mantenuti in `global.odessaData`.
- **Stato di gioco**: singleton in memoria (`gameState` dentro `src/logic/engine.js`).
- **Parser**: server-side conforme REQ01 (`src/logic/parser.js`) con cache del vocabolario per lingua.
- **Turn system**: pattern “middleware” post-esecuzione (`src/logic/turnEffects/`).
- **Frontend**: statico (HTML/CSS/JS) servito da Express; il client usa fetch verso API REST.

Nota frontend (as-is):
- `index.html` è una pagina di lancio/redirect verso `web/odessa_storia.html`.
- `web/js/bootstrap.js` inizializza `window.basePath` e gestisce la compatibilità `file://` reindirizzando a `http://localhost:3001` per le pagine sotto `web/`.
- `web/js/index-redirect.js` effettua il redirect includendo `idLingua` e rispettando `window.basePath`.

---

## 2) Bootstrap e lifecycle server

### 2.1 Sequenza di startup

```mermaid
sequenceDiagram
  participant OS as Process
  participant S as src/server.js
  participant L as src/initOdessa.js
  participant E as src/logic/engine.js
  participant M as src/logic/systemMessages.js

  OS->>S: node src/server.js
  S->>S: legge version tramite src/version.js (da package.json)
  S->>S: configura helmet/json (+ cors opzionale) + security middleware
  S->>L: initOdessa()
  L->>L: legge src/data-internal/*.json
  L-->>S: set global.odessaData
  S->>E: initializeOriginalData()
  S->>E: resetGameState()
  S->>M: loadMessaggiSistema()
  S-->>OS: app.listen(PORT)
```

### 2.2 `BASE_PATH` (deploy in sottocartella)

- `BASE_PATH` (env) viene concatenato ai path di mount:
  - `app.use(BASE_PATH + '/api', ...)`
  - `app.use(BASE_PATH + '/api/engine', ...)`
  - `app.use(BASE_PATH, express.static(ROOT))`
  - catch-all `app.use(BASE_PATH, sendFile(index.html))`
- Redirect opzionale: se `BASE_PATH` è valorizzato, `GET /` redirige a `BASE_PATH + '/'`.
- Endpoint “config”: `GET /api/config` risponde con `{ basePath: '<normalized>/' }` (sempre con slash finale).
  - Se `BASE_PATH` è valorizzato, è disponibile anche come `BASE_PATH + /api/config` (stesso payload).

---

## 3) Data model e store in memoria

### 3.0 Diagramma data layer (file JSON)

Questo livello è “static data”: viene caricato all’avvio e poi consultato in read-only durante il runtime.

```mermaid
graph LR
  subgraph DataFiles["src/data-internal/*.json"]
    subgraph Core["Core game data"]
      Luoghi["Luoghi.json"]
      LuoghiLog["LuoghiLogici.json"]
      Oggetti["Oggetti.json"]
      Interazioni["Interazioni.json"]
    end

    subgraph Lessico["Lessico (parser)"]
      TipiLess["TipiLessico.json"]
      TerminiLess["TerminiLessico.json"]
      VociLess["VociLessico.json"]
    end

    subgraph I18N["i18n"]
      Lingue["Lingue.json"]
      MsgSys["MessaggiSistema.json"]
      MsgFront["MessaggiFrontend.json"]
      Intro["Introduzione.json"]
    end

    subgraph Meta["Metadati"]
      Software["Software.json"]
      Piattaforme["Piattaforme.json"]
      LessSoft["LessicoSoftware.json"]
    end
  end

  Init["src/initOdessa.js"] -->|"read JSON"| DataFiles
  Init -->|"populate"| Global["global.odessaData"]
```

### 3.1 `global.odessaData`

- Popolato da `src/initOdessa.js` leggendo i file JSON.
- Contiene “tabelle” come array: `Luoghi`, `Oggetti`, `Lingue`, `MessaggiSistema`, `VociLessico`, ecc.
- È usato sia dal parser sia dal motore per leggere configurazioni e contenuti.

### 3.2 `gameState` (engine)

- Gestito da `src/logic/engine.js`.
- Include:
  - posizione corrente (`currentLocationId`), set luoghi visitati, inventario/oggetti runtime (`Oggetti`)
  - flags “narrative / victory / end/restart” (`awaitingEndConfirm`, `awaitingRestart`, `awaitingContinue`, `victory`, ecc.)
  - punteggio e progressi (set e contatori)
  - sottostruttura `turn` con snapshot `current` e `previous`

### 3.3 Dati originali immutabili

- `initializeOriginalData()` salva una deep copy di `global.odessaData.Oggetti` in `originalOggetti`.
- `resetGameState()` ripristina `gameState` e re-inizializza gli oggetti runtime (deep copy).

### 3.4 Diagramma in-memory store (dettaglio)

Questo diagramma esplicita le due strutture principali che vivono in RAM:
- `global.odessaData` (dati statici caricati dai JSON)
- `gameState` (stato mutabile della partita)

```mermaid
graph TB
  subgraph GlobalMemory["global.odessaData (static)<br/>read-only"]
    subgraph StaticTables["tabelle JSON"]
      TLuoghi["Luoghi[]"]
      TOggetti["Oggetti[]"]
      TInterazioni["Interazioni[]"]
      TLingue["Lingue[]"]
      TVoci["VociLessico[]"]
      TTermini["TerminiLessico[]"]
      TTipi["TipiLessico[]"]
      TMsgSys["MessaggiSistema[]"]
      TMsgFront["MessaggiFrontend[]"]
      TIntro["Introduzione[]"]
    end
  end

  subgraph GameState["gameState (singleton mutabile)"]
    subgraph CoreState["stato core"]
      Loc["currentLocationId"]
      Lang["currentLingua"]
      Visited["visitedPlaces (Set)"]
      Ended["ended"]
    end

    subgraph RuntimeObjects["oggetti runtime"]
      ObjRuntime["Oggetti[] (deep copy)"]
      ObjShape["{ID, IDLingua, Oggetto, Attivo, IDLuogo}"]
    end

    subgraph Interactions["progressi / sblocchi"]
      Done["interazioniEseguite[]"]
      Unlock["direzioniSbloccate{}"]
      Toggle["direzioniToggle{}"]
      Seq["sequenze{}"]
      Open["openStates{}"]
    end

    subgraph Score["punteggio"]
      Total["punteggio.totale"]
      ScoreInt["punteggio.interazioniPunteggio (Set)"]
      ScoreMist["punteggio.misteriRisolti (Set)"]
    end

    subgraph Turn["turn system"]
      GTurn["turn.globalTurnNumber"]
      Consumed["turn.totalTurnsConsumed"]
      Torch["turn.turnsWithTorch"]
      Dark["turn.turnsInDarkness"]
      Danger["turn.turnsInDangerZone"]
      subgraph TurnSnap["turn snapshot"]
        Cur["turn.current"]
        Prev["turn.previous"]
      end
    end

    subgraph Narrative["narrative/vittoria/riavvio"]
      Victory["victory"]
      Blocked["movementBlocked"]
      AwaitCont["awaitingContinue"]
      AwaitRestart["awaitingRestart"]
    end
  end

  Init["src/initOdessa.js"] --> GlobalMemory
  Engine["src/logic/engine.js"] --> GameState
  Parser["src/logic/parser.js"] --> GlobalMemory
  Engine --> GlobalMemory
  ObjRuntime --> ObjShape
```

---

## 4) Parser REQ01 (server)

### 4.1 Flusso

- `parseCommand(null, input, gameState)`:
  - normalizza input (trim/uppercase/collapse spazi + rimozione diacritici)
  - elimina stopword
  - valida struttura (1-3 token) e produce `ParseResult`

### 4.2 Vocabolario e cache

- `ensureVocabulary(gameState)` costruisce `tokenMap` da `global.odessaData` filtrando per lingua corrente.
- Cache per processo: `vocabCache` (reset con `resetVocabularyCache()`).
- Il caricamento di uno “save” (vedi §6) esegue un reset della cache per evitare incoerenze.

---

## 5) Engine e Turn System

### 5.1 Esecuzione comando (happy path)

```mermaid
sequenceDiagram
  participant C as Browser (odessa_main.js)
  participant ER as /api/engine/execute
  participant P as parser.js
  participant E as engine.js
  participant T as turnEffects/*

  C->>ER: POST { input }
  ER->>E: getGameStateSnapshot()
  alt awaitingRestart=true
    ER->>E: confirmRestart(input)
    ER-->>C: { ok:true, engine }
  else normal
    ER->>P: parseCommand(null, input, state)
    alt parse invalid
      ER-->>C: 400 { ok:false, error, userMessage }
    else parse valid
      ER->>E: executeCommandAsync(parseResult)
      E->>E: prepareTurnContext(parseResult)
      E->>E: runPreExecutionChecks(parseResult)
      E->>E: executeCommand(...)
      Note right of E: modifica gameState
      E->>E: applyTurnEffects(result, parseResult)
      E->>T: applyAllTurnEffects(gameState, result, parseResult)
      ER-->>C: 200 { ok:true, parseResult, engine }
    end
  end
```

### 5.2 Turn effects registry

Il registry è in `src/logic/turnEffects/index.js`:
- `torchEffect` (illuminazione)
- `darknessEffect` (morte dopo N turni al buio)
- `gameOverEffect` (verifica condizioni game over)
- `interceptEffect` (zone pericolose)
- `victoryEffect` (sequenza finale)

> L’ordine è significativo: alcuni effetti dipendono dai valori calcolati da quelli precedenti.

---

## 6) API surface (server)

### 6.1 Mounting

Con `BASE_PATH`:
- `BASE_PATH + /api` → `src/api/routes.js`
- `BASE_PATH + /api/lingue` → `src/api/linguaRoutes.js`
- `BASE_PATH + /api/parser` → `src/api/parserRoutes.js`
- `BASE_PATH + /api/engine` → `src/api/engineRoutes.js`

### 6.2 Endpoint principali (riassunto)

**Utility / contenuti** (`src/api/routes.js`):
- `GET /api/luoghi`
- `GET /api/luogo-oggetti?idLuogo&?idLingua`
- `GET /api/introduzione?id&lingua` (markdown)
- `GET /api/frontend-messages/:lingua`

**Engine** (`src/api/engineRoutes.js`):
- `POST /api/engine/execute` (parser+engine)
- `GET /api/engine/state`
- `POST /api/engine/reset`
- `POST /api/engine/set-location` (legacy/deprecato; disabilitabile con `DISABLE_LEGACY_ENDPOINTS=1`)
- `POST /api/engine/save-client-state` (download JSON)
- `POST /api/engine/load-client-state` (ripristino)
- `GET /api/engine/direzioni/:idLuogo`
- `GET /api/engine/stats`

Nota (input gioco): il flusso target usa **solo** `POST /api/engine/execute`. Anche `POST /api/parser/parse` è legacy/deprecato (disabilitabile con `DISABLE_LEGACY_ENDPOINTS=1`).

**Versioning/config** (`src/server.js`):
- `GET /api/version` (sotto `BASE_PATH`)
- `GET /api/config` (root assoluta)
- `GET BASE_PATH + /api/config` (se `BASE_PATH` è impostato)

### 6.3 Diagramma server layer (Express)

```mermaid
graph TB
  subgraph Express["Express server"]
    Entry["src/server.js"]

    subgraph Middleware["middleware"]
      Helmet["helmet (CSP)"]
      Cors["cors (opzionale)"]
      Json["express.json() + 413"]
      Auth["API key auth"]
      RateLimit["rate limiting"]
      Err["error handler"]
    end

    subgraph Routers["routers (mount sotto BASE_PATH)"]
      RGen["src/api/routes.js<br/>/api"]
      RLingua["src/api/linguaRoutes.js<br/>/api/lingue"]
      RParser["src/api/parserRoutes.js<br/>/api/parser"]
      REngine["src/api/engineRoutes.js<br/>/api/engine"]
    end

    subgraph Static["static (mount sotto BASE_PATH)"]
      Web["/web/*"]
      Img["/images/*"]
      Html["/*.html (index/catch-all)"]
    end
  end

  Entry --> Helmet --> Cors --> Json --> Routers
  Entry --> Static
```

---

## 7) Frontend: pagine e flussi

### 7.1 Pagine

- `web/odessa_intro.html`
  - selezione lingua / introduzione
  - usa `web/js/bootstrap.js` per inizializzare `window.basePath` (compatibile con deploy root o in sottocartella)

- `web/odessa_main.html`
  - UI principale (feed, input comandi, pannello direzioni)
  - usa `web/js/bootstrap.js` per inizializzare `window.basePath`

### 7.2 Client runtime (`web/js/odessa_main.js`)

- Usa `window.basePath` inizializzato da `web/js/bootstrap.js`.
- Fallback: se `bootstrap.js` non è presente, applica una euristica (root se primo segmento è tra `web/images/src/api`, altrimenti primo segmento come BASE_PATH).
- Invoca l’engine server via `/api/engine/*` per:
  - esecuzione comandi
  - navigazione (anche via click: invia comando e usa `POST /api/engine/execute`)
  - save/load
  - stats

### 7.3 Diagramma client layer (Browser)

```mermaid
graph TB
  subgraph Browser["Browser"]
    subgraph Pages["pagine"]
      Intro["web/odessa_intro.html"]
      Main["web/odessa_main.html"]
    end

    subgraph JS["javascript"]
      Core["web/js/odessa_main.js"]
      I18N["web/js/i18n.js"]
      subgraph CoreModules["responsabilità"]
        BasePath["basePath (euristica)"]
        Api["API client (fetch wrapper)"]
        UI["UI manager (DOM)"]
      end
    end

    subgraph ClientState["state (client)"]
      Stored["localStorage: idLingua"]
      Current["currentLocation"]
    end
  end

  Intro -->|"selezione lingua"| Main
  Main --> Core
  Core --> I18N
  Core --> BasePath
  Core --> Api
  Core --> UI
  I18N --> Stored
  UI --> Current
  Api -->|"fetch /api/*"| Backend["Express API"]
```

Nota: il client non fa parsing del lessico; invia input grezzo al server e renderizza la risposta.

---

## 8) Sicurezza (stato attuale)

- Helmet con CSP (**`'unsafe-inline'` solo per `style-src`**; per gli script: **`script-src 'self'`** e **`script-src-attr 'none'`**).
- CORS **disabilitato di default** (same-origin). Cross-origin è abilitabile solo via whitelist (`ALLOWED_ORIGINS`).
- API protette con **API key** su `BASE_PATH + /api/*` (header `X-API-Key`), con eccezioni pubbliche minime: `GET BASE_PATH + /api/version` e `GET /api/config`.
  - Nota: `GET /api/config` è sempre disponibile a path assoluto e, se `BASE_PATH` è impostato, anche come `BASE_PATH + /api/config` (stesso payload).
- Rate limiting su `/api/*` e limiti più stretti per endpoint CPU/pesanti (`/api/parser/parse`, `/api/engine/execute`).
- Limitazione payload JSON (`express.json({ limit })`) con risposta `413` standardizzata.
- Error handling globale: sanitizzazione dei 5xx in produzione (evita leak di dettagli interni).
- Per hardening e raccomandazioni, vedere `docs/20260108_security_review_01.md`.

## 8.1 Diagramma game over (flusso logico)

Diagramma sintetico del flusso “turn effects → game over”: non descrive tutti i dettagli UI, ma chiarisce dove viene presa la decisione e quali flag bloccano l’input.

```mermaid
flowchart TB
  Start["Comando eseguito"] --> Apply["engine.applyTurnEffects()"]
  Apply --> All["applyAllTurnEffects(...)<br/>(turnEffects registry)"]
  All --> GO["gameOverEffect"]

  GO --> Check{condizione game over?}
  Check -->|"no"| Ok["result normal"]
  Check -->|"sì"| Set["set awaitingRestart=true<br/>result.gameOver=true"]
  Set --> Client["client mostra messaggio e<br/>accetta solo SI/NO"]
```

---

## 9) Testing

- Unit/integration: Vitest (`tests/`).

---

## 10) Rischi/attenzioni note (architetturali)

- **Stato singleton**: non adatto a scaling orizzontale senza persistenza/sessione.
- **BASE_PATH**: fonte primaria lato client `web/js/bootstrap.js` (`window.basePath`). L'endpoint config espone sempre un `basePath` normalizzato (con slash finale) ed è disponibile sia come `/api/config` sia come `BASE_PATH + /api/config`.
