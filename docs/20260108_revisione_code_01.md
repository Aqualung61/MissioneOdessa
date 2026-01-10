# 20250108_revcode_01 — Analisi critica codice & architettura (rev.01)

Data: 8 gennaio 2026  
Repo: MissioneOdessa  
Versione di riferimento: v1.3.0 (Beta)  
**Ultimo aggiornamento: 9 gennaio 2026 (criticità #1, #2, #3 risolte; hardening security M1/M2/M3/M4/M5 implementato)**

## Scopo del documento
Questo documento fornisce una **analisi critica (costruttiva)** del codice e dell’architettura applicativa allo stato attuale, coerente con i vincoli dichiarati:

- Non è prevista evoluzione verso modelli **multi-utente / multi-partita**.
- La **lingua** è un parametro iniziale e **non cambia durante l’esecuzione** (cambia solo con reload e parametro diverso).
- La documentazione esistente è utile ma **non completamente affidabile** (in revisione); quindi le osservazioni sono ancorate a evidenze di codice.
- Non si prevedono **contenuti dinamici o user-generated** (niente input HTML arbitrario mostrato in pagina).

Il documento include inoltre un capitolo di **code-review operativa**: una lista di interventi ordinati per impatto e rischio, con criteri di accettazione e suggerimenti di test.

---

## Executive summary (1 pagina)
L’app ha raggiunto un buon livello di maturità (test suite ampia, lint pulito, feature core implementate). Nel perimetro “single-player, single-session”, l’architettura **in-memory + JSON statici** è adeguata ed efficiente.

Le criticità principali non riguardano scalabilità o multiutenza, ma **robustezza e manutenibilità**:

1. **Duplicazione/incoerenza di endpoint** (stesso path definito in punti diversi con payload differenti) → rischio regressioni “silenziose”.
2. **Inizializzazione ridondante** dei dati (caricamenti ripetuti) → rischio side-effect, difficile troubleshooting.
3. **BASE_PATH**: supportato lato server, non uniformemente rispettato lato client → fragilità di deploy in sottocartella.
4. **Monoliti** (engine e client JS molto grandi) → costo elevato per ogni modifica e più probabilità di bug collaterali.
5. **Cache vocabolario**: nel vostro modello è accettabile, ma va tenuta coerente con i reset/load per evitare stati “sporchi”.

Raccomandazione pratica: una piccola roadmap di refactor “chirurgici”, senza cambiare UX e senza introdurre concetti nuovi (sessioni, DB, ecc.).

---

## Evidenze e perimetro tecnico (baseline)
Componenti osservati:

- Backend Express ESM, entrypoint: `src/server.js`.
- Routing API: `src/api/*.js`.
- Core game engine: `src/logic/engine.js`.
- Turn effects pipeline: `src/logic/turnEffects/*.js` + registry in `src/logic/turnEffects/index.js`.
- Parser: `src/logic/parser.js`.
- Client: `web/js/odessa_main.js`.

Nota: dove la documentazione diverge dal codice, questo documento segue il **codice**.

---

## 🎯 Status Implementazione (aggiornamento 8 gennaio 2026)

### ✅ Criticità #1: Duplicazione endpoint — RISOLTA
**Commit:** `e145403` (8 gennaio 2026)  
**Soluzione implementata:**
- Rimosso endpoint duplicato `/api/luogo-oggetti` da `src/server.js` (righe 102-115)
- Mantenuta unica definizione in `src/api/routes.js` con payload stabile `Array<{descrizione}>`
- Eliminata ambiguità contrattuale tra le due implementazioni

**Vantaggi ottenuti:**
- ✅ Zero duplicazioni di route nell'applicazione
- ✅ Payload API deterministico e documentato
- ✅ Eliminato rischio regressioni "silenziose" da modifiche inconsistenti
- ✅ Routing più chiaro e manutenibile

**Test di verifica:** Suite esistente (211 test) mantiene 194 passed, 17 skipped.

---

### ✅ Criticità #2: Inizializzazione ridondante — RISOLTA
**Commit:** `813c42b` (8 gennaio 2026)  
**Soluzione implementata:**
- Rimossa seconda chiamata `initOdessa()` dal callback `listen()` in `src/server.js`
- Consolidata sequenza di inizializzazione unica:
  1. `initOdessa()` → carica JSON in memoria
  2. `initializeOriginalData()` → salva snapshot immutabile
  3. `resetGameState()` → inizializza stato di gioco
  4. `loadMessaggiSistema()` → carica messaggi di sistema
- Rimosso import inutilizzato `getOggetti`

**Vantaggi ottenuti:**
- ✅ Startup deterministico con ordine di inizializzazione garantito
- ✅ Eliminato rischio side-effect da doppio caricamento
- ✅ Log di startup sempre consistenti e predicibili
- ✅ Performance migliorata (una sola lettura JSON)
- ✅ Troubleshooting semplificato (sequenza lineare)

**Test di verifica:** Log di startup verificati, nessuna duplicazione di output.

---

### ✅ Criticità #3: BASE_PATH inconsistente — RISOLTA
**Commit:** `d9e36b3`, `b30e6a9`, `70c29ea`, `c1e2870` (8 gennaio 2026)  
**Soluzione implementata:**

**P0 - Fix hardcoded fetch (commit d9e36b3):**
- Corretto `fetch('/api/lingue')` hardcoded a riga 22 in `web/js/odessa_main.js`
- Ora usa `fetch(basePath + 'api/lingue')`

**P1 - basePath logic migliorato (commit b30e6a9):**
- Creata funzione `getBasePath()` in `web/js/odessa_main.js`
- Rimossa logica hardcoded per 'missioneodessa'
- Ora supporta qualsiasi path custom (/test/, /prod/, /staging/, ecc.)

**P1.1 - Fix root deployment (commit 70c29ea):**
- `getBasePath()` ora esclude cartelle app (`web`, `images`, `src`, `api`)
- Risolve errore 404 su `/web/api/*` in dev locale
- Aggiunto endpoint `/api/config` per esporre BASE_PATH al client
- Rimosso ultimo hardcoded basePath nel fallback lingue

**P1.2 - Allineamento odessa_intro.html (commit c1e2870):**
- Rimossi 3 `<link rel="preload">` inutilizzati (eliminati warning console)
- Aggiunto `fetchpriority="low"` a tutte le immagini per lazy loading
- Allineata logica basePath con `getBasePath()` da odessa_main.js

**Vantaggi ottenuti:**
- ✅ Deployment flessibile in qualsiasi sottodirectory (Railway, Vercel, custom paths)
- ✅ Nessun hardcoded path nel client (20/20 fetch ora usano basePath)
- ✅ Supporto root deployment (`/web/...`) e custom deployment (`/missioneodessa/...`)
- ✅ Performance migliorata: eliminati warning preload, immagini con lazy loading
- ✅ Coerenza tra odessa_main.html e odessa_intro.html

**Test di verifica:** 
- ✅ App funzionante con `BASE_PATH=''` (root)
- ✅ App funzionante con `BASE_PATH='/missioneodessa'` (custom)
- ✅ Nessun warning preload in console browser

---

### ⏸️ Criticità #4: File monolitici — IN BACKLOG
**Decisione:** Non prioritaria per il modello attuale (single-player, single-session).  
**Motivazione:** Rischio/benefit non giustifica refactor ora. Rinviata a fase di espansione feature.

---

### 👁️ Criticità #5: Cache vocabolario — MONITORAGGIO
**Stato:** Accettabile nel modello corrente (lingua immutabile per sessione).  
**Azione:** Nessun intervento immediato, da tenere sotto osservazione.

---

## 🔍 Ulteriori rischi identificati e mitigazioni

### R1 — Hardening gestione errori HTTP nel client
**Rischio:** Fetch API senza gestione uniforme degli errori HTTP (404, 500, timeout).  
**Impatto:** Potenziali stati inconsistenti o crash del client in caso di problemi rete/server.  
**Mitigazione suggerita:** 
- Centralizzare fetch in wrapper `apiFetch()` con:
  - Retry logic per errori temporanei
  - Timeout configurabile
  - Error handling standard con fallback UI
- **Priorità:** Media (può aspettare post-release)

### R2 — Validazione input utente nel parser
**Rischio:** Input molto lunghi o con caratteri speciali potrebbero causare performance degradation.  
**Impatto:** Basso (single-player, no persistenza malicious input).  
**Mitigazione attuale (agg. 9 gen 2026):** lato server è stata introdotta validazione dell’input comando (trim + range lunghezza + blocco control chars) e limitazione dimensione payload JSON.  
**Mitigazione futura:** valutare limiti più stringenti (es. max 200 caratteri) se necessario e monitorare eventuali path “costosi” nel parsing.  
**Priorità:** Bassa

### R3 — Mancanza di cache HTTP per JSON statici
**Rischio:** JSON di configurazione (Luoghi, Oggetti, ecc.) scaricati ad ogni reload.  
**Impatto:** Performance su connessioni lente, consumo banda inutile.  
**Mitigazione suggerita:** 
- Aggiungere header `Cache-Control` con versioning (es. `max-age=3600, must-revalidate`)
- Considerare ETags per invalidazione precisa
- **Priorità:** Bassa (benefit marginale per app single-player)

### R4 — Assenza di rate limiting su API
**Rischio:** Client malfunzionante potrebbe bombardare server con richieste.  
**Impatto:** Minimo (single-player locale), maggiore se deployato pubblicamente.  
**Mitigazione implementata (agg. 9 gen 2026):** rate limiting attivo su `/api/*` con limiti più stretti per endpoint CPU/pesanti (`/api/parser/parse`, `/api/engine/execute`).
**Priorità:** Chiusa (resta solo tuning eventuale in base al traffico reale)

### R5 — Logging e observability limitati
**Rischio:** Difficile diagnosticare problemi in produzione senza log strutturati.  
**Impatto:** Troubleshooting più lento, metriche performance non disponibili.  
**Mitigazione suggerita:** 
- Logging strutturato (JSON) con livelli (debug/info/warn/error)
- Metriche base (tempo risposta API, errori, cache hit rate)
- **Priorità:** Bassa (utile ma non critica per single-player)

### R6 — Test coverage aree critiche
**Rischio:** Alcune aree (turn effects pipeline, scoring logic) potrebbero avere coverage parziale.  
**Impatto:** Regressioni non rilevate su path edge-case.  
**Mitigazione attuale:** Suite di 211 test con 194 passed è solida base.  
**Mitigazione futura:** 
- Identificare funzioni critiche senza test
- Aggiungere test su edge cases (es. scoring con valori limite)
- **Priorità:** Media (dopo criticità #4 se affrontata)

---

## 📊 Metriche di qualità post-intervento

**Confronto prima/dopo risoluzione criticità #1, #2, #3:**

| Metrica | Prima | Dopo | Delta |
|---------|-------|------|-------|
| Endpoint duplicati | 1+ | 0 | ✅ -100% |
| Chiamate init startup | 2 | 1 | ✅ -50% |
| Fetch hardcoded client | 1/20 | 0/20 | ✅ -100% |
| BASE_PATH support | Parziale | Completo | ✅ +100% |
| Warning console (preload) | 3 | 0 | ✅ -100% |
| Test suite status | 194/211 | 194/211 | ✅ Invariato |
| ESLint clean | ✅ | ✅ | ✅ Mantenuto |

**Benefici complessivi:**
- 🎯 **Robustezza:** Eliminati 3 punti di fragilità architetturale
- 🚀 **Manutenibilità:** Codice più chiaro, meno duplicazioni
- 🔧 **Deploy flexibility:** Supporto completo per deployment in subdirectory
- ⚡ **Performance:** Lazy loading immagini, inizializzazione unica
- 📈 **Qualità:** Zero regressioni, test suite invariata

---

## Punti critici (sviluppo dei punti 1–5)

### 1) Duplicazione / incoerenza di endpoint
**Osservazione**  
È presente lo stesso endpoint (es. `/api/luogo-oggetti`) definito in più punti (entrypoint e router). In uno scenario single-player potrebbe “andare bene” finché non si tocca l’ordine di mount o la struttura delle risposte.

**Perché è critico anche senza multiutenza**
- Produce regressioni difficili da diagnosticare: cambiare una risposta in un punto non aggiorna l’altro.
- Genera ambiguità contrattuale: il frontend (o gli script di test) non sanno quale shape aspettarsi.
- Aumenta il rischio di inconsistenze tra ambienti (dev vs prod) se cambiano path/base path.

**Conseguenze tipiche**
- Bug “a intermittenza” dopo un refactor di routing.
- Dati incompleti o shape diversa (array vs oggetto con campi) che rompe logiche client.

**Raccomandazione**
- Consolidare l’endpoint in **un solo posto** (router API) e rimuovere la definizione duplicata.
- Formalizzare un payload unico (anche minimale) e mantenerlo stabile.

**Criterio di accettazione**
- Solo una definizione per ogni path API.
- Documentazione (anche minima) della shape di risposta.
- Test smoke che verifica la shape dell’endpoint.

---

### 2) Inizializzazione dati ridondante / potenziali side-effect
**Osservazione**  
Il bootstrap carica dati in memoria e poi, in alcuni casi, ricarica nuovamente (es. una seconda `initOdessa()` dopo `listen()`). Nel breve può sembrare innocuo.

**Perché è critico nel tempo**
- Se `initOdessa()` evolve (es. normalizzazioni, enrichment, precompute), doppio call può:
  - ri-sovrascrivere dati già “preparati”,
  - rimettere global state in una condizione inattesa,
  - rendere non deterministico l’ordine di inizializzazione.

**Raccomandazione**
- Rendere l’inizializzazione **una sola volta** e chiaramente sequenziata:
  1) load JSON → 2) initialize original snapshot → 3) reset gameState → 4) load system messages.

