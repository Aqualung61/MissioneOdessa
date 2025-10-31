
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
