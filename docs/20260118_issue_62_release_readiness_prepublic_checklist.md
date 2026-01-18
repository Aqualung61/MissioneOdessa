# Issue #62 — Release readiness (pre-public)

Data esecuzione: **2026-01-18**

Obiettivo: rendere il repository “pubblicabile” con controlli minimi su **segreti**, **configurazione**, **hardening**, **licenze/attribution**, **contenuti**.

## 1) Segreti e credenziali

Esito: **PASS (con note)**

Checklist:
- [x] Nessun file `.env` committato (verifica: assente; `.gitignore` copre `.env*` e lascia solo `.env.example`).
- [x] Nessun token/chiave privata evidente nel repo (scan “best-effort”).
- [x] Esempi in documentazione: usare placeholder non ambigui (no valori “realistici”).

Comandi consigliati (local):
- `git grep -nE "ghp_|github_pat_|AKIA|AIza|sk-|-----BEGIN"`
- `git grep -n "API_KEY="`

Note:
- In documentazione, evitare esempi con valori “realistici” per `API_KEY` (meglio valore vuoto o placeholder tra `<...>`), per ridurre falsi positivi nelle scansioni.

## 2) Configurazione e documentazione (run/test/deploy)

Esito: **PASS**

Checklist:
- [x] Presente `.env.example` con variabili e default ragionevoli.
- [x] README include avvio rapido e note deploy (porta, `BASE_PATH`, proxy, flag di sicurezza).
- [x] README include comando test.

## 3) Hardening minimo (deploy pubblico)

Esito: **PASS**

Checklist:
- [x] Header security via `helmet` (CSP/headers standard) configurati nel server.
- [x] Rate limiting su `/api/*` e più stretto su endpoint costosi.
- [x] Limite payload JSON configurabile (`JSON_BODY_LIMIT`).
- [x] Error handling: sanitizzazione in `NODE_ENV=production`.
- [x] Flag operativi per “public deploy”: `TRUST_PROXY`, `DISABLE_RUN_TESTS`, `DISABLE_LEGACY_ENDPOINTS`, `ALLOWED_ORIGINS`.

## 4) Licenze e attribution

Esito: **PASS (con azione consigliata)**

Checklist:
- [x] Presente `LICENSE` (MIT) per il codice del porting.
- [x] README include contesto diritti/autorizzazione opera originale.
- [x] Presente un file `THIRD_PARTY_NOTICES.md` con riferimenti alle dipendenze/asset di terze parti.

Azione consigliata:
- Generare periodicamente un report licenze completo (es. tramite strumenti esterni tipo `license-checker`) se serve pubblicazione “formale” con elenco completo transitive.

## 5) Contenuti e asset (immagini/testi)

Esito: **PASS (con note)**

Checklist:
- [x] Attribution/licenza immagini in `images/` esplicitata (dummy + resto).

Dettagli (sintesi):
- `images/dummy.png`: Immagine tratta da “Missione Odessa”, Jackson Editore (1986). Utilizzata con autorizzazione dell’autore Paolo Giorgi.
- Tutte le altre immagini in `images/`: realizzate da M. Giorgi (autore dell’opera derivata) usando Agent AI con prompt.

Nota:
- Se si vuole una pubblicazione più “formale”, è utile aggiungere una pagina `CREDITS`/`ASSET_ATTRIBUTION` con elenco completo degli asset (file → fonte/licenza → autore).
