# Issue #59 — Inventario i18n (rinumerato: Sprint #59.2)

Data: 2026-01-14

Nota (2026-01-15): questo documento è stato prodotto come “Sprint 59.1”. Dopo l’introduzione del prerequisito multi-session (nuovo Sprint #59.1), l’inventario è stato rinumerato come Sprint #59.2.

## Scopo dello sprint
Produrre un inventario dei testi/label e dei meccanismi i18n esistenti, identificando:
- chiavi mancanti o incomplete (IT/EN)
- testi hardcoded (non coperti da i18n)
- fallback incoerenti o non desiderati
- aree/file da toccare nei prossimi sprint (data-internal contenuti, messaggi, hardcoded UI/API, test anti-regressione)

> Nota: in questo sprint non si modifica il comportamento runtime; è un report.

---

## Regole (definizioni)

### Definizione di “equivalente” (record localizzati)
Per tutti i dataset in `src/data-internal/` che includono `IDLingua`, un record IT e un record EN sono **equivalenti** se:
- hanno lo **stesso `ID`** (chiave logica)
- differiscono solo per `IDLingua` (1=IT, 2=EN)

Duplicando per lingua, **l’`ID` non cambia**.

### Scope inventario (per cluster)
Per leggere #59 con un’ottica “operativa”, raggruppiamo i risultati in:

A) **Dati di gioco (contenuto) — `src/data-internal`**
- In scope: `Introduzione.json`, `Storia.json`, `Luoghi.json`, `Oggetti.json`, `VociLessico.json`, `Interazioni.json`.
- Out of scope (per i18n contenuto): `LessicoSoftware.json`, `TerminiLessico.json`, `TipiLessico.json`, `Piattaforme.json`, `Software.json`, `LuoghiLogici.json`.
- `Lingue.json`: ok (non richiede duplicazioni).

B) **Messaggi (cataloghi) — `MessaggiFrontend.json` + `MessaggiSistema.json`**

C) **Hardcoded UI/API — HTML/JS/API**

D) **Residuali** (tutto ciò che emerge ma non ricade in A/B/C)

---

## “Fonti di verità” attuali (dati)

### Frontend UI (MessaggiFrontend)
- File dati: `src/data-internal/MessaggiFrontend.json`
- Endpoint: `GET /api/frontend-messages/:lingua` (filtra per `IDLingua`)
- Consumer:
  - helper: `web/js/i18n.js` (API + `msg(key)`)
  - SEO: `web/js/seo-i18n.js` (fallback immediato + override con MessaggiFrontend)

**Comportamento fallback (frontend)**
- Se la chiave non esiste: `web/js/i18n.js` logga `console.warn` e rende `[{key}]`.
- Se l’API non è accessibile: alcune pagine hanno fallback “best effort” in JS.

### Backend/Engine (MessaggiSistema)
- File dati: `src/data-internal/MessaggiSistema.json`
- Helper: `src/logic/systemMessages.js` con `getSystemMessage(key, idLingua, params)`

**Comportamento fallback (backend)**
- Se la chiave non esiste: ritorna `[Missing: {key}]`.

### Contenuti testuali “lunghi” (Intro/Storia)
- Intro: `src/data-internal/Introduzione.json` via `GET /api/introduzione?id=...&lingua=...`
- Storia: `src/data-internal/Storia.json` via `GET /api/storia?id=...&lingua=...`

Stato inventario (rapido):
- `Introduzione.json`: 3 ID, presenti IT+EN (nessun buco)
- `Storia.json`: 1 ID, presenti IT+EN (nessun buco)

---

## Risultati inventario (automazione)

Ho aggiunto tre script di audit (solo supporto a Sprint 59.1):
- `scripts/i18n_audit_frontend.cjs`
- `scripts/i18n_audit_backend.cjs`
- `scripts/i18n_audit_data_internal.cjs`