**Criterio di accettazione**
- Una sola `initOdessa()` nel percorso di startup.
- Log di startup deterministici (sempre stesso ordine).

---

### 3) BASE_PATH: supporto backend vs utilizzo client non uniforme
**Osservazione**  
Il server supporta `BASE_PATH` (utile per deploy in sottocartella). Nel client, alcune chiamate usano URL assoluti tipo `fetch('/api/...')`.

**Perché è critico anche se oggi deployi in root**
- È una fragilità che riemerge quando cambi hosting, reverse proxy o struttura URL.
- Anche in root, rende più difficile testare localmente configurazioni diverse.

**Raccomandazione**
- Introdurre un unico helper client (es. `apiFetch(path)`) che:
  - conosce il base path,
  - compone URL in modo coerente,
  - gestisce errori standard.

**Criterio di accettazione**
- Nessun `fetch('/api/...')` diretto nel client.
- Il gioco funziona con `BASE_PATH=/qualcosa` senza modifiche.

---

### 4) Monoliti (engine.js e odessa_main.js): costo di manutenzione
**Osservazione**  
`engine.js` e `odessa_main.js` sono file molto grandi con responsabilità miste.

**Perché è critico nel vostro modello**
Non è un tema di performance/scalabilità, ma di:
- leggibilità,
- debugging,
- rischio regressioni quando aggiungi una feature piccola.

