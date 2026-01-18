# Statistiche Progetto Missione Odessa
*Generato: 18 gennaio 2026*

## Aggiornamento (18 gennaio 2026) — Release 1.3.3 (multi-session) + fix 1.3.2

- **Input pipeline target:** `POST /api/engine/execute` come source-of-truth (parser + engine + snapshot `state/ui/stats`).
- **Legacy:** `POST /api/parser/parse` e `POST /api/engine/set-location` restano disponibili ma **deprecati** e disabilitabili con `DISABLE_LEGACY_ENDPOINTS=1`.
- **v1.3.3 (17/01):** multi-session **per-tab** (no cookie) via header `X-Session-Id` / `X-Game-Id`, persistenza client in `sessionStorage`, self-healing id, `/reset` genera un nuovo `X-Game-Id`.
  - Guardrail produzione (in-memory): TTL idle/assoluto + limite sessioni (LRU) via `.env`.
- **v1.3.2 (14/01):** fix save/load (HUD riallineato subito dopo `CARICA`), tuning intercettazione (morte dopo 4 turni consuming), lingua UI persistita solo in `localStorage` (whitelist `{1,2}`) + cleanup URL/querystring e entrypoint.
- **Test suite (ultimo run):** 302 test totali (285 passati, 17 skippati); 43 test files (42 passati, 1 skipped); durata ~8.25s.

Nota: le metriche sottostanti restano valide come fotografia “volumetrica”; per un refresh completo (LOC, conteggi file, ecc.) rieseguire i comandi in “Nota Metodologica”.

---

## 📊 Elapsed e Volumetria

### Timeline
- **Data inizio:** 30 ottobre 2025 (19:00:42)
- **Data snapshot:** 17 gennaio 2026 (23:49:43)
- **Durata:** 79 giorni
- **Ore totali:** ~1,901 ore calendario (tempo reale, non effort)

### Commit e Attività
- **Commit totali:** 401
- **Media commit/giorno:** 5.08
- **Modifiche file totali:** 1,818 operazioni (git numstat: file×commit)
- **Commit nel giorno release (17/01):** 14

### Crescita Codebase
- **File modificati:** 485 (unique path in history)
- **Linee aggiunte:** +73,772
- **Linee rimosse:** -23,948
- **Delta netto:** +49,824 linee

---

## 📁 Linee di Codice (LOC)

### Totali per Estensione
| Estensione | Linee Codice |
|------------|--------------|
| **JS/TS**  | 12,097       |

*Note: conteggio su “repo pulito” (tutto il repo), esclusi: node_modules, backup, dbbuild, deploy, dist, test-results + file binari.*

### Nota Metodologica
Tutti i conteggi escludono:
- `node_modules/` (dipendenze esterne)
- `backup/`, `dbbuild/`, `deploy/`, `dist/`, `test-results/` (build artifacts)
- File binari: `.png`, `.jpg`, `.pdf`, `.xlsx`, `.zip`
- File di configurazione sistema: `.lock`, `.log`, `.gitignore`, etc.

Conteggi verificabili tramite:
```powershell
# Repo "pulito" (tutto il repo), esclusi binari/artefatti
$excluded = '\\(node_modules|backup|dbbuild|deploy|dist|test-results|\.git)\\'
$binary = @('.png','.jpg','.jpeg','.pdf','.xlsx','.zip','.bmp','.ico')
$files = Get-ChildItem -Recurse -File |
  Where-Object { $_.FullName -notmatch $excluded -and ($binary -notcontains $_.Extension.ToLower()) }

# LOC JS/TS (repo pulito)
($files | Where-Object { $_.Extension -in @('.js','.ts') } | ForEach-Object {
  (Get-Content $_.FullName | Measure-Object -Line).Lines
} | Measure-Object -Sum).Sum

# Commit totali
git rev-list --count HEAD
```

### Distribuzione File per Tipo (Codice Applicativo)
*Repo pulito (tutto il repo), esclusi: node_modules, backup, dbbuild, deploy, dist, test-results, .git, file binari, *.lock, *.log*

