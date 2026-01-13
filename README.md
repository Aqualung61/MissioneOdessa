# Missione Odessa App

[![CI](https://github.com/Aqualung61/MissioneOdessa/actions/workflows/ci.yml/badge.svg)](https://github.com/Aqualung61/MissioneOdessa/actions/workflows/ci.yml)

**Versione 1.3.1** - Adventure testuale con backend Node.js/Express, frontend statico e API REST basata su dati JSON statici.

- Roadmap / Next steps: [docs/ROADMAP.md](docs/ROADMAP.md)
- Tracking (fonte di verità):
   - Issues: https://github.com/Aqualung61/MissioneOdessa/issues
   - Milestones: https://github.com/Aqualung61/MissioneOdessa/milestones

## 📜 Diritti e Licenza

Questo progetto contiene il porting su piattaforma node.js del videogioco Missione Odessa sviluppato in BASIC per Commodore 64/Spectrum negli anni '80.

### 👤 Autore originale
L’opera originale è stata creata da **Paolo Giorgi** e pubblicata da Jackson Editore negli anni '80.
L’autore originale conserva tutti i diritti sull’opera del 1986. La pubblicazione del porting avviene con autorizzazione esplicita dell’autore originale.

### 🧩 Porting
Il porting sulla piattaforma Node.js è stato realizzato da **Mauro Giorgi** come opera derivata. Utilizzando **VS Code**. **Meno del 5% del codice è stato sviluppato direttamente.**

### 📖 Licenza
Il codice del porting è distribuito con licenza **MIT**, come indicato nel file [LICENSE](LICENSE). Questa licenza si applica esclusivamente al porting e non modifica in alcun modo i diritti sull’opera originale.

### 📌 Nota
Il contenuto narrativo, i testi, la struttura del gioco e gli elementi creativi derivano dall’opera originale e sono utilizzati con il consenso dell’autore.

## Avvio rapido

1. Installa le dipendenze:
   ```sh
   npm install
   ```
2. Avvia il server (statico + API):
   ```sh
   npm run dev
   ```
3. Accedi all'applicazione web:
   - [http://localhost:3001/](http://localhost:3001/) oppure [http://localhost:3001/index.html](http://localhost:3001/index.html)
       - entrypoint: redirect verso **storia** (lingua default = 1, persistita in `localStorage`)
    - [http://localhost:3001/web/odessa_storia.html](http://localhost:3001/web/odessa_storia.html) (storia)
    - [http://localhost:3001/web/odessa_intro.html](http://localhost:3001/web/odessa_intro.html) (intro)
   - [http://localhost:3001/web/odessa_main.html](http://localhost:3001/web/odessa_main.html) (gioco diretto)

### Flusso di navigazione tra pagine (frontend)

Il flusso “standard” è:

1. `index.html` → redirect a `web/odessa_storia.html` (entrypoint pubblico)
2. `odessa_storia.html` → click sull’immagine → `web/odessa_intro.html`
3. `odessa_intro.html` → progressione a step (click) → `web/odessa_main.html`

Note:
- La lingua UI è gestita tramite `localStorage` (chiave `linguaSelezionata`): default `1`, valori ammessi `{1,2}`.
- Vecchi bookmark/link con `?idLingua=...` o `?Lingua=...` vengono ripuliti automaticamente dalla URL (History API).
- In deploy con `BASE_PATH`, tutti gli URL diventano `${BASE_PATH}/...` (es. `/missione-odessa/web/odessa_storia.html`).

Per forzare la lingua EN in locale (best-effort): apri DevTools Console e fai:

```js
localStorage.setItem('linguaSelezionata', '2');
location.reload();
```

### Salvataggi (SALVA / CARICA)

- In gioco sono disponibili i comandi `SALVA` e `CARICA`.
- `SALVA` scarica un file JSON del salvataggio.
- `CARICA` permette di selezionare un JSON e ripristina subito luogo e contatori (HUD) coerenti con lo stato caricato.

4. Le API sono disponibili su:
  - [http://localhost:3001/api/luoghi](http://localhost:3001/api/luoghi)
  - [http://localhost:3001/api/luogo-oggetti?idLuogo=8&idLingua=1](http://localhost:3001/api/luogo-oggetti?idLuogo=8&idLingua=1)
  - [http://localhost:3001/api/version](http://localhost:3001/api/version) — restituisce la versione dell'applicazione

## Versionamento API e applicazione

- La versione dell'app è sincronizzata con il campo `version` in `package.json`.
- La rotta `/api/version` restituisce un oggetto JSON con la versione attuale, ad esempio:
   ```json
   { "version": "1.3.1" }
   ```

Verifica rapida (smoke check):

```sh
curl -s http://localhost:3001/api/version
```

- Ogni avvio del server stampa la versione corrente in console.

## Struttura progetto

- `src/` — codice backend e logica applicativa
  - `src/data-internal/` — dati JSON statici caricati in memoria
  - `src/logic/` — logica di parsing e utility (es. `parser.js`)
  - `src/api/` — router API Express (es. `routes.js`, `linguaRoutes.js`)
  - `src/server.js` — entry point server Express (statico + API)
- `web/` — file frontend statici (es. `odessa_main.html`, `odessa_intro.html`, `js/odessa_main.js`, `js/odessa_intro.js`)
- `docs/` — documentazione e note di modellazione
- `tests/` — suite Vitest
- `.env` — variabili opzionali (es. `PORT`, `BASE_PATH`, flag security)

## Sicurezza API (M1)

Le route sotto `/api/*` possono essere protette via API key.

- Header richiesto: `X-API-Key`
- Variabile d'ambiente: `API_KEY`
- Flag: `API_AUTH_DISABLED=1` per bypassare l'auth (utile se il sito è **pubblico anonimo**: una API key nel browser non è un segreto)
- Eccezioni pubbliche (senza key): `GET /api/version`, `GET /api/config`

Esempi:

```sh
curl -i http://localhost:3001/api/luoghi
curl -i -H "X-API-Key: <la-tua-key>" http://localhost:3001/api/luoghi
```

Nota:
- in ambienti non-production, se `API_KEY` non è impostata l'autenticazione viene bypassata (comportamento esplicito per sviluppo/test).
- in `NODE_ENV=production`, se l'auth è abilitata ma `API_KEY` è assente, le API rispondono `500` con `{ ok:false, error:'SERVER_MISCONFIGURED' }`.

Vedi anche: [.env.example](.env.example).

## Limiti payload e validazione (M2)

Per ridurre rischi di input malevoli e payload eccessivi:

- Il body JSON ha un limite massimo configurabile tramite `JSON_BODY_LIMIT` (default: `1mb`).
- Se il payload supera il limite, l'API risponde con `413` e body `{ ok:false, error:'PAYLOAD_TOO_LARGE' }`.


## Rate limiting API (M5)

Per ridurre flood/DoS, le API sono soggette a rate limiting:

- Generale su `/api/*` (soglia più alta)
- Più stretto su endpoint CPU-intensive: `POST /api/parser/parse`, `POST /api/engine/execute`


Nota: è definito anche un limiter "heavy" (opzionale) per eventuali endpoint futuri particolarmente costosi.

Variabili env utili:

- `TRUST_PROXY=1` se l'app è dietro reverse proxy (per usare l'IP reale del client)
- `RATE_LIMIT_DISABLED=1` per disabilitare temporaneamente i limiter (es. debug)


Vedi anche: [.env.example](.env.example).

## Endpoint legacy (deprecati)

### Limite turni (alba)

- `GAME_MAX_TURNS_CONSUMED`: limite massimo di turni che consumano tempo (esclude comandi `SYSTEM`).
   - Se la variabile non è impostata, il limite è disabilitato.
   - Valore consigliato: vedi `.env.example` (impostato a 250).

Per l'input del gioco, il target è usare **solo** `POST /api/engine/execute` (il server gestisce parsing + logica + snapshot `state/ui/stats`).

Gli endpoint legacy seguenti sono marcati come deprecati (`Deprecation`/`Sunset`) e possono essere disabilitati:

- `POST /api/engine/set-location`
- `POST /api/parser/parse`

Per disabilitarli (risposta `410`):

- `DISABLE_LEGACY_ENDPOINTS=1`

Vedi anche: [.env.example](.env.example).

## CORS (M3)

Se web app e API sono servite dallo **stesso origin**, CORS non è necessario e viene lasciato **disabilitato**.

Se invece serve abilitare chiamate cross-origin (frontend su dominio diverso), impostare una whitelist tramite:

- `ALLOWED_ORIGINS` (CSV, es. `https://odessa.example.com,https://www.odessa.example.com`)

Vedi anche: [.env.example](.env.example).

## Error sanitization (M4)

Per evitare **information disclosure** (es. `err.message`, stack trace, path interni) in produzione:

- Gli errori non gestiti vengono normalizzati dal middleware globale `src/middleware/errorHandler.js`.
- In `NODE_ENV=production` le risposte 5xx sono **sanitizzate** (es. `INTERNAL_ERROR`), mantenendo però forme compatibili per alcune API:
   - `POST /api/parser/*` → envelope `{ IsValid:false, Error:'INTERNAL' }`

Test: `tests/api.errorhandler.test.ts`.

## Note
- Il server carica i dati da file JSON statici in `src/data-internal/` e serve sia API che file statici dalla stessa porta.
- La logica di parsing e la presentazione sono modulari e facilmente estendibili.
- I test sono in `tests/` (Vitest).

Nota deploy Railway (root `https://missioneodessa.up.railway.app/`):
- lasciare `BASE_PATH` vuoto
- consigliati: `NODE_ENV=production`, `TRUST_PROXY=1`, `API_AUTH_DISABLED=1`

## Dati e struttura

I dati dell'applicazione sono memorizzati in file JSON statici in `src/data-internal/` per semplicità e velocità. Schema e struttura dati documentati in `docs/`.
- Linee guida: vedi `docs/raccomandazioni.md` e `docs/data-modeling.md`.

## Release notes

- Vedi `RELEASE_NOTES.md` per i punti salienti; le note legacy restano in `docs/release-notes/`.

## Endpoint utili (servizio)

- POST `/api/shutdown`
   - Spegne il server in modo “graceful” (exit code 0). Disponibile solo quando `NODE_ENV=test`. Utile nelle pipeline locali.

## Migrazione da DB a JSON

A partire dalla versione 1.3.0, l'applicazione è stata migrata da SQLite a dati JSON statici per:
- **Semplicità**: Eliminazione della dipendenza da DB, facilitando deploy e test.
- **Velocità**: Caricamento immediato dei dati in memoria all'avvio.
- **Manutenibilità**: Dati versionati con Git, modifiche dirette ai file JSON.

I dati originali sono stati esportati da SQLite a JSON. Per modifiche, editare i file in `src/data-internal/` e testare con `npm test`.

## Stato

- **Versione attuale: 1.3.1** (12 gennaio 2026)
- **Test Coverage**: vedi output `npm test` (Vitest)
- **Qualità**: ESLint clean, TypeScript strict typing
- **i18n**: Full compliance IT/EN


### Novità versione 1.3.0
- Sistema completo di test (unit/integration con Vitest)
- Mystery scoring tests (VISIBILITA, SBLOCCA_DIREZIONE, TOGGLE_DIREZIONE)
- Intercettazione pattuglie sovietiche (danger zones)
- Sistema buio e game over unificato
- Victory effect con Ferenc scoring
- Dati JSON statici (migrazione da SQLite completata)