**Pattern di rischio**
- Funzioni “helper” usate in più parti senza ownership.
- Stati e flag aggiunti nel tempo (timer, punteggio, narrative state) senza un modulo che “contenga” le invarianti.

**Raccomandazione**
- Refactor graduale “per estrazione” (senza cambiare comportamenti):
  - `engine/scoring.js` (punteggio luoghi/interazioni/misteri)
  - `engine/turn-context.js` (prepareTurnContext/shouldConsumeTurn/applyTurnEffects)
  - `engine/interactions.js` (lookup interazioni, ripetibilità, effetti)
  - `web/js/api.js` (fetch wrapper + basePath)
  - `web/js/ui-feed.js` (render feed messaggi)
  - `web/js/ui-directions.js` (stella direzioni e click)

**Criterio di accettazione**
- Stessa UX e stessi output.
- Test invariati (o aggiornati solo per import paths).
- Diff ridotto: spostamento codice senza riscritture.

---

### 5) Cache vocabolario e coerenza con reset/load
**Osservazione**  
Il parser usa una cache di vocabolario. Nel vostro modello la lingua non cambia a runtime, quindi il rischio “lingua sbagliata” è ridotto.

**Punti da controllare**
- Dopo `load-client-state` e `reset`, la cache deve essere coerente.
- Se il gameState viene ripristinato con lingua diversa (reload), la cache deve ripartire correttamente.