| Tipologia | Count | Descrizione |
|-----------|-------|-------------|
| `.md`     | 48    | Documentazione |
| `.ts`     | 56    | TypeScript (tests, types, tooling) |
| `.js`     | 35    | Backend + frontend logic |
| `.json`   | 22    | Dati + configurazioni |
| `.css`    | 3     | Fogli di stile |
| `.csv`    | 3     | Dati/estrazioni |
| `.html`   | 4     | Pagine frontend |
| `.mmd`    | 2     | Diagrammi Mermaid |
| `.txt`    | 2     | Note/utility |
| `.yml`    | 2     | CI/config |
| **Altri** | 16    | File singoli di config/metadata |
| **Totale** | **193** | **File (repo pulito)** |

### File Applicativi (Escluso node_modules)
| Categoria | Files | Descrizione |
|-----------|-------|-------------|
| **Source** | 47 | Backend logic + middleware (src/) |
| **Tests** | 46 | Test suite (tests/) |
| **Web** | 14 | Frontend (web/) |
| **Types** | 3 | Type definitions (*.d.ts) |
| **Docs** | 50 | Documentazione (docs/, esclusi binari) |
| **Root/Config** | 33 | File root e configurazioni (package.json, tsconfig, ecc.) |
| **Totale** | **193** | File nel perimetro “repo pulito” |

**Dimensione totale progetto (repo pulito):** 1,715 KB (~1.7 MB)  
*Esclusi: node_modules (~382 MB), backup, deploy, dbbuild, dist, test-results, file binari*

---

## 🏗️ Complessità del Codice

### Metriche Strutturali
| Metrica | Valore | Note |
|---------|--------|------|
| **Funzioni esportate** | 48 | Stima: `export function` + `export async function` in `src/` |
| **Dichiarazioni TypeScript** | 3 | Type definitions in *.d.ts (non codice eseguibile) |
| **Classi** | 0 | Pattern funzionale puro, no OOP |
| **Moduli core** | 47 | File in src/ (ricorsivo, esclusi binari/artefatti) |
| **Test suite** | 43 | Vitest test files (42 passed | 1 skipped) |
| **Componenti web** | 15 | Asset frontend principali (4 HTML entry + 3 CSS in `web/css` + 8 JS in `web/js`) |
| **API Routes** | 7 | Endpoint REST Express (sviluppati, non framework) |

**Dettaglio funzioni esportate:**
- `src/logic/engine.js`: 20 funzioni (business logic core)
- `src/logic/parser.js`: 3 funzioni (parsing comandi)
- `src/middleware/validation.js`: 3 funzioni (input validation)
- `src/logic/systemMessages.js`: 2 funzioni (i18n)
- `src/initOdessa.js`: 1 funzione (bootstrap)
- `src/logic/messages.js`: 1 funzione (error mapping)
- `src/logic/turnEffects/*`: 5 funzioni (effects)
- `src/middleware/{auth,rateLimiter,errorHandler}.js`: 3 funzioni


### Complessità Funzionale Stimata
- **Moduli principali:** 14 JS + 3 TS in src/ (logic, api, data-internal, tests)
- **API Endpoints:** 7 route REST
  - Engine (stateful, multi-session):
    - `POST /api/engine/execute`
    - `GET /api/engine/state`
    - `POST /api/engine/reset` (nuovo `X-Game-Id`)
    - `POST /api/engine/set-location` *(legacy, disabilitabile)*
    - `POST /api/engine/save-client-state`
    - `POST /api/engine/load-client-state`
  - Utility:
    - `GET /api/direzioni/:idLuogo`
  - **Session headers (v1.3.3):** gli endpoint `/api/engine/*` accettano `X-Session-Id` / `X-Game-Id` (opzionali) e li ritornano sempre in response; se mancanti/invalidi, il server fa self-healing generando id validi.
- **Frontend pages:** 4 HTML (index.html, odessa_storia.html, odessa_intro.html, odessa_main.html)
- **Depth medio:** 3 livelli (src → logic/api → implementazione)

### Analisi Qualitativa
| Aspetto | Valutazione | Dettaglio |
|---------|-------------|-----------|
| **Modularità** | ✅ Alta | Separazione API/Logic/Data layer |
| **Testabilità** | ✅ Alta | 285 test passing (Vitest) |
| **Manutenibilità** | ✅ Alta | Codice documentato, pattern chiari |
| **Accoppiamento** | ✅ Basso | Dependency injection implicita |
| **Coesione** | ✅ Alta | Single responsibility per modulo |

---

## 🎨 Design Patterns Applicati

### Pattern Architetturali

