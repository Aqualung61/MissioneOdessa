# 20260109_tickets_security_01 — Security Hardening (M1/M2/M5)

Data: 9 gennaio 2026  
Repo: MissioneOdessa  
Contesto: deploy **pubblico** su hosting (non solo localhost)

Questo documento contiene i ticket tecnici (formato “GitHub Issue”) per le mitigazioni prioritarie:
- **M1**: Auth/API protection
- **M2**: Input validation + body limits
- **M5**: Rate limiting

---

## Issue 1 — M1: Proteggere le API con autenticazione (API Key o Basic Auth)

**Priorità:** 🔴 CRITICA (blocking per deploy pubblico)

**Problema**
Attualmente gli endpoint `/api/*` sono invocabili senza autenticazione. In un deploy pubblico questo permette:
- reset e manipolazione dello stato (`/api/engine/reset`, `/api/engine/load-client-state`)
- abuso CPU (flood su `/api/engine/execute`, `/api/parser/parse`)
- accesso non autorizzato a dati e funzioni operative

**Obiettivo**
Richiedere credenziali valide per tutte le API (salvo eccezioni esplicite e motivate, es. health check).

**Nota importante (sicurezza del modello)**
- Se l’app è “pubblica” e usata da utenti anonimi, una **API key nel browser non è un segreto**.
  In quel caso valutare protezione a livello reverse-proxy (Basic Auth lato hosting) o un modello di auth diverso.
- Se invece l’app è “pubblica ma ad accesso controllato” (team/QA), l’API key è un hardening valido.

**Proposta implementativa (MVP)**
- Middleware `apiKeyAuth` che verifica header `X-API-Key` contro `process.env.API_KEY`.
- Applicazione globale su `/api`.
- Eccezioni minime (se serve): `/api/health` e/o `/api/version`.

**Criteri di accettazione**
- Richieste senza key o con key errata → `401` con risposta JSON standard.
- Richieste con key valida → flusso invariato.
- In `development` e `test` comportamento esplicito (es. auth disabilitata o key “dev”) documentato.
- Documentazione aggiornata (variabili env + esempi curl).
- Test Vitest:
  - no key → 401
  - key errata → 401
  - key valida → 200

**Task tecnici**
- Creare middleware auth (es. `src/middleware/auth.js`).
- Applicare middleware alle route `/api/*` in `src/server.js`.
- Aggiungere `API_KEY` a `.env.example` (se presente) e documentare in README.
- Aggiornare/aggiungere test in `tests/`.

**Rischio di regressione**
- **Impatto:** Alto (cambia il contratto di tutte le API).
- **Rischio:** Medio (client e test devono inviare header corretti).

**Stima**
- 2–3 ore (implementazione + test + doc).

---

## Issue 2 — M2: Validazione input e limiti payload (anti-DoS + integrità stato)

**Priorità:** 🔴 CRITICA (blocking per deploy pubblico)

**Problema**
- `POST /api/engine/execute` e `POST /api/parser/parse` accettano input stringa senza limite di lunghezza → rischio DoS.
- `POST /api/engine/load-client-state` accetta strutture parzialmente validate e può sovrascrivere dati/global state → rischio corruzione stato, memory exhaustion.
- Alcuni query params sensibili non hanno whitelist (es. scelta suite test).

**Obiettivo**
Ridurre superficie DoS e impedire payload malformati/corrotti, mantenendo compatibilità ragionevole.

**Scope**
1) **Body size limit**
- Configurare `express.json({ limit: '1mb', strict: true })` e gestire `413`.

2) **Validazione comando input**
- Su `/engine/execute` e `/parser/parse`:
  - tipo stringa
  - lunghezza min/max (es. 1..500)
  - rifiuto caratteri di controllo

3) **Validazione `load-client-state`**
- Validazione strutturale più robusta:
  - shape base di `gameState`
  - shape base di `odessaData` (almeno le tabelle minime)
  - limiti su size collezioni (protezione memory)
  - rifiutare campi inattesi o types errati

4) **Query params whitelist**
- Es. `suite` accetta solo valori predefiniti (o pattern strettamente controllato).

**Criteri di accettazione**
- Body troppo grande → `413` con JSON “pulito”.
- Input invalido (vuoto, >max, control chars) → `400`.
- Load state invalido o “gigante” → `400`.
- Load state valido → comportamento invariato.
- Suite param fuori whitelist → `400`.
- Test Vitest coprono casi limite (oversized, invalid, valid).

**Task tecnici**
- Configurare `express.json` con `limit` e aggiungere handler per `entity.too.large`.
- Creare `src/middleware/validation.js` con validatori:
  - `validateCommandInput`
  - `validateSaveData`
  - `validateSuiteParam`
- Applicare i middleware alle route interessate.
- Aggiungere test:
  - input > 500
  - input con control chars
  - load-client-state con array enormi
  - payload valido

**Rischio di regressione**
- **Impatto:** Alto.
- **Rischio:** Medio–Alto (possibile blocco di salvataggi “vecchi” o payload legittimi ma grandi).

**Stima**
- 2.5–4 ore (dipende dalla profondità della validazione su save/load).

---

## Issue 3 — M5: Rate limiting su API (anti-flood / anti-DoS)

**Priorità:** 🔴 CRITICA (blocking per deploy pubblico)

**Problema**
Nessun rate limiting sugli endpoint; un attacker può saturare CPU con richieste ripetute.

**Obiettivo**
Applicare rate limiting coerente:
- generale su `/api/*`
- più stretto su endpoint CPU-intensive (execute/parse/test runner)

**Scope**
- Integrare `express-rate-limit`.
- 2–3 limiter:
  - `apiLimiter` (generale)
  - `parsingLimiter` (execute/parse)
  - `heavyLimiter` (endpoint test)
- Considerare configurazione hosting dietro proxy (`trust proxy`) per IP reale.

**Criteri di accettazione**
- Superata la soglia → `429` e risposta JSON chiara.
- Endpoint pesanti limitati più aggressivamente del generale.
- Configurazione differenziata per dev/test (soglie alte o disabilitato) documentata.
- Smoke test o test automatizzato verifica che il `429` scatti.

**Task tecnici**
- Aggiungere dipendenza `express-rate-limit`.
- Implementare limiter in `src/middleware/rateLimiter.js`.
- Applicare in `src/server.js` e/o a livello router.
- Verificare `trust proxy` se necessario.
- Aggiungere test o script di verifica.

**Rischio di regressione**
- **Impatto:** Medio–Alto.
- **Rischio:** Medio (falsi positivi per NAT/proxy; test che fanno burst).

**Stima**
- 1.5–3 ore (dipende da test/hosting/proxy).

---

## Note di etichettatura (consiglio)
Label suggerite (se le usate in repo): `security`, `hardening`, `blocking-release`, `auth`, `validation`, `rate-limit`.