**Raccomandazione**
- Mantenere l’invalidazione esplicita sui percorsi che cambiano i dati/vocabolario.
- Considerare (opzionale) una cache per lingua se in futuro si aprono scenari di switch lingua “soft” (non richiesto ora).

**Criterio di accettazione**
- Nessun test/parsing che dipende da stato “precedente” dopo load/reset.

---

## Raccomandazioni (ripetute e più dettagliate)

### R1 — Consolidare gli endpoint duplicati (massimo ROI)
**Obiettivo**: ridurre regressioni e ambiguità.

- Identificare i path duplicati (almeno `/api/luogo-oggetti`).
- Scegliere un’unica “fonte di verità” (preferibilmente router in `src/api/routes.js`).
- Definire un payload stabile (versionabile solo se necessario).

Deliverable:
- 1 sola definizione per endpoint.
- Smoke test su shape risposta.

---

### R2 — Una sola inizializzazione dati in startup
**Obiettivo**: startup deterministico e privo di side-effect.

- Rendere `initOdessa()` chiamata una volta.
- Spostare `loadMessaggiSistema()` e altre init in sequenza stabile.

Deliverable:
- log startup pulito.
- nessuna doppia init.

---

### R3 — Client “BASE_PATH-aware” con wrapper API
**Obiettivo**: robustezza deploy e coerenza chiamate.

- Introdurre `apiBase` e `apiFetch()`.
- Centralizzare:
  - gestione errori HTTP,
  - parsing JSON,
  - opzionalmente timeout.