### Frontend — coverage chiavi
Da `scripts/i18n_audit_frontend.cjs`:
- `MessaggiFrontend.json`: 45 chiavi uniche, **0** chiavi con lingua mancante.
- Chiavi rilevate come usate nel web (JS/HTML): **19**.
- Chiavi usate ma **non definite** in `MessaggiFrontend.json`: **2**

**Chiavi mancanti (usate ma non definite)**
- `seo.title.default`
- `seo.description.default`

> Nota: in `web/js/seo-i18n.js` “default” scatta solo se l’URL non matcha intro/storia/main.

**Chiavi i18n effettivamente usate (19)**
- Main UI: `ui.lang.selected`, `ui.game`, `ui.game.terminal`, `ui.game.restart`, `ui.game.ended`, `ui.game.loaded`
- Errori UI: `ui.error.communication`, `ui.error.internal`, `ui.error.unknownCommand`, `ui.error.command`, `ui.error.invalidFile`
- Hint/ARIA: `ui.hint.clickImageToContinue`, `ui.aria.continue`
- SEO: `seo.title.intro|storia|main`, `seo.description.intro|storia|main`

**Chiavi definite ma non agganciate nel web (segnale di gap)**
Esempi importanti (chiavi presenti ma la UI corrente mostra testo hardcoded):
- `ui.button.submit` (in HTML c’è `Invia` hardcoded)
- `ui.input.placeholder` (in HTML c’è un placeholder lungo hardcoded)
- `ui.game.awaitingRestart` (il backend usa ancora stringa IT hardcoded su un endpoint legacy)
- varie `ui.error.*` e `ui.*` (potenziale disallineamento: chiavi pronte ma non consumate)

### Backend — coverage chiavi
Da `scripts/i18n_audit_backend.cjs`:
- `MessaggiSistema.json`: 58 chiavi uniche, **0** chiavi con lingua mancante.
- Chiavi usate via `getSystemMessage()` rilevate in `src/**`: **45**.
- Chiavi usate ma **non definite** in `MessaggiSistema.json`: **0**.

**Nota**
Ci sono messaggi lato backend non passati da `getSystemMessage()` (vedi sezione “hardcoded”).

### A) Dati di gioco — copertura record IT/EN (quando presente `IDLingua`)
Da `scripts/i18n_audit_data_internal.cjs`:

Nota metodologica: lo script usa una euristica (raggruppa per `Chiave` oppure per campi `ID*` escluso `IDLingua`). Per i dataset “core” di #59, la regola target è quella concordata sopra (**equivalenza = `ID` + `IDLingua`**).

- Dataset con `IDLingua` rilevati: **8**
- Copertura completa IT+EN:
  - `src/data-internal/Introduzione.json` (OK)
  - `src/data-internal/Storia.json` (OK)
  - `src/data-internal/MessaggiFrontend.json` (OK)
  - `src/data-internal/MessaggiSistema.json` (OK)
- Gap (mancanza totale EN per record):
  - `src/data-internal/Luoghi.json`: **59/59** record senza EN
  - `src/data-internal/Oggetti.json`: **38/38** record senza EN
  - `src/data-internal/Interazioni.json`: **19/19** record senza EN

Interpretazione:
- i messaggi (cataloghi) risultano IT/EN completi; i contenuti descrittivi “core” (luoghi/oggetti/interazioni) risultano IT-only.
- per `Interazioni.json` lo sprint dedicato deve includere anche una verifica di **access pattern**: l’accesso ai dati deve essere sempre filtrato per lingua corrente (se esistono accessi non filtrati, vanno corretti e tracciati nel report).

---

## Gap principali (hardcoded / non i18n)

### Frontend — HTML (testi hardcoded)
Queste pagine contengono molte label/testi fissi in italiano e non usano `data-i18n*`:

- `index.html`
  - "Reindirizzamento in corso…", "Se il reindirizzamento non parte…"
  - meta/title statici (SEO non usa `seo-i18n.js` qui)

