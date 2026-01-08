# Missione Odessa App

[![CI](https://github.com/Aqualung61/MissioneOdessa/actions/workflows/ci.yml/badge.svg)](https://github.com/Aqualung61/MissioneOdessa/actions/workflows/ci.yml)

**Versione 1.3.0 Beta** - Adventure testuale con backend Node.js/Express, frontend statico e API REST basata su dati JSON statici.

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
  - [http://localhost:3001/index.html](http://localhost:3001/index.html) (entrypoint con selezione lingua)
  - [http://localhost:3001/web/odessa_main.html](http://localhost:3001/web/odessa_main.html) (gioco diretto)

4. Le API sono disponibili su:
  - [http://localhost:3001/api/luoghi](http://localhost:3001/api/luoghi)
  - [http://localhost:3001/api/luogo-oggetti?idLuogo=8&idLingua=1](http://localhost:3001/api/luogo-oggetti?idLuogo=8&idLingua=1)
  - [http://localhost:3001/api/version](http://localhost:3001/api/version) — restituisce la versione dell'applicazione
## Versionamento API e applicazione

- La versione dell'app è sincronizzata con il campo `version` in `package.json`.
- La rotta `/api/version` restituisce un oggetto JSON con la versione attuale, ad esempio:
   ```json
  { "version": "1.3.0" }
   ```
- Ogni avvio del server stampa la versione corrente in console.

## Struttura progetto

- `src/` — codice backend e logica applicativa
  - `src/data-internal/` — dati JSON statici caricati in memoria
  - `src/logic/` — logica di parsing e utility (es. `parser.js`)
  - `src/api/` — router API Express (es. `routes.js`, `linguaRoutes.js`)
  - `src/server.js` — entry point server Express (statico + API)
- `web/` — file frontend statici (es. `odessa_main.html`, `odessa_intro.html`, `odessa1.js`)
- `backup/` — backup e archivi
- `docs/` — documentazione e note di modellazione
- `tests/` — suite Vitest
- `.env` — variabili opzionali (es. `PORT`, `BASE_PATH`; il percorso DB è legacy e non usato)

## Note
- Il server carica i dati da file JSON statici in `src/data-internal/` e serve sia API che file statici dalla stessa porta.
- La logica di parsing e la presentazione sono modulari e facilmente estendibili.
- I test sono in `tests/` (Vitest).
- I backup sono in `backup/`.

## Dati e struttura

I dati dell'applicazione sono memorizzati in file JSON statici in `src/data-internal/` per semplicità e velocità. Schema e struttura dati documentati in `docs/`.
- Linee guida: vedi `docs/raccomandazioni.md` e `docs/data-modeling.md`.

## Release notes

- Vedi `RELEASE_NOTES.md` per i punti salienti; le note legacy restano in `docs/release-notes/`.

## Endpoint utili (test e servizio)

- POST `/api/run-tests?suite=smoke|full`
   - Esegue la suite E2E Playwright dal backend e restituisce un report JSON.
   - `suite=smoke` esegue solo i controlli minimi (es. API versione) per una verifica rapida.

- POST `/api/shutdown`
   - Spegne il server in modo “graceful” (exit code 0). Disponibile solo quando `NODE_ENV=test`. Utile nelle pipeline locali per evitare exit -1.

## Migrazione da DB a JSON

A partire dalla versione 1.3.0, l'applicazione è stata migrata da SQLite a dati JSON statici per:
- **Semplicità**: Eliminazione della dipendenza da DB, facilitando deploy e test.
- **Velocità**: Caricamento immediato dei dati in memoria all'avvio.
- **Manutenibilità**: Dati versionati con Git, modifiche dirette ai file JSON.

I dati originali sono stati esportati da SQLite a JSON. Per modifiche, editare i file in `src/data-internal/` e testare con `npm test`.

## Stato

- **Versione attuale: 1.3.0 Beta** (8 gennaio 2026)
- **Test Coverage**: 211 test totali (194 passati, 17 skippati)
- **Qualità**: ESLint clean, TypeScript strict typing
- **i18n**: Full compliance IT/EN
- Test E2E: Suite completa via Playwright, accessibile da `index.html` > "Esegui test applicazione"
- Smoke test via API: ~9–10 secondi su ambiente locale

### Novità versione 1.3.0
- Sistema completo di test (unit, integration, E2E)
- Mystery scoring tests (VISIBILITA, SBLOCCA_DIREZIONE, TOGGLE_DIREZIONE)
- Intercettazione pattuglie sovietiche (danger zones)
- Sistema buio e game over unificato
- Victory effect con Ferenc scoring
- Dati JSON statici (migrazione da SQLite completata)