#### 1. **Layered Architecture** (3-tier)
- **Presentation:** `web/` (HTML + client-side JS)
- **Application:** `src/api/` (Express routes + controllers)
- **Business Logic:** `src/logic/` (parser, engine, messages)
- **Data:** `src/data-internal/` (JSON statici)

**Valutazione:** ✅ Pattern appropriato per single-player game, no persistenza complessa

#### 2. **Multi-session / Multiton**
- **Implementazione:** middleware `src/middleware/sessionContext.js` (session store in memoria) + istanza `engine.js` separata per `sessionId`.
- **Scope:** `gameState` non è più un singleton globale: ogni tab/sessione ha la propria partita isolata.
- **Trade-off:** Più complessità e memoria per sessione ✅ | Necessario per concorrenza e i18n runtime ✅

#### 3. **Module Pattern**
- **Scope:** Tutti i file sorgente usano ES6 modules
- **Import/Export:** Named exports per funzioni pubbliche
- **Esempio:** `parser.js`, `engine.js`, `systemMessages.js`

#### 4. **Repository Pattern** (Semplificato)
- **Implementazione:** `global.odessaData` come in-memory data store
- **Load:** `initOdessa.js` carica JSON statici all'avvio
- **Access:** Accesso diretto ai dati via `global.odessaData.TableName`

**Valutazione:** Appropriato per dati statici read-only ✅

#### 5. **Command Pattern** (Parser-Engine)
- **Parser:** `parseCommand()` → `ParseResult` (DTO)
- **Engine:** `executeCommand(parseResult)` → `EngineResult`
- **DTO:** `toCommandDTO()` trasforma parse in command object
- **Struttura CommandDTO:** original, normalized, type, verb (canonical, termId, concept), noun (canonical, termId, concept, index)

**Benefici:** Separazione parsing da esecuzione, estensibilità ✅

#### 6. **Strategy Pattern** (Command Types)
- **Implementation:** Switch su `parseResult.CommandType`
- **Strategie:** NAVIGATION, SYSTEM, ACTION, MANIPULATION

#### 7. **Facade Pattern**
- **API Routes:** `engineRoutes.js` espone `/api/engine/*` come facade per `engine.js`
- **Parser Routes:** `parserRoutes.js` espone `/api/parser/*` per `parser.js`
- **Beneficio:** Client web non accede direttamente alla logica interna

#### 8. **Factory Pattern** (Implicito)
- **Vocabulary Factory:** `ensureVocabulary()` costruisce `tokenMap` da JSON
- **Message Factory:** `getSystemMessage(key, lingua)` produce messaggi localizzati
- **Command Factory:** `parseCommand()` produce `ParseResult` strutturato

#### 9. **Observer Pattern** (Client-side)
- **DOM Events:** Event listeners su form submit, button clicks
- **State Updates:** Aggiornamento UI dopo risposte API
- **Implementazione:** `odessa_main.js` ascolta submit e aggiorna DOM

#### 10. **Dependency Injection** (Implicito)
- **Global Data:** `global.odessaData` iniettato da `initOdessa()`
- **Test Mocking:** Test caricano JSON in `global.odessaData` per simulare DB

### Anti-Patterns Evitati ✅
- ❌ **God Object/Module:** Nessun modulo con >500 LOC, architettura ben scomposta
- ⚠️ **God Function:** 1 occorrenza (`executeCommand()` 173 linee, complessità 64) - candidata per refactoring
- ❌ **Magic Numbers:** Uso di costanti (`CommandType`, `ParseErrorType`)
- ❌ **Hard-coded Strings:** Messaggi localizzati in `MessaggiSistema.json`
- ✅ **Isolamento stato:** `gameState` isolato per sessione; dataset statici (`global.odessaData`) condivisi e read-only

### Pattern Non Applicati (Giustificazione)
| Pattern | Motivo Esclusione |
|---------|-------------------|
| **Redux/State Management Library** | Overhead inutile per single-player |
| **ORM** | Dati statici JSON, no DB relazionale |
| **Microservices** | Monolite appropriato per scope ridotto |
| **Event Sourcing** | No necessità audit log completo |
| **CQRS** | Read/Write non separati, no scaling needed |

---

## 🔍 Metriche Aggiuntive

### Copertura Funzionale
- **Test files:** 43 (42 passed | 1 skipped)
- **Test passing:** 285
- **Test skipped:** 17
- **Test duration:** ~8.25s
- **Code coverage:** Non misurato (stimato >70% per logic core)

