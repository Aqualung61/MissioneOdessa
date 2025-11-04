
# Missione Odessa App

Applicazione adventure testuale con backend Node.js/Express, frontend statico e API REST su SQLite.

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
   - [http://localhost:3001/web/odessa1.html](http://localhost:3001/web/odessa1.html)
   - [http://localhost:3001/index.html](http://localhost:3001/index.html)

4. Le API sono disponibili su:
   - [http://localhost:3001/api/luoghi](http://localhost:3001/api/luoghi)
   - [http://localhost:3001/api/luoghi/8](http://localhost:3001/api/luoghi/8)
   - [http://localhost:3001/api/version](http://localhost:3001/api/version) — restituisce la versione dell'applicazione
## Versionamento API e applicazione

- La versione dell'app è sincronizzata con il campo `version` in `package.json`.
- La rotta `/api/version` restituisce un oggetto JSON con la versione attuale, ad esempio:
   ```json
   { "version": "1.0.0" }
   ```
- Ogni avvio del server stampa la versione corrente in console.

## Struttura progetto

- `src/` — codice backend e logica applicativa
  - `src/data/` — accesso dati (es. `luoghiStore.js`)
  - `src/logic/` — logica di parsing e utility (es. `parser.js`)
  - `src/api/` — router API Express (es. `routes.js`, `linguaRoutes.js`)
  - `src/server.js` — entry point server Express (statico + API)
  - `src/tests/` — script di test, utilità e backup
- `web/` — file frontend statici (es. `odessa1.html`, `odessa1.js`)
- `backup/` — backup e archivi
- `docs/` — documentazione e note di modellazione
- `.env` — configurazione ambiente (es. percorso DB)

## Note
- Il server carica i dati dal DB SQLite e serve sia API che file statici dalla stessa porta.
- La logica di parsing e la presentazione sono modulari e facilmente estendibili.
- I file di test e script di utilità sono in `src/tests/`.
- I backup sono in `backup/`.

## Database e migrazioni

- DB: SQLite senza ORM (Prisma è stato rimosso).
- Percorso DB configurabile via variabile d'ambiente `ODESSA_DB_PATH` (default `./db/odessa.db`).
- Schema e cambi strutturali gestiti con file DDL in `ddl/` nominati in modo descrittivo e documentati in `docs/`.
- Ispezione dati: usare DBeaver o DB Browser for SQLite aprendo `db/odessa.db`.
- Migrazione a Postgres/MySQL: possibile in futuro con script ad hoc e adattamento dell'accesso ai dati.
 - Linee guida: vedi `docs/ddl-guidelines.md`.

## Release notes

- 2025-11-04 – v1.1.0 (freeze-20251104): vedi `docs/release-notes/2025-11-04_v1.1.0_freeze-20251104.md`.
- 2025-11-04 – freeze-20251031: vedi `docs/release-notes/2025-11-04_freeze-20251031.md`.

## Endpoint utili (test e servizio)

- POST `/api/run-tests?suite=smoke|full`
   - Esegue la suite E2E Playwright dal backend e restituisce un report JSON.
   - `suite=smoke` esegue solo i controlli minimi (es. API versione) per una verifica rapida.

- POST `/api/shutdown`
   - Spegne il server in modo “graceful” (exit code 0). Disponibile solo quando `NODE_ENV=test`. Utile nelle pipeline locali per evitare exit -1.

## Stato

- Branch freeze: `freeze-20251031` allineato e stabile.
- Smoke (suite=smoke) via API: ~9–10 secondi su ambiente locale.