Deliverable:
- tutte le chiamate usano wrapper.

---

### R4 — Estrarre moduli dal client (senza cambiare UX)
**Obiettivo**: ridurre complessità cognitiva.

- Estrarre funzioni pure o quasi-pure (render feed, direzioni, API wrapper).
- Limitare l’effort: solo spostamento codice.

Deliverable:
- file più piccoli, import chiari.

---

### R5 — Estrarre sottosistemi dall’engine (scoring, turn, interactions)
**Obiettivo**: chiarire invarianti e responsabilità.

- Isolare logiche “meccaniche” e ben testate.
- Tenere in `engine.js` solo:
  - orchestrazione,
  - wiring tra sottosistemi,
  - API per routes.

Deliverable:
- engine più leggibile.
- stessi test passanti.

---

## Code-review operativa (dettagliata)
Questa sezione elenca interventi concreti e verificabili. Non implica che vadano fatti tutti; è una backlog tecnica ordinata.

### A) Igiene del routing e contratti API
1. **Mappa degli endpoint**
   - Elencare tutti gli endpoint reali (server + router) e individuare duplicazioni.
   - Output desiderato: tabella “Path → Handler unico → Response shape”.

2. **Contratto minimo stabile per l’engine result**
   - Stabilire i campi minimi (es.):
     - `accepted: boolean`
     - `resultType: 'OK'|'ERROR'|'TELEPORT'|'NARRATIVE'|'TERMINAL'|...`
     - `message: string`
     - opzionali: `locationId`, `teleport`, `effects`
   - Obiettivo: evitare che ogni route “inventi” la propria shape.

3. **Errore standard**
   - Per API: `{ ok: false, error, userMessage? }` coerente.

**Test consigliati**
- Smoke: `/api/version`, `/api/luoghi`, `/api/engine/state`, `/api/engine/execute` con input invalido.

---

### B) Server lifecycle e init
1. **Un solo punto di init**
   - `initOdessa()` una volta.
   - Se necessario, renderla idempotente esplicitamente.

2. **Logging**
   - Log “startup” separato da log “runtime” (facile troubleshooting).

**Test consigliati**
- Test che avvia server (se previsto) e verifica che init non venga chiamata due volte (anche solo via spy se fattibile).

---

### C) Parser e vocabolario
1. **Invarianti**
   - Lingua immutabile per sessione → ok cache unica.
   - Percorsi che cambiano dati → invalidare cache.

2. **Osservabilità (facoltativa)**
   - Endpoint stats già presente: bene.

**Test consigliati**
- Parsing con e senza accenti.
- Parsing dopo reset/load.

---

### D) Engine: separazione di responsabilità (refactor “safe”)
1. **Scoring**
   - Estrarre calcolo punteggio luoghi/interazioni/misteri in un modulo.
   - Stabilire chiaramente:
     - quando +1 luogo,
     - quando +2 interazione,
     - quando +3 mistero,
     - come evitare duplicati.

2. **Turn context + turn effects**
   - `prepareTurnContext()` e pipeline: mantenere l’ordine e l’invariante.
   - Documentare a codice (non doc esterna) l’ordine e il “perché”.

3. **Interazioni**
   - Funzioni dedicate: lookup per (VerbConcept, NounConcept), ripetibilità, applicazione effetti.

**Test consigliati**
- Suite dedicata a scoring (già presente in parte).
- Test di regressione su order di turn effects.

---

### E) Client: semplificazione e robustezza
1. **API wrapper + base path**
   - `apiFetch('/api/xxx')` costruisce URL corretti.

2. **UI feed**
   - Isolare funzioni di render; ridurre manipolazioni sparse.

3. **Direzioni UI**
   - Isolare la logica click/enable in un modulo.

**Test consigliati**
- Non necessariamente unit test JS puro (se non previsto), ma almeno smoke manuale.

---

## Priorità suggerite (ordinamento)
1) Consolidare endpoint duplicati (alto ROI, basso rischio)  
2) Una sola init in startup (alto ROI, basso rischio)  
3) Wrapper API client + base path (alto ROI, rischio medio perché tocca client)  
4) Estrazioni dal client (ROI medio, rischio basso se puro spostamento)  
5) Estrazioni dall’engine (ROI alto, rischio medio: richiede disciplina e test)

---

## Appendix — Note sul perimetro (esplicite)
- Nessuna necessità di supportare sessioni parallele.
- Nessuna necessità di hardening XSS avanzato (no user-generated).
- L’obiettivo principale è **ridurre fragilità e costo di manutenzione** mantenendo UX e logiche invariati.