- `web/odessa_main.html`
  - `h1` e testi `<noscript>`
  - `aria-label` (es. “Console di gioco”, “Luoghi Missione Odessa”)
  - label input “Comando”, placeholder lungo (con esempi), bottone “Invia”
  - “Lingua selezionata:” (poi sovrascritto in parte via JS)

- `web/odessa_intro.html`
  - testo `<noscript>`
  - `alt` immagini e title/description di default (poi parzialmente gestiti da `seo-i18n.js`)

- `web/odessa_storia.html`
  - `<noscript>` e varie label fisse (Autore/Genere/Piattaforma/Links/Documenti)
  - testi dei link (Ready64, English version, Gioca on line, titoli PDF)
  - `continueHint` iniziale in IT (poi aggiornato via JS)

### Frontend — JS (testi hardcoded)
- `web/js/odessa_main.js`
  - `setVersioneRunning`: “Versione: …” / “non disponibile” non i18n
  - fallback di vari messaggi quando `window.i18n` non è disponibile (IT-only)

- `web/js/odessa_intro.js`, `web/js/odessa_storia.js`
  - fallback IT/EN embedded (ok come safety-net, ma non centralizzato)

### Backend — API/engineRoutes (testi hardcoded)
- `src/api/routes.js`
  - errore “Lingua non valida (1=IT, 2=EN)” in IT-only

- `src/api/engineRoutes.js`
  - messaggi IT-only:
    - “Endpoint legacy disabilitato…”
    - “Gioco in attesa di riavvio…”
    - “Stato ripristinato”
  - `GET /stats`: rango calcolato come stringa IT (“Novizio/Esploratore/Investigatore/Maestro/Perfezionista”) invece di usare `MessaggiSistema`.

---

## Priorità suggerite (mappate ai prossimi sprint)

### P0 — contenuti e messaggi visibili all’utente
1. **Sprint 59.2–59.4 (data-internal):** colmare i gap EN per `Luoghi.json`, `Oggetti.json`, `Interazioni.json` (stesso `ID`, `IDLingua=2`).
2. **Sprint 59.4 (interazioni):** verificare e correggere eventuali accessi non filtrati per lingua corrente.
3. **Sprint 59.5 (messaggi + API):** rendere localizzabili i rank di `/api/engine/stats` e rimuovere/mappare messaggi user-facing hardcoded lato API.
4. **Sprint 59.5 (SEO):** aggiungere `seo.title.default` e `seo.description.default` o decidere esplicitamente di non supportarle.

### P1 — hardcoded UI (accessibilità / polish)
5. **Sprint 59.6:** `aria-label` e testi `<noscript>` (intro/main/storia).
6. **Sprint 59.6:** `index.html` (redirect text + eventuale SEO i18n).

### P2 — pulizia e consistenza
6. Rimuovere/razionalizzare fallback che mascherano mancanze (definire una policy coerente):
   - frontend: placeholder `[{key}]` vs fallback stringa
   - backend: `[Missing: key]` (ok per scovare regressioni)

---

## Materiale per Sprint 59.7 (test anti-regressione)

Idee di check automatici (da implementare nello sprint dedicato):
- Test che fallisce se in `MessaggiFrontend.json` o `MessaggiSistema.json` esiste una chiave senza IT o senza EN.
- Test che fallisce se il frontend rende `[{key}]` in pagine principali (intro/storia/main) per un set di chiavi critiche.
- Test/contract per SEO: chiavi `seo.title.*` e `seo.description.*` devono esistere per `intro|storia|main` (+ eventuale `default`).

---

## Conclusione Sprint 59.1
- Non risultano buchi IT/EN dentro `MessaggiFrontend.json` e `MessaggiSistema.json`.
- I gap principali sono **testi hardcoded** (HTML/JS/API) e **chiavi i18n non agganciate**.
- Uniche chiavi “usate ma non definite” rilevate: `seo.title.default` e `seo.description.default`.