### Documentazione
- **File `.md` totali:** 48 (escluse cartelle artefatto)
- **Documenti principali:**
  - `README.md` (117 linee)
  - `docs/data-modeling.md`
  - `docs/raccomandazioni.md`
  - `docs/considerazioni-architettura-interventi.md`
  - `docs/sistema-punteggio.md`
  - `RELEASE_NOTES.md`

### Configurazione e Setup
- **Package.json scripts:** 6+ (dev, test, test:watch, build, etc.)
- **Config files:** eslint, vitest, tsconfig
- **Environment:** `.env` per flag di deploy/security (vedi `.env.example`)
  - **Multi-session (v1.3.3):**
    - `SESSION_MAX_SESSIONS` (default: 200)
    - `SESSION_IDLE_TTL_MS` (default: 21600000 = 6h)
    - `SESSION_ABSOLUTE_TTL_MS` (default: 86400000 = 24h)

---

## 📈 Evoluzione Architettura

### Fase 1: Setup Iniziale (Ott 30)
- Express server base
- SQLite database
- Frontend statico

### Fase 2: Modularizzazione (Nov)
- Separazione logic/api/data layers
- Parser e Engine come moduli distinti
- Test suite Vitest

### Fase 3: Migrazione Dati (Dic)
- **Breaking change:** SQLite → JSON statici
- Motivazione: Semplicità deployment, no ORM overhead
- `initOdessa.js` carica dati in `global.odessaData` all'avvio

### Fase 4: i18n (Sprint 1-2, Dic 31)
- **Sprint 1:** Backend system messages (IT/EN)
- **Sprint 2:** Frontend UI messages (IT/EN)
- Pattern: Chiave → Lookup in `Messaggi{Sistema|Frontend}.json`

### Fase 5: Stabilizzazione (Gen, v1.3.2)
- Fix e hardening di save/load, lingua e navigazione URL
- Cleanup entrypoint e riduzione legacy querystring

### Fase 6: Multi-session per-tab (Gen, v1.3.3)
- Isolamento partite per tab (header `X-Session-Id` / `X-Game-Id`, `sessionStorage`)
- Guardrail produzione: TTL idle/assoluto + limite sessioni (LRU) via `.env`
- Aggiornamenti CI: pin Node `18.20.x` e `20.x` + output test verbose

---

## 🎯 Conclusioni

### Punti di Forza
✅ **Modularità:** Separazione netta tra layer  
✅ **Testabilità:** 285 test passing, no regression  
✅ **Documentazione:** 48 file .md, commenti inline  
✅ **Pattern Design:** 10+ pattern applicati correttamente  
✅ **Manutenibilità:** Codice leggibile, naming conventions chiare  
✅ **Pragmatismo:** Scelte architetturali proporzionate allo scope  

### Opportunità di Miglioramento
⚠️ **Code Coverage:** Aggiungere metriche coverage formali  
⚠️ **Complexity Metrics:** Integrare ESLint complexity rules (2 funzioni richiedono refactoring: `executeCommand()` 173 linee/complessità 64, `ensureVocabulary()` 77 linee)  
⚠️ **Performance Monitoring:** Aggiungere timing metrics alle API  
⚠️ **Logging:** Strutturare logging con livelli (debug/info/warn/error)  

### Valutazione Complessiva
| Aspetto | Rating | Note |
|---------|--------|------|
| **Architettura** | ⭐⭐⭐⭐⭐ | Appropriata per scope e obiettivi |
| **Codice** | ⭐⭐⭐⭐☆ | Pulito, ben strutturato, migliorabile coverage |
| **Testing** | ⭐⭐⭐⭐☆ | Buona copertura core, espandibile |
| **Documentazione** | ⭐⭐⭐⭐⭐ | Completa e dettagliata |
| **Manutenibilità** | ⭐⭐⭐⭐⭐ | Facilmente estendibile e correggibile |

**Verdetto:** Progetto maturo e production-ready per il dominio single-player adventure game. Architettura solida con pattern design appropriati e pragmatici.

---

*Documento generato automaticamente da statistiche Git e analisi codebase.*  
*Repository: [Aqualung61/MissioneOdessa](https://github.com/Aqualung61/MissioneOdessa)*  
*Branch: main*
